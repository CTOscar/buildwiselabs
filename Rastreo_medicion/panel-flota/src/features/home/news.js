// Noticias de la portada: misma presentación que "Actualidad" de buildwiselabs.net
// (portada con foto, lista lateral con miniaturas y cuadrícula).
import { escapeHtml as esc } from '../../lib/format.js';
import { agoText, hiRes, safeUrl } from './helpers.js';

export const NEWS_API = 'https://buildwiselabs.net/api/news';

const ICON = {
  agro: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c2-4 5-7 9-9"/>',
  economia: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  negocios: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  tecnologia: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  mercados: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
};

export const NEWS_CATS = [
  { id: 'agro', label: 'Agro Sinaloa', color: '#65a30d', q: 'agricultura Sinaloa' },
  { id: 'economia', label: 'Economía', color: '#34d399' },
  { id: 'negocios', label: 'Negocios', color: '#fbbf24' },
  { id: 'tecnologia', label: 'Tecnología', color: '#60a5fa' },
  { id: 'mercados', label: 'Mercados', color: '#2dd4bf' },
];

const icon = (id, size, color) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[id]}</svg>`;

function picture(n, c, ratio, cls) {
  const size = cls === 'lead' ? 56 : cls === 'thumb' ? 22 : 34;
  const ph = `<span class="nw-ph" style="background-image:linear-gradient(135deg,${c.color}33,${c.color}0d)">${icon(c.id, size, c.color)}</span>`;
  // Si la foto grande falla se prueba la miniatura (data-lo); si también falla, queda el recuadro de color.
  const img = n.image
    ? `<img src="${esc(n.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-lo="${esc(n.imageLo || '')}" data-nw-img>`
    : '';
  return `<div class="nw-img nwi-${cls}${n.image ? '' : ' nw-broken'}" style="aspect-ratio:${ratio}">${img}${ph}</div>`;
}

const meta = (n) => `<div class="nw-meta"><b>${esc(n.source)}</b>${n.publishedAt && !Number.isNaN(n.publishedAt) ? `<span>· ${agoText(n.publishedAt)}</span>` : ''}</div>`;
const link = (u) => safeUrl(u, esc);

// Respuesta de la API de buildwiselabs.net -> { items, sources, updatedAt }
export function parseApiNews(d) {
  if (!d?.items?.length) throw new Error('vacio');
  return {
    items: d.items.map((x) => ({
      title: x.title, url: x.url, source: x.source, image: hiRes(x.image), imageLo: x.image, summary: x.summary,
      publishedAt: x.publishedAt ? new Date(x.publishedAt).getTime() : NaN,
    })),
    sources: d.sources || [],
    updatedAt: d.updatedAt ? new Date(d.updatedAt).getTime() : Date.now(),
  };
}

// Respaldo de Google Noticias (vía rss2json), sin fotos.
export function parseGoogleNews(j) {
  if (j.status !== 'ok') throw new Error('rss');
  const sources = {};
  const items = (j.items || []).slice(0, 17).map((x) => {
    const parts = String(x.title || '').split(' - ');
    const source = parts.length > 1 ? parts.pop() : x.author || 'Google Noticias';
    sources[source] = 1;
    return { title: parts.join(' - '), url: x.link, source, image: null, summary: '', publishedAt: new Date(`${(x.pubDate || '').replace(' ', 'T')}Z`).getTime() };
  });
  return { items, sources: Object.keys(sources).slice(0, 6), updatedAt: Date.now() };
}

async function fromApi(base, id, fetchFn) {
  const res = await fetchFn(`${base}?cat=${encodeURIComponent(id)}&limit=18`);
  if (!res.ok) throw new Error(res.status);
  return parseApiNews(await res.json());
}

async function fromGoogle(cat, fetchFn) {
  const feed = `https://news.google.com/rss/search?q=${encodeURIComponent(`${cat.q} when:14d`)}&hl=es-419&gl=MX&ceid=MX:es-419`;
  const res = await fetchFn(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`);
  return parseGoogleNews(await res.json());
}

// "agro": API propia y, si aún no tiene la categoría, Google Noticias. Las demás: solo la API.
export async function fetchNews(cat, { fetchFn = fetch, api = NEWS_API } = {}) {
  if (cat.id !== 'agro') return fromApi(api, cat.id, fetchFn);
  try {
    return await fromApi(api, 'agro', fetchFn);
  } catch {
    return fromGoogle(cat, fetchFn);
  }
}

// mode: 'loading' | 'error' | undefined
export function newsHtml(cat, data, mode) {
  const tabs = `<div class="nw-tabs" role="tablist">${NEWS_CATS.map(
    (t) => `<button type="button" role="tab" data-nw-cat="${t.id}" aria-selected="${t.id === cat.id}" style="${t.id === cat.id ? `border-bottom-color:${t.color}` : ''}">${t.label}</button>`,
  ).join('')}</div>`;
  const head = `<div class="nw-eyebrow"><i></i><span>Actualidad</span><em><u></u>En vivo</em></div><h2 class="nw-title">Lo que está pasando en el campo y la economía</h2>${tabs}`;
  const items = data?.items || [];
  let body;
  if (mode === 'error' && !items.length) {
    body = '<div class="nw-error"><p>No pudimos cargar las noticias ahora mismo.</p><button type="button" data-hm-refresh>Reintentar</button></div>';
  } else if (!items.length && mode === 'loading') {
    body = '<div class="nw-skel"><div class="nw-skel-lead"></div><div class="nw-skel-side"><i></i><i></i><i></i><i></i></div></div>';
  } else if (!items.length) {
    body = '<div class="nw-error"><p>Sin noticias recientes para este tema.</p></div>';
  } else {
    const [lead, ...rest] = items;
    const side = rest.slice(0, 4);
    const grid = items.slice(5, 17);
    body =
      `<div class="nw-top"><a class="nw-lead" href="${link(lead.url)}" target="_blank" rel="noopener noreferrer">${picture(lead, cat, '16/9', 'lead')}` +
      `<div class="nw-lead-b">${meta(lead)}<h3>${esc(lead.title)}</h3>${lead.summary ? `<p>${esc(lead.summary)}</p>` : ''}</div></a>` +
      (side.length
        ? `<div class="nw-side"><h4>Más noticias</h4>${side
            .map((n) => `<a class="nw-sitem" href="${link(n.url)}" target="_blank" rel="noopener noreferrer"><div>${meta(n)}<h5>${esc(n.title)}</h5></div>${picture(n, cat, '4/3', 'thumb')}</a>`)
            .join('')}</div>`
        : '') +
      '</div>' +
      (grid.length
        ? `<div class="nw-grid">${grid
            .map((n) => `<div class="nw-cell"><a class="nw-card" href="${link(n.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(n.title)}">${picture(n, cat, '16/9', 'card')}<div class="nw-card-b">${meta(n)}<h5>${esc(n.title)}</h5></div></a></div>`)
            .join('')}</div>`
        : '');
  }
  const foot = data
    ? `<p class="nw-foot">${data.sources?.length ? `Fuentes: ${esc(data.sources.join(', '))}` : 'Fuentes: medios y agencias'} · actualizado ${agoText(data.updatedAt)}. Cada nota se abre en el sitio del medio.</p>`
    : '';
  return head + body + foot;
}

// Si una foto no carga: primero la miniatura y luego el recuadro de color (se llama desde el evento 'error').
export function onNewsImageError(img) {
  if (img.dataset.lo && img.src !== img.dataset.lo) {
    img.src = img.dataset.lo;
    img.dataset.lo = '';
  } else img.parentNode.classList.add('nw-broken');
}
