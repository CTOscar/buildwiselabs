// Vista "Simulador": la primera simulación (cableado del rastreador en el tractor)
// integrada al panel. Se abre desde el riel y ocupa el área del mapa.
import { state, subscribe, setView } from '../fleet/store.js';
import { icon } from '../../components/icons.js';
import { DIAGRAM } from './diagram.js';

const nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtT = (m) => {
  m = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
};

const CONNECTIONS = [
  ['power', 'Alimentación', 'Borne + de batería (directo, no por la llave)', 'VCC (+)', 'F1 · 1–2 A', 'Mantiene el equipo encendido 24 h para detectar robos con el tractor apagado.', 'A y B'],
  ['gnd', 'Tierra', 'Chasis, en punto limpio sin pintura', 'GND (−)', '—', 'Referencia eléctrica. Una mala tierra da lecturas de voltaje falsas.', 'A y B'],
  ['sig', 'Motor en marcha', 'Borne D+ del alternador (o presión de aceite)', 'DIN1 (ignición)', 'F2 · 0.5–1 A', 'Solo da señal con el motor girando: no cuenta horas con la llave abierta.', 'A y B'],
  ['can', 'CAN H / CAN L', 'Conector J1939 o lector CAN sin contacto', 'CAN H / CAN L', '—', 'Lee horas, RPM, consumo y nivel de tanque de la computadora del motor.', 'Solo B'],
  ['ble', 'Sonda BLE', 'Sonda capacitiva en el tanque', 'Bluetooth interno', '—', 'Envía el nivel sin cable. Tiene batería propia de varios años.', 'A (alto consumo)'],
  ['cell', 'Datos', 'Chip M2M dentro del equipo', 'Antena LTE interna', '—', 'Cada 60 s en movimiento y 30 min detenido. Sin señal, guarda y reenvía.', 'A y B'],
];

