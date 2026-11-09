// Utilidades de la portada: formato de números y fechas, códigos de clima y rosa de los vientos.
export const TZ = 'America/Mazatlan';

// Código WMO de Open-Meteo -> [texto, emoji]
const WMO = {
  0: ['Despejado', '☀️'], 1: ['Mayormente despejado', '🌤️'], 2: ['Parcialmente nublado', '⛅'], 3: ['Nublado', '☁️'],
  45: ['Niebla', '🌫️'], 48: ['Niebla con escarcha', '🌫️'], 51: ['Llovizna ligera', '🌦️'], 53: ['Llovizna', '🌦️'], 55: ['Llovizna densa', '🌦️'],
  56: ['Llovizna helada', '🌦️'], 57: ['Llovizna helada', '🌦️'], 61: ['Lluvia ligera', '🌧️'], 63: ['Lluvia', '🌧️'], 65: ['Lluvia fuerte', '🌧️'],
  66: ['Lluvia helada', '🌧️'], 67: ['Lluvia helada', '🌧️'], 71: ['Nieve ligera', '❄️'], 73: ['Nieve', '❄️'], 75: ['Nieve fuerte', '❄️'], 77: ['Granizo fino', '❄️'],
  80: ['Chubascos ligeros', '🌦️'], 81: ['Chubascos', '🌧️'], 82: ['Chubascos fuertes', '🌧️'], 85: ['Chubascos de nieve', '❄️'], 86: ['Chubascos de nieve', '❄️'],
  95: ['Tormenta eléctrica', '⛈️'], 96: ['Tormenta con granizo', '⛈️'], 99: ['Tormenta con granizo', '⛈️'],
};

// `day === 0` = es de noche: el cielo despejado se muestra con luna.
export function wmo(code, day) {
  const x = WMO[code] || ['—', '🌡️'];
  return day === 0 && (code === 0 || code === 1) ? [x[0], '🌙'] : x;
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const windDir = (deg) => DIRS[Math.round((deg % 360) / 45) % 8];

// Número con decimales fijos; '—' si no hay dato.
export const num = (n, decimals = 0) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toFixed(decimals));

// Día de la semana de una fecha ISO (AAAA-MM-DD).
export const weekday = (iso, long = false) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: long ? 'long' : 'short' }).replace('.', '');

// "hace 5 min", "hace 3 h", "hace 2 d"
export function agoText(ms, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ms) / 60000));
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

// Miniaturas de WordPress (-150x150, -300x200…): se pide la imagen original para que no se vea pixelada.
export const hiRes = (u) => (u ? String(u).replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))(\?.*)?$/i, '$1$2') : u);

// Solo enlaces http(s); cualquier otra cosa (javascript:, data:) se vuelve '#'.
export const safeUrl = (u, esc) => (/^https?:\/\//i.test(u) ? esc(u) : '#');
