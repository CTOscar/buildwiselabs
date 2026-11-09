// Portada "Inicio": réplica del frontend de debian.org (cabecera, navbar, migas, portada, filas de 2 columnas,
// carrusel, noticias y pie) con los datos del panel: flota en vivo, clima (Open-Meteo) y noticias.
// Los estilos están en styles/home.css, acotados a #home-view.
import { state, subscribe, setView, select, notify, mapApi, statusOf } from '../fleet/store.js';
import { escapeHtml as esc } from '../../lib/format.js';
import { num } from './helpers.js';
import { DEFAULT_LL, errorBox, fetchWeather, fleetCentroid, weatherHtml } from './weather.js';
import { NEWS_CATS, fetchNews, newsHtml, onNewsImageError } from './news.js';
import { fleetHtml } from './fleet.js';
import { earthControlsHtml, earthFrameHtml, earthUrl, initialEarth } from './earth.js';

// Páginas de la portada -> vistas del panel. 'estado' (Status) aún no está portada.
export const PAGE_VIEW = { mapa: 'fleet', lotes: 'lotes', alertas: 'alerts', reportes: 'reports', costeo: 'stats', combustible: 'stats', simulador: 'sim', vista3d: '3d' };
const GO_VIEW = { fleet: 'fleet', sim: 'sim', stats: 'stats' };
const WEATHER_TTL = 10 * 60000;

