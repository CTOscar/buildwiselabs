// Resumen de combustible y velocidad por tractor y día, calculado en el servidor.
// Misma regla que usa el panel al analizar un recorrido (así las cifras coinciden):
//   - Descarga: el nivel baja >= minL litros con el tractor detenido (< 1 km/h).
//   - Carga: el nivel sube >= minL litros.
//   - Consumo: cualquier otra baja de nivel.
// El día se corta a medianoche de Sinaloa (UTC-7, sin horario de verano).
const HOUR = 36e5;
const KMH = 1.852; // nudos -> km/h
const MAX_GAP_MS = 10 * 60000; // un tramo sin reportes largo no cuenta como tiempo en movimiento

export const TZ_OFFSET_HOURS = -7;

export const localDay = (ms, offsetHours = TZ_OFFSET_HOURS) => new Date(ms + offsetHours * HOUR).toISOString().slice(0, 10);

// rows: [{ deviceId, fixTime (Date|string|ms), speed (nudos), fuel (L|null) }] ordenadas por tractor y hora.
export function summarizeSamples(rows, { minL = 20, offsetHours = TZ_OFFSET_HOURS } = {}) {
  const out = new Map(); // "id|día" -> acumulador
  let prev = null;
  const slot = (deviceId, day) => {
    const k = `${deviceId}|${day}`;
    if (!out.has(k)) out.set(k, { deviceId, day, consumed: 0, drainL: 0, refuelL: 0, speedSum: 0, speedN: 0, maxKmh: 0, movingMs: 0, samples: 0 });
    return out.get(k);
  };

  for (const r of rows) {
    const t = new Date(r.fixTime).getTime();
    if (!Number.isFinite(t)) continue;
    const kmh = Math.round((Number(r.speed) || 0) * KMH);
    const fuel = Number.isFinite(Number(r.fuel)) && r.fuel !== null ? Number(r.fuel) : null;
    const a = slot(r.deviceId, localDay(t, offsetHours));
    a.samples++;
    if (kmh > 0) {
      a.speedSum += kmh;
      a.speedN++;
    }
    if (kmh > a.maxKmh) a.maxKmh = kmh;

    // `prev` solo vale si es del mismo tractor
    if (prev && prev.deviceId === r.deviceId) {
      if (kmh > 0) a.movingMs += Math.min(t - prev.t, MAX_GAP_MS);
      if (prev.fuel !== null && fuel !== null) {
        const drop = prev.fuel - fuel;
        if (drop >= minL && kmh < 1) a.drainL += Math.round(drop);
        else if (-drop >= minL) a.refuelL += Math.round(-drop);
        else if (drop > 0) a.consumed += drop;
      }
    }
    prev = { deviceId: r.deviceId, t, fuel };
  }

  return [...out.values()]
    .map((a) => ({
      deviceId: a.deviceId,
      day: a.day,
      consumed: Math.round(a.consumed),
      drainL: a.drainL,
      refuelL: a.refuelL,
      avgKmh: a.speedN ? Math.round(a.speedSum / a.speedN) : 0,
      maxKmh: a.maxKmh,
      movingH: Math.round((a.movingMs / HOUR) * 10) / 10,
      samples: a.samples,
    }))
    .sort((x, y) => x.deviceId - y.deviceId || (x.day < y.day ? -1 : 1));
}
