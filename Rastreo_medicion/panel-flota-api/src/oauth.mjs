// Acceso con cuenta de Google o de Apple (flujo "código de autorización").
// La API intercambia el código directamente con el proveedor por HTTPS, de modo que el id_token llega
// de la fuente y no hace falta verificar su firma; sí se comprueban emisor, destinatario, caducidad y correo.
import crypto from 'node:crypto';
import { newToken, isEmail } from './security.mjs';

const COOKIE = 'pf_oauth';

// Solo se activan los proveedores con credenciales completas en las variables de entorno.
export function enabledProviders(config) {
  const o = config.oauth || {};
  const out = {};
  const g = o.google;
  if (g?.clientId && g?.clientSecret) {
    out.google = {
      label: 'Google',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
      issuers: ['https://accounts.google.com', 'accounts.google.com'],
      clientId: g.clientId,
      secret: () => g.clientSecret,
      extra: { prompt: 'select_account' },
    };
  }
  const a = o.apple;
  if (a?.clientId && a?.teamId && a?.keyId && a?.privateKey) {
    out.apple = {
      label: 'Apple',
      authUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      scope: 'name email',
      issuers: ['https://appleid.apple.com'],
      clientId: a.clientId,
      // Apple pide como "secreto" un JWT firmado con la clave .p8 (ES256), de vida corta.
      secret: () => {
        const b64 = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
        const now = Math.floor(Date.now() / 1000);
        const data = `${b64({ alg: 'ES256', kid: a.keyId })}.${b64({ iss: a.teamId, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: a.clientId })}`;
        const sig = crypto.sign('sha256', Buffer.from(data), { key: a.privateKey.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363' });
        return `${data}.${sig.toString('base64url')}`;
      },
      extra: { response_mode: 'form_post' },
      crossSite: true, // Apple vuelve con un POST desde otro sitio: la cookie de estado necesita SameSite=None
    };
  }
  return out;
}

const readCookie = (req, name) => {
  const m = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
};

function decodeIdToken(idToken) {
  try {
    return JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function registerOAuth(r, { repo, config, express, startSession, logLogin, clientIp, ua, cleanName }) {
  const providers = enabledProviders(config);
  const panelUrl = () => config.panelUrl || config.allowedOrigins?.[0] || '/';
  const apiUrl = (req) => (config.publicApiUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const redirectUri = (req, name) => `${apiUrl(req)}/api/panel/auth/${name}/callback`;
  const fail = (res, code) => res.redirect(`${panelUrl()}/?auth_error=${code}`);

  // El panel consulta cuáles botones están activos.
  r.get('/auth/providers', (_req, res) => res.json({ google: !!providers.google, apple: !!providers.apple }));

  r.get('/auth/:provider', (req, res) => {
    const p = providers[req.params.provider];
    if (!p) return res.status(404).json({ error: 'Acceso no configurado' });
    const state = newToken();
    const cookie = [`${COOKIE}=${encodeURIComponent(`${req.params.provider}.${state}`)}`, 'Path=/', 'HttpOnly', 'Max-Age=600'];
    cookie.push(p.crossSite ? 'SameSite=None; Secure' : 'SameSite=Lax');
    if (!p.crossSite && config.production) cookie.push('Secure');
    res.setHeader('Set-Cookie', cookie.join('; '));
    const q = new URLSearchParams({ client_id: p.clientId, redirect_uri: redirectUri(req, req.params.provider), response_type: 'code', scope: p.scope, state, ...p.extra });
    res.redirect(`${p.authUrl}?${q}`);
  });

  async function callback(req, res) {
    const name = req.params.provider;
    const p = providers[name];
    if (!p) return res.status(404).json({ error: 'Acceso no configurado' });
    const params = req.method === 'POST' ? req.body || {} : req.query;
    const saved = readCookie(req, COOKIE);
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
    if (params.error) return fail(res, 'cancelado');
    if (!saved || saved !== `${name}.${params.state}` || typeof params.code !== 'string') return fail(res, 'estado');

    let claims;
    try {
      const resp = await fetch(p.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code: params.code, client_id: p.clientId, client_secret: p.secret(), redirect_uri: redirectUri(req, name) }),
      });
      const data = await resp.json();
      claims = resp.ok ? decodeIdToken(data.id_token) : null;
    } catch {
      return fail(res, 'proveedor');
    }
    const email = String(claims?.email || '').toLowerCase();
    const verified = claims?.email_verified === true || claims?.email_verified === 'true';
    const uid = typeof claims?.sub === 'string' ? claims.sub.slice(0, 190) : '';
    const valid = claims && uid && p.issuers.includes(claims.iss) && claims.aud === p.clientId && claims.exp * 1000 > Date.now() && isEmail(email) && verified;
    if (!valid) return fail(res, 'cuenta');

    // 1) ya entró antes con este proveedor (se reconoce por su id estable, aunque cambie de correo)
    // 2) existe una cuenta del panel con ese correo verificado: se liga a ella
    // 3) no existe: se crea
    const known = await repo.findOAuth(name, uid);
    let user = known ? await repo.findUserById(known.user_id) : null;
    if (!user) user = await repo.findUserByEmail(email);
    if (!user) {
      // Apple manda el nombre solo la primera vez, en el campo "user" del formulario.
      let apple = {};
      try {
        apple = params.user ? JSON.parse(params.user) : {};
      } catch {}
      const full = claims.name || [apple.name?.firstName, apple.name?.lastName].filter(Boolean).join(' ') || email.split('@')[0];
      const role = (await repo.countUsers()) === 0 ? 'admin' : 'user';
      // Sin contraseña: este hash no es de scrypt y nunca coincide, así que solo entra por el proveedor.
      const id = await repo.createUser({ name: cleanName(full), email, phone: '', role, attributes: {}, passwordHash: `oauth$${name}` });
      user = await repo.findUserById(id);
    }
    await repo.linkOAuth({ userId: user.id, provider: name, uid, email });
    await logLogin({ userId: user.id, email, ok: true, ip: clientIp(req), userAgent: ua(req) });
    await startSession(req, res, user, true);
    res.redirect(`${panelUrl()}/`);
  }
  r.get('/auth/:provider/callback', (req, res, next) => callback(req, res).catch(next));
  r.post('/auth/:provider/callback', express.urlencoded({ extended: false }), (req, res, next) => callback(req, res).catch(next));
}