const ICON = {
  map: '<path d="M12 2a7.5 7.5 0 0 0-7.5 7.5C4.5 15 12 22 12 22s7.5-7 7.5-12.5A7.5 7.5 0 0 0 12 2zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z"/>',
  lotes: '<path d="M12 2 3 7.2v9.6L12 22l9-5.2V7.2zm0 3.1 5.6 3.2v6.4L12 17.9l-5.6-3.2V8.3z"/>',
  bell: '<path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/>',
  list: '<path d="M3 5h3v3H3zm5 .5h13v2H8zM3 10.5h3v3H3zm5 .5h13v2H8zM3 16h3v3H3zm5 .5h13v2H8z"/>',
  cloud: '<path d="M7 19a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 9.5 4.75 4.75 0 0 1 18 19z"/>',
  rain: '<path d="M7 14a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 4.5 4.75 4.75 0 0 1 18 14zM8.5 16l-1.5 4h2l1.5-4zm4.5 0-1.5 4h2l1.5-4zm4.5 0L16 20h2l1.5-4z"/>',
  fuel: '<path d="M4 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17H4zm2-11h6V5H6zm9-1h2l2 2v6a1 1 0 0 0 2 0V9l-3-3-1.4 1.4L17 8.8V9h-2z"/>',
  sim: '<path d="M22.7 19 13.6 9.9a5.5 5.5 0 0 0-1.3-5.9 5.4 5.4 0 0 0-5.4-1.3l3.2 3.2-2.2 2.2L4.7 4.9a5.4 5.4 0 0 0 1.3 5.4 5.5 5.5 0 0 0 5.9 1.3l9.1 9.1a1 1 0 0 0 1.4 0l.3-.3a1 1 0 0 0 0-1.4z"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="#000" aria-hidden="true">${ICON[k]}</svg>`;

const row = (ic, attr, title, text) =>
  `<div class="row"><div class="community column"><a href="#" ${attr} aria-hidden="true">${svg(ic)}</a></div>` +
  `<div class="styled-href-blue column-4-parts"><h2><a href="#" ${attr}>${title}</a></h2><p>${text}</p></div></div>`;
const slide = (title, id) => `<article><div class="info top-left"><h3>${title}</h3></div><div class="slide" id="${id}"><p class="dh-empty">Cargando…</p></div></article>`;

const NAV = [
  ['mapa', 'Mapa de la flota', 'Mapa'],
  ['lotes', 'Lotes y geocercas', 'Lotes'],
  ['alertas', 'Alertas de la flota', 'Alertas'],
  ['reportes', 'Reportes de horas y recorridos', 'Reportes'],
  ['combustible', 'Combustible y velocidad', 'Combustible'],
  ['simulador', 'Simulador de instalación', 'Simulador'],
  ['vista3d', 'Tractor en 3D', 'Vista 3D'],
];

function startHtml(earth) {
  let radios = '';
  let dots = '';
  let arrows = '';
  for (let i = 1; i <= 5; i++) {
    radios += `<input ${i === 1 ? 'checked="" ' : ''}type="radio" name="dh-slider" id="dh-s${i}">`;
    dots += `<label for="dh-s${i}"></label>`;
    arrows += `<label for="dh-s${i}"></label>`;
  }
  return (
    '<div id="dh-splash" class="dh-hero"><div class="hero-bg"></div><div class="hero-shade"></div><div class="hero-stage"><div class="hero-card"><img src="/brand/las-cabras-logo-hd.webp" alt="Las Cabras Sinaloa · panelpack" draggable="false"><span class="hero-glare"></span></div></div></div>' +
    '<div class="row" id="dh-kpis"></div>' +
    '<div class="row">' +
    '<div class="column column-left"><div style="text-align:center"><h1>La flota</h1><h2>¡Tus tractores, en tiempo real!</h2>' +
    `<div class="wrapper">${radios}<div class="slider-wrapper"><div class="inner">` +
    slide('Equipo activo', 'dh-equip') + slide('Pronóstico · próximos 7 días', 'dh-fc') + slide('Precipitación', 'dh-rain') + slide('Alertas altas', 'dh-alerts') + slide('Resumen del trabajo diario', 'dh-work') +
    `</div></div><div class="slider-prev-next-control">${arrows}</div><div class="slider-dot-control">${dots}</div></div></div>` +
    row('map', 'data-hm-go="fleet"', 'Mapa de la flota', 'Ubicación y estado en tiempo real') +
    row('lotes', 'data-hm-page="lotes"', 'Lotes', 'Geocercas y tractores por lote') +
    row('bell', 'data-hm-page="alertas"', 'Alertas', 'Combustible, energía y eventos') +
    row('list', 'data-hm-page="reportes"', 'Más...', 'Reportes de horas, recorridos y combustible') +
    '</div>' +
    '<div class="column column-right"><div style="text-align:center"><h1>El campo</h1><h2>¡Clima y condiciones de trabajo, en vivo!</h2>' +
    '<div class="os-img-container"><div class="os-img" id="dh-now"><p class="dh-empty">Cargando…</p></div>' +
    '<a href="#" data-hm-go="fleet" class="os-dl-btn">Ver mapa</a><a href="#" data-hm-page="reportes" class="os-other-download">Otros reportes</a></div>' +
    `<h3>Océano, clima y corrientes</h3><div id="dh-earthctl">${earthControlsHtml(earth)}</div>` +
    '<div class="dh-earth" id="dh-earth"><img src="/brand/earth-poster.jpg" alt="Corrientes y alerta de blanqueamiento en el Pacífico mexicano" loading="lazy"><button type="button" class="dh-earth-btn" data-hm-earth>&#9654; Activar mapa interactivo</button></div>' +
    `<p class="dh-note">Visualización de viento, clima y océano · <a id="dh-earthlink" href="${earthUrl(earth)}" target="_blank" rel="noopener">earth.nullschool.net</a></p></div>` +
    row('cloud', 'data-hm-slide="2"', 'Pronóstico', 'Próximos 7 días y probabilidad de lluvia') +
    row('rain', 'data-hm-slide="3"', 'Precipitación', 'Registrada y esperada por día') +
    row('fuel', 'data-hm-page="costeo"', 'Combustible', 'Consumo, cargas y descargas por tractor') +
    row('sim', 'data-hm-go="sim"', 'Más...', 'Simulador de instalación del rastreador') +
    '</div></div><hr>' +
    '<div class="nw-wrap"><div id="dh-news" class="nw"><p class="dh-empty">Cargando noticias…</p></div></div>' +
    '<div class="row">' +
    '<div class="column styled-href-blue column-left"><div style="text-align:center"><h1>Alertas recientes</h1><h2>Eventos altos de tus tractores</h2></div><div id="dh-alerts2"></div></div>' +
    '<div class="column styled-href-blue column-right"><div style="text-align:center"><h1>Tus lotes</h1><h2>Tractores dentro de cada lote</h2></div><div id="dh-lotes"></div></div>' +
    '</div><div class="clr"></div>'
  );
}

function frameHtml(earth) {
  return (
    '<div id="dh-header"><div id="dh-upperheader">' +
    '<div id="dh-searchbox"><form id="dh-search" name="p"><p><input name="P" value="" size="14" aria-label="Buscar tractor, IMEI o lote"> <input type="submit" value="Búsqueda"></p></form></div></div>' +
    `<div id="dh-navbar"><p class="hidecss"><a href="#dh-content">Omitir navegación rápida</a></p><ul>${NAV.map(([page, title, label]) => `<li><a href="#" data-hm-page="${page}" title="${title}">${label}</a></li>`).join('')}</ul></div>` +
    '<p id="dh-breadcrumbs"><span id="dh-crumb">Inicio</span><span id="hm-clock">En vivo</span></p></div>' +
    `<section id="dh-content">${startHtml(earth)}</section>` +
    '<footer id="dh-footer"><hr class="hidecss"><hr>' +
    '<div id="dh-fineprint"><p>Si desea comunicarse con nosotros, visite <a href="https://buildwiselabs.net" target="_blank" rel="noopener">buildwiselabs.net</a>. ' +
    'Clima: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a> · Noticias: buildwiselabs.net y Google Noticias.</p>' +
    '<p>Datos actualizados: <span id="dh-upd">—</span><br>Copyright © 2026 Agrícola Las Cabras · Hecho por <a href="https://buildwiselabs.net" target="_blank" rel="noopener">BuildWise Labs</a></p></div></footer>'
  );
}

export function initHome() {
  const view = document.getElementById('home-view');
  if (!view) return;
  view.innerHTML = frameHtml(initialEarth());

  const earth = initialEarth();
  const $ = (sel) => view.querySelector(sel);
  const kpi = {};
  const weather = { data: null, at: 0, error: false };
  const news = {}; // categoría -> datos
  let topic = 'agro';
  let wasVisible = false;
  const painted = {}; // id -> último HTML, para no repintar lo que no cambió

  const put = (id, html) => {
    if (painted[id] === html) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = painted[id] = html;
  };

  function renderKpis() {
    const k = kpi;
    const tile = (go, cls, v, l) => {
      const page = { alerts: 'alertas', reports: 'reportes' }[go];
      return `<a href="#" class="column dh-kpi ${cls}" ${page ? `data-hm-page="${page}"` : `data-hm-go="${go}"`}><h1>${v}</h1><h2>${l}</h2></a>`;
    };
    const dash = (v, f = (x) => x) => (v == null ? '—' : f(v));
    put(
      'dh-kpis',
      tile('fleet', 'ok', dash(k.running), 'En marcha') + tile('fleet', '', dash(k.idle), 'Apagados') + tile('alerts', 'bad', dash(k.nosignal), 'Sin señal') +
        tile('reports', '', dash(k.hours, (v) => `${num(v, 1)} h`), 'Horas motor hoy') + tile('fleet', '', dash(k.temp, (v) => `${num(v)} °C`), 'Temperatura') +
        tile('fleet', '', dash(k.rain, (v) => `${num(v, 1)} mm`), 'Lluvia hoy'),
    );
  }

  function renderFleet() {
    const out = fleetHtml(state, statusOf);
    Object.assign(kpi, out.kpi);
    put('dh-equip', out.equip);
    put('dh-alerts', out.alerts);
    put('dh-alerts2', out.alerts2);
    put('dh-work', out.work);
    put('dh-lotes', out.lotes);
    renderKpis();
  }

  function renderWeather() {
    if (!weather.data) {
      if (weather.error) {
        put('dh-now', errorBox('el clima'));
        put('dh-fc', errorBox('el pronóstico'));
        put('dh-rain', errorBox('la precipitación'));
      }
      return;
    }
    const w = weatherHtml(weather.data);
    kpi.temp = w.temp;
    kpi.rain = w.rainToday;
    put('dh-now', w.now);
    put('dh-fc', w.forecast);
    put('dh-rain', w.rain);
    renderKpis();
    const upd = $('#dh-upd');
    if (upd) upd.textContent = new Date(weather.at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }

  async function loadWeather(force) {
    if (!force && weather.data && Date.now() - weather.at < WEATHER_TTL) return renderWeather();
    try {
      weather.data = await fetchWeather(fleetCentroid(state.positions.values()) || DEFAULT_LL);
      weather.at = Date.now();
      weather.error = false;
    } catch {
      weather.error = true;
    }
    renderWeather();
  }

  const topicOf = (id) => NEWS_CATS.find((c) => c.id === id) || NEWS_CATS[0];
  function renderNews(cat, data, mode) {
    put('dh-news', newsHtml(cat, data, mode));
  }
  async function loadNews(force) {
    const cat = topicOf(topic);
    const cached = news[cat.id];
    if (!force && cached && Date.now() - cached.at < WEATHER_TTL) return renderNews(cat, cached);
    if (!cached) renderNews(cat, null, 'loading');
    try {
      const data = await fetchNews(cat);
      news[cat.id] = { ...data, at: Date.now() };
      if (topic === cat.id) renderNews(cat, news[cat.id]);
    } catch {
      if (topic === cat.id) renderNews(cat, news[cat.id] || null, 'error');
    }
  }

  function clock() {
    const el = $('#hm-clock');
    if (el) el.textContent = `En vivo · ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })} · El Rosario, Sinaloa`;
  }

  function earthRender() {
    put('dh-earthctl', earthControlsHtml(earth));
    const a = document.getElementById('dh-earthlink');
    if (a) a.href = earthUrl(earth);
    const box = document.getElementById('dh-earth');
    // Earth no reacciona a cambios de hash dentro del iframe: se recarga con el nuevo estado.
    if (box?.querySelector('iframe')) box.innerHTML = earthFrameHtml(earth);
  }

  const goView = (v) => v && setView(v);

  view.addEventListener('click', (e) => {
    const t = e.target;
    const earthBtn = t.closest('[data-earth-l],[data-earth-v],[data-earth-p]');
    if (earthBtn) {
      e.preventDefault();
      const d = earthBtn.dataset;
      if (d.earthL) earth.layer = d.earthL;
      if (d.earthV) earth.view = d.earthV;
      if (d.earthP) earth.proj = d.earthP;
      painted['dh-earthctl'] = null;
      earthRender();
      const box = document.getElementById('dh-earth');
      if (box && !box.querySelector('iframe')) box.innerHTML = earthFrameHtml(earth);
      return;
    }
    const act = t.closest('[data-hm-earth]');
    if (act) {
      e.preventDefault();
      act.closest('.dh-earth').innerHTML = earthFrameHtml(earth);
      return;
    }
    const wx = t.closest('[data-hm-wx]');
    if (wx) {
      e.preventDefault();
      document.getElementById(wx.dataset.hmWx)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const page = t.closest('[data-hm-page]');
    if (page) {
      e.preventDefault();
      return goView(PAGE_VIEW[page.dataset.hmPage]);
    }
    const go = t.closest('[data-hm-go]');
    if (go) {
      e.preventDefault();
      return goView(GO_VIEW[go.dataset.hmGo]);
    }
    const lote = t.closest('[data-hm-lote]');
    if (lote) {
      setView('fleet');
      setTimeout(() => mapApi.fitFence(Number(lote.dataset.hmLote)), 80);
      return;
    }
    const ev = t.closest('[data-hm-event]');
    if (ev) {
      e.preventDefault();
      return select(Number(ev.dataset.hmEvent));
    }
    const slideBtn = t.closest('[data-hm-slide]');
    if (slideBtn) {
      e.preventDefault();
      const r = $(`#dh-s${slideBtn.dataset.hmSlide}`);
      if (r) {
        r.checked = true;
        $('.wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    const cat = t.closest('[data-nw-cat]');
    if (cat) {
      e.preventDefault();
      topic = cat.dataset.nwCat;
      return loadNews();
    }
    if (t.closest('[data-hm-refresh]')) {
      loadWeather(true);
      loadNews(true);
    }
  });
  // Los errores de carga de imagen no burbujean: se atrapan en la fase de captura.
  view.addEventListener('error', (e) => e.target.matches?.('img[data-nw-img]') && onNewsImageError(e.target), true);
  view.addEventListener('submit', (e) => {
    if (e.target.id !== 'dh-search') return;
    e.preventDefault();
    state.query = e.target.P.value.trim().toLowerCase();
    setView('fleet');
    notify();
  });
  view.addEventListener('scroll', () => {
    const h = $('#dh-splash.dh-hero');
    if (h) h.style.setProperty('--sy', Math.min(1.2, view.scrollTop / 500).toFixed(3));
  });

  setInterval(() => {
    if (view.hidden) return;
    clock();
    if (Date.now() - weather.at > WEATHER_TTL) loadWeather(true);
  }, 15000);

  subscribe(() => {
    const show = state.view === 'home';
    view.hidden = !show;
    if (!show) {
      wasVisible = false;
      return;
    }
    renderFleet();
    if (!wasVisible) {
      wasVisible = true;
      view.scrollTop = 0;
      clock();
      loadWeather(false);
      loadNews(false);
    }
  });
}