export function initSimulator() {
  const host = document.getElementById('sim-view');
  const seg = (id, items) =>
    `<div class="flex rounded-full bg-raise p-0.5" role="group" id="${id}">${items
      .map(([v, l]) => `<button type="button" data-v="${v}" class="rounded-full px-3 py-1 text-xs font-medium transition">${l}</button>`)
      .join('')}</div>`;

  host.innerHTML = `
    <div class="sim flex h-full flex-col bg-ink">
      <header class="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-3 lg:px-6">
        <button type="button" data-act="sim-close" class="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-raise hover:text-fg" aria-label="Volver al mapa">${icon('arrowLeft')}</button>
        <div class="min-w-0">
          <div class="eyebrow">Simulación · TRC-0012</div>
          <h2 class="font-display text-2xl font-bold leading-none tracking-tight">Instalación del rastreador</h2>
        </div>
        <div class="ml-auto flex flex-wrap items-center gap-2">
          ${seg('sim-level', [['A', 'Nivel A · FMC130'], ['B', 'Nivel B · FMC150']])}
          ${seg('sim-volt', [['12', '12 V'], ['24', '24 V']])}
          ${seg('sim-speed', [['1', '1 s = 1 min'], ['10', '1 s = 10 min']])}
          <button type="button" data-act="sim-3d" class="btn">${icon('cube', 'h-4 w-4')}Ver en 3D</button>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6">
          <section class="grid min-w-0 content-start gap-3 rounded-2xl border border-line bg-panel p-4" aria-label="Diagrama de conexión">
            <div class="overflow-x-auto">${DIAGRAM}</div>
            <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label="Simbología de cables">
              <span class="inline-flex items-center gap-1.5"><i class="w-5 border-t-[3px]" style="border-color:rgb(var(--w-power))"></i>Alimentación +</span>
              <span class="inline-flex items-center gap-1.5"><i class="w-5 border-t-[3px]" style="border-color:rgb(var(--w-gnd))"></i>Tierra</span>
              <span class="inline-flex items-center gap-1.5"><i class="w-5 border-t-[3px]" style="border-color:rgb(var(--w-sig))"></i>Señal D+</span>
              <span class="inline-flex items-center gap-1.5" data-lg="can"><i class="w-5 border-t-[3px]" style="border-color:rgb(var(--w-can))"></i>CAN J1939</span>
              <span class="inline-flex items-center gap-1.5" data-lg="ble"><i class="w-5 border-t-[3px] border-dashed" style="border-color:rgb(var(--w-ble))"></i>Bluetooth sonda</span>
              <span class="inline-flex items-center gap-1.5"><i class="w-5 border-t-[3px] border-dashed" style="border-color:rgb(var(--w-cell))"></i>Datos celulares</span>
              <span>Gris = sin señal</span>
            </div>
          </section>

          <aside class="grid min-w-0 content-start gap-4">
            <section class="grid gap-3 rounded-2xl border border-line bg-panel p-4" aria-label="Controles">
              <h3 class="text-sm font-semibold">Tractor</h3>
              <div class="flex flex-wrap gap-2">
                <button type="button" data-act="key" class="btn">Abrir llave</button>
                <button type="button" data-act="eng" class="btn btn-primary" disabled>Arrancar motor</button>
                <button type="button" data-act="move" class="btn" disabled>Trabajar en lote</button>
              </div>
              <h3 class="pt-1 text-sm font-semibold">Eventos</h3>
              <div class="flex flex-wrap gap-2">
                <button type="button" data-act="theft" class="btn">${icon('fuel', 'h-4 w-4')}Extraer 35 L</button>
                <button type="button" data-act="refill" class="btn">Carga de pipa</button>
                <button type="button" data-act="cut" class="btn">${icon('bolt', 'h-4 w-4')}Desconectar equipo</button>
              </div>
            </section>

            <section class="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line" aria-live="polite">
              ${[
                ['hours', 'Horas de motor'],
                ['clock', 'Hora simulada'],
                ['volt', 'Voltaje'],
                ['eng', 'Motor detectado'],
                ['fuel', 'Combustible'],
                ['dev', 'Equipo'],
              ]
                .map(([k, l]) => `<div class="grid gap-0.5 bg-panel px-3.5 py-3"><span class="eyebrow">${l}</span><span class="font-mono text-lg tabular-nums" data-ro="${k}"></span><span class="text-xs text-muted" data-ros="${k}"></span></div>`)
                .join('')}
            </section>

            <section class="grid gap-2 rounded-2xl border border-line bg-panel p-4">
              <h3 class="text-sm font-semibold">Bitácora en Traccar</h3>
              <ol data-log class="max-h-64 overflow-y-auto border-t border-line text-[13px]"></ol>
            </section>
          </aside>

          <section class="min-w-0 rounded-2xl border border-line bg-panel p-4 lg:col-span-2" aria-label="Puntos de conexión">
            <h3 class="mb-3 text-sm font-semibold">Puntos de conexión</h3>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px] text-sm">
                <thead class="text-left text-xs text-muted"><tr>
                  <th class="px-3 py-2 font-medium">Cable</th><th class="px-3 py-2 font-medium">Desde</th><th class="px-3 py-2 font-medium">Hasta (rastreador)</th>
                  <th class="px-3 py-2 font-medium">Protección</th><th class="px-3 py-2 font-medium">Para qué sirve</th><th class="px-3 py-2 font-medium">Nivel</th></tr></thead>
                <tbody class="divide-y divide-line">${CONNECTIONS.map(
                  ([w, a, b, c, d, e, f]) => `<tr>
                    <td class="px-3 py-2.5 font-medium"><span class="mr-2 inline-block w-4 border-t-[3px] align-middle ${w === 'ble' || w === 'cell' ? 'border-dashed' : ''}" style="border-color:rgb(var(--w-${w}))"></span>${a}</td>
                    <td class="px-3 py-2.5">${b}</td><td class="px-3 py-2.5 font-mono text-xs">${c}</td><td class="px-3 py-2.5 font-mono text-xs">${d}</td>
                    <td class="px-3 py-2.5 text-muted">${e}</td><td class="px-3 py-2.5">${f}</td></tr>`,
                ).join('')}</tbody>
              </table>
            </div>
            <p class="mt-3 text-xs text-muted">Fusibles, voltajes y pines son de referencia: confírmalos con el manual del modelo que se compre antes de cablear.</p>
          </section>
        </div>
      </div>
    </div>`;

  const $ = (id) => host.querySelector('#sim-' + id);
  const ro = (k) => host.querySelector(`[data-ro="${k}"]`);
  const ros = (k) => host.querySelector(`[data-ros="${k}"]`);
  const btn = (a) => host.querySelector(`[data-act="${a}"]`);
  const logEl = host.querySelector('[data-log]');

  const S = { level: 'A', volt: 12, speed: 10, key: false, eng: false, move: false, cut: false, fuel: 180, cap: 250, hours: 3412.0, min: 360, lastSend: -999 };

  function log(msg, sev) {
    const li = document.createElement('li');
    li.className = 'grid grid-cols-[48px_1fr] gap-2 border-b border-line py-2';
    const color = { crit: 'text-crit font-semibold', warn: 'text-warn font-semibold', ok: 'text-ok font-semibold' }[sev] || '';
    li.innerHTML = `<time class="font-mono text-muted">${fmtT(S.min)}</time><span class="${color}"></span>`;
    li.querySelector('span').textContent = msg;
    logEl.prepend(li);
    while (logEl.children.length > 40) logEl.lastChild.remove();
  }
  function send(reason) {
    S.lastSend = S.min;
    const p = $('ping');
    p.classList.remove('go');
    void p.getBBox();
    p.classList.add('go');
    $('tLast').textContent = 'último dato ' + fmtT(S.min);
    if (reason) log(reason);
  }
  const volts = () => {
    const b = S.volt === 12 ? { off: 12.6, key: 12.3, run: 14.2, th: 13.2 } : { off: 25.2, key: 24.6, run: 28.4, th: 26.4 };
    return { v: S.eng ? b.run : S.key ? b.key : b.off, th: b.th };
  };
  const chip = (cls, t) => `<span class="chip ${cls}">${t}</span>`;
  const setSeg = (id, val) =>
    $(id)
      .querySelectorAll('[data-v]')
      .forEach((b) => {
        const on = b.dataset.v === String(val);
        b.setAttribute('aria-pressed', String(on));
        b.className = `rounded-full px-3 py-1 text-xs font-medium transition ${on ? 'bg-panel text-fg shadow-float' : 'text-muted hover:text-fg'}`;
      });

  function render() {
    const B = S.level === 'B';
    $('gCan').classList.toggle('hide', !B);
    $('gJ1939').classList.toggle('hide', !B);
    $('gCanLbl').classList.toggle('hide', !B);
    $('wBle').classList.toggle('hide', B);
    host.querySelector('[data-lg="can"]').hidden = !B;
    host.querySelector('[data-lg="ble"]').hidden = B;
    $('tProbe').textContent = B ? 'Nivel leído por CAN' : 'Sonda BLE';
    $('tDevName').textContent = B ? 'Teltonika FMC150' : 'Teltonika FMC130';
    $('wPower').classList.toggle('on', !S.cut);
    $('wGnd').classList.toggle('on', !S.cut);
    $('wGndBat').classList.add('on');
    $('wDplus').classList.toggle('on', S.eng && !S.cut);
    $('wCanH').classList.toggle('on', B && S.key && !S.cut);
    $('wCanL').classList.toggle('on', B && S.key && !S.cut);
    $('wBle').classList.toggle('on', !B);
    $('wCell').classList.add('on');
    $('ledPwr').setAttribute('class', 'led ' + (S.cut ? 'alarm' : 'on'));
    $('ledGps').setAttribute('class', 'led on');
    $('ledNet').setAttribute('class', 'led on');

    const vv = volts();
    $('tKey').textContent = S.key ? 'ABIERTA' : 'APAGADA';
    $('tAlt').textContent = S.eng ? 'cargando · D+ activo' : 'detenido · D+ = 0';
    $('tBat').textContent = nf1.format(vv.v) + ' V';
    const h = Math.max(0, Math.min(1, S.fuel / S.cap)) * 60;
    $('fuelRect').setAttribute('y', 502 - h);
    $('fuelRect').setAttribute('height', h);
    $('tTank').textContent = Math.round(S.fuel) + ' L';

    ro('hours').textContent = nf1.format(S.hours) + ' h';
    ros('hours').textContent = B ? 'horas ECU por CAN (D+ respaldo)' : 'por señal D+ del alternador';
    ro('clock').textContent = fmtT(S.min);
    ros('clock').textContent = 'Lote 7 · Rancho El Álamo';
    ro('volt').textContent = nf1.format(vv.v) + ' V';
    ros('volt').textContent = `respaldo: motor si > ${nf1.format(vv.th)} V`;
    ro('eng').innerHTML = S.eng ? chip('border-ok text-ok', 'en marcha') : S.key ? chip('border-warn text-warn', 'llave abierta') : chip('border-line text-muted', 'apagado');
    ros('eng').textContent = S.eng ? 'D+ = 1 · cuenta horas' : S.key ? 'D+ = 0 · no cuenta horas' : 'D+ = 0';
    ro('fuel').textContent = Math.round(S.fuel) + ' L';
    ros('fuel').textContent = B ? 'nivel y consumo de la ECU' : 'sonda BLE · tabla de tarado';
    ro('dev').innerHTML = S.cut ? chip('border-crit text-crit', 'alerta') : chip('border-ok text-ok', 'en línea');
    ros('dev').textContent = S.cut ? 'sin alimentación · batería interna' : 'alimentación externa';

    btn('key').textContent = S.key ? 'Cerrar llave' : 'Abrir llave';
    btn('key').setAttribute('aria-pressed', String(S.key));
    btn('eng').disabled = !S.key;
    btn('eng').textContent = S.eng ? 'Apagar motor' : 'Arrancar motor';
    btn('move').disabled = !S.eng;
    btn('move').textContent = S.move ? 'Detener' : 'Trabajar en lote';
    btn('move').setAttribute('aria-pressed', String(S.move));
    btn('cut').lastChild.textContent = S.cut ? 'Reconectar equipo' : 'Desconectar equipo';
    btn('cut').setAttribute('aria-pressed', String(S.cut));
    setSeg('level', S.level);
    setSeg('volt', S.volt);
    setSeg('speed', S.speed);
  }

  host.addEventListener('click', (e) => {
    const s = e.target.closest('[data-v]');
    if (s) {
      const g = s.parentElement.id;
      if (g === 'sim-level') {
        S.level = s.dataset.v;
        log(S.level === 'A' ? 'Equipo cambiado a nivel A (FMC130 + sonda BLE)' : 'Equipo cambiado a nivel B (FMC150 + CAN)');
      }
      if (g === 'sim-volt') S.volt = Number(s.dataset.v);
      if (g === 'sim-speed') S.speed = Number(s.dataset.v);
      return render();
    }
    const a = e.target.closest('[data-act]')?.dataset.act;
    switch (a) {
      case 'sim-close':
        setView('fleet');
        return;
      case 'sim-3d': {
        const id = [...state.devices.values()].find((d) => d.attributes?.nivel === S.level)?.id;
        window.dispatchEvent(new CustomEvent('open-scene3d', { detail: { id } }));
        return;
      }
      case 'key':
        S.key = !S.key;
        if (!S.key) {
          if (S.eng) log('Motor apagado (D+ = 0) · se cierra el conteo de horas', 'ok');
          S.eng = false;
          S.move = false;
          log('Llave cerrada');
        } else log('Llave abierta · motor apagado: el sistema NO cuenta horas', 'warn');
        break;
      case 'eng':
        S.eng = !S.eng;
        if (!S.eng) S.move = false;
        log(S.eng ? 'Encendido detectado (D+ = 1) · inicia conteo de horas' : 'Motor apagado (D+ = 0) · se cierra el conteo de horas', 'ok');
        break;
      case 'move':
        S.move = !S.move;
        log(S.move ? 'Entrada a geocerca Lote 7 · reportes cada 60 s' : 'Tractor detenido · reportes cada 30 min');
        break;
      case 'theft': {
        const amt = Math.min(35, S.fuel);
        if (amt <= 0) return;
        S.fuel -= amt;
        if (S.eng) log(`Baja de ${Math.round(amt)} L con motor encendido · revisar`, 'warn');
        else log(`ALERTA: baja de ${Math.round(amt)} L con motor apagado · posible extracción`, 'crit');
        break;
      }
      case 'refill': {
        const amt = Math.round(S.cap - S.fuel);
        if (amt <= 0) {
          log('Tanque lleno');
          return render();
        }
        S.fuel = S.cap;
        log(`Carga detectada +${amt} L · conciliar con vale de pipa`, 'ok');
        break;
      }
      case 'cut':
        S.cut = !S.cut;
        log(S.cut ? 'ALERTA: corte de alimentación externa · el equipo sigue con batería interna' : 'Alimentación restablecida', S.cut ? 'crit' : 'ok');
        break;
      default:
        return;
    }
    send();
    render();
  });

  // Reloj: solo corre mientras la vista está abierta.
  let raf = 0;
  let last = 0;
  function tick(now) {
    const dt = Math.min(0.5, (now - last) / 1000);
    last = now;
    const dmin = dt * S.speed;
    S.min += dmin;
    if (S.eng) {
      S.hours += dmin / 60;
      S.fuel = Math.max(0, S.fuel - ((S.move ? 14 : 4) * dmin) / 60);
    }
    if (S.min - S.lastSend >= (S.move ? 1 : 30)) send();
    render();
    raf = requestAnimationFrame(tick);
  }

  let open = false;
  subscribe(() => {
    const show = state.view === 'sim';
    host.hidden = !show;
    if (show && !open) {
      open = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!show && open) {
      open = false;
      cancelAnimationFrame(raf);
    }
  });

  log('Equipo instalado · horómetro inicial 3,412.0 h capturado');
  send();
  render();
}
