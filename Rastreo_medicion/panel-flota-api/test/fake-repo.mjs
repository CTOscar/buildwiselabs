// test/fake-repo.mjs — repo en memoria para `npm run dev:memory`
export function createFakeRepo() {
  const users = new Map(), sessions = new Map(), oauth = new Map(),
        resets = new Map(), loginLogs = [], samples = new Map(),
        fuel = new Map(), photos = new Map();
  let seq = 1;
  const nid = () => String(seq++);
  const now = () => new Date().toISOString();
  const publicUser = (u) => { if (!u) return null; const { passwordHash, password_hash, resetToken, resetExpires, ...r } = u; return r; };

  const devSet = new Map();
  const fenSet = new Map();
  const repo = {
    mysql: null,
    async ping() { return true; },

    async createUser({ email, passwordHash = null, role = 'user', name = '', ...x }) {
      const u = { id: nid(), email, passwordHash, password_hash: passwordHash, role, name, createdAt: now(), lastLoginAt: null, ...x };
      users.set(u.id, u); return u;
    },
    async findUserByEmail(email) { for (const u of users.values()) if (u.email === email) return u; return null; },
    async findUserById(id) { return users.get(id) ?? null; },
    async countUsers() { return users.size; },
    async listUsers() { return [...users.values()]; },
    async updateUser(id, ch) { const u = users.get(id); if (!u) return null; const n = { ...u, ...ch }; users.set(id, n); return n; },
    async setPassword(id, h) { return repo.updateUser(id, { passwordHash: h, password_hash: h }); },
    async setRole(id, r) { return repo.updateUser(id, { role: r }); },
    async touchLogin(id) { return repo.updateUser(id, { lastLoginAt: now() }); },
    publicUser,

    deviceSettings: async () => [...devSet.values()],
    saveDeviceSettings: async ({ id, name, attributes }) => { devSet.set(id, { id, name, attributes: attributes || {} }); },
    fenceSettings: async () => [...fenSet.values()],
    saveFenceSettings: async ({ id, name, attributes }) => { fenSet.set(id, { id, name, attributes: attributes || {} }); },

    async createSession({ userId, token, tokenHash, ...x }) { const k = tokenHash ?? token; const s = { token: k, userId, createdAt: now(), ...x }; sessions.set(k, s); return s; },
    async findSessionUser(tk) { const s = sessions.get(tk); return s ? (users.get(s.userId) ?? null) : null; },
    async deleteSession(tk) { return sessions.delete(tk); },
    async deleteUserSessions(uid) { let n = 0; for (const [tk, s] of sessions) if (s.userId === uid) { sessions.delete(tk); n++; } return n; },

    async linkOAuth({ userId, provider, providerId, ...x }) { const k = `${provider}:${providerId}`; const r = { userId, provider, providerId, linkedAt: now(), ...x }; oauth.set(k, r); return r; },
    async findOAuth(p, pid) { return oauth.get(`${p}:${pid}`) ?? null; },
    async listOAuth(uid) { const o = []; for (const r of oauth.values()) if (r.userId === uid) o.push(r); return o; },

    async createReset({ userId, token, expiresAt = Date.now() + 15 * 60 * 1000, ...x }) {
      const u = users.get(userId);
      const r = { userId, email: u?.email ?? null, token, expiresAt, createdAt: Date.now(), ...x };
      resets.set(token, r); return r;
    },
    async consumeReset(tk) { const r = resets.get(tk); if (!r) return null; resets.delete(tk); if (r.expiresAt < Date.now()) return null; return users.get(r.userId) ?? null; },

    async logLogin({ userId = null, email = null, ip = null, userAgent = null, success = true }) {
      const r = { id: nid(), userId, email, ip, userAgent, success, at: now() }; loginLogs.push(r); return r;
    },
    async loginLog({ userId = null, limit = 100 } = {}) {
      let rows = loginLogs; if (userId) rows = rows.filter(r => r.userId === userId); return rows.slice(-limit);
    },

    async insertSamples(a1, a2) {
      let vid, batch;
      if (Array.isArray(a2)) { vid = a1; batch = a2; } else { batch = a1; vid = null; }
      let n = 0;
      for (const raw of batch) {
        const v = vid ?? raw.vehicleId; if (v == null) continue;
        const s = { id: nid(), at: raw.at ?? raw.ts ?? now(), ...raw };
        if (!samples.has(v)) samples.set(v, []);
        samples.get(v).push(s); n++;
      }
      return n;
    },
    async route(vehicleId, { from = null, to = null, limit = 5000 } = {}) {
      const arr = samples.get(vehicleId) ?? [];
      const f = from ? new Date(from).getTime() : -Infinity;
      const t = to   ? new Date(to).getTime()   : +Infinity;
      return arr.filter(s => { const x = new Date(s.at).getTime(); return x >= f && x <= t; }).slice(-limit);
    },

    async fuelEvents(vehicleId, { from = null, to = null, limit = 500 } = {}) {
      const arr = fuel.get(vehicleId) ?? [];
      const f = from ? new Date(from).getTime() : -Infinity;
      const t = to   ? new Date(to).getTime()   : +Infinity;
      return arr.filter(e => { const x = new Date(e.at).getTime(); return x >= f && x <= t; }).slice(-limit);
    },

    async savePhoto({ id = null, vehicleId = null, mime = 'image/jpeg', data, ...x }) {
      const pid = id ?? nid();
      const r = { id: pid, vehicleId, mime, data, size: data?.length ?? 0, createdAt: now(), ...x };
      photos.set(pid, r); return r;
    },
    async getPhoto(id) { return photos.get(id) ?? null; },
    async deletePhoto(id) { return photos.delete(id); },
  };
  return repo;
}

export default createFakeRepo;
