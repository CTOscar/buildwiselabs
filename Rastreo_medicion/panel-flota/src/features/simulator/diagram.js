// Diagrama SVG del cableado del rastreador en el tractor (simulación).
// Generado a partir de la primera simulación; los ids llevan prefijo "sim-".
export const DIAGRAM = `
<svg id="sim-dg" class="block h-auto w-full min-w-[640px]" viewBox="0 0 900 540" role="img" aria-label="Diagrama de cableado del rastreador en el tractor">
      <!-- zonas -->
      <rect class="zone" x="20" y="34" width="240" height="470" rx="8"/>
      <text class="zone-t" x="34" y="56">Compartimento motor</text>
      <rect class="zone" x="300" y="34" width="330" height="360" rx="8"/>
      <text class="zone-t" x="314" y="56">Cabina</text>
      <rect class="zone" x="660" y="34" width="220" height="470" rx="8"/>
      <text class="zone-t" x="674" y="56">Fuera del tractor</text>

      <!-- cables (debajo de componentes) -->
      <path id="sim-wPower" class="wire power flow" d="M200 352 H262 M298 352 H340 V250 H392"/>
      <path id="sim-wGnd" class="wire gnd" d="M392 290 H356 V470 H128"/>
      <path id="sim-wGndBat" class="wire gnd" d="M110 390 V458"/>
      <path id="sim-wDplus" class="wire sig flow" d="M200 212 H262 M298 212 H340 V230 H392"/>
      <g id="sim-gCan">
        <path id="sim-wCanH" class="wire can flow" d="M552 262 H596 V440 H690"/>
        <path id="sim-wCanL" class="wire can flow" d="M552 276 H582 V454 H690"/>
      </g>
      <path id="sim-wBle" class="wire ble" d="M440 440 C440 400 470 370 470 336"/>
      <path id="sim-wCell" class="wire cell" d="M552 200 C610 160 660 120 712 112"/>
      <path class="wire cell on" style="stroke-dasharray:none;animation:none" d="M740 140 V196"/>
      <path class="wire cell on" style="stroke-dasharray:none;animation:none" d="M770 250 V306"/>

      <!-- llave -->
      <rect class="comp" x="40" y="82" width="160" height="58" rx="6"/>
      <text class="lbl" x="54" y="106">Llave de encendido</text>
      <text class="sub" id="sim-tKey" x="54" y="126">APAGADA</text>
      <text class="sub" x="54" y="160" style="font-size:10px">No se cablea: se usa D+</text>

      <!-- alternador -->
      <rect class="comp" x="40" y="180" width="160" height="64" rx="6"/>
      <text class="lbl" x="54" y="204">Alternador</text>
      <text class="sub" id="sim-tAlt" x="54" y="224">detenido</text>
      <circle cx="200" cy="212" r="5" style="fill:rgb(var(--w-sig))"/>
      <text class="sub" x="176" y="200">D+</text>

      <!-- fusibles -->
      <rect class="fuse" x="262" y="203" width="36" height="18" rx="3"/>
      <text class="sub" x="266" y="196">F2 1A</text>
      <rect class="fuse" x="262" y="343" width="36" height="18" rx="3"/>
      <text class="sub" x="266" y="336">F1 2A</text>

      <!-- bateria -->
      <rect class="comp" x="40" y="320" width="160" height="70" rx="6"/>
      <text class="lbl" x="54" y="344">Batería</text>
      <text class="sub" id="sim-tBat" x="54" y="364">12.6 V</text>
      <text x="186" y="348" style="font-size:16px;font-weight:700;fill:rgb(var(--w-power))">+</text>
      <text x="116" y="406" style="font-size:16px;font-weight:700">−</text>

      <!-- tierra chasis -->
      <g stroke-width="2" style="stroke:rgb(var(--fg))">
        <line x1="96" y1="460" x2="124" y2="460"/><line x1="101" y1="467" x2="119" y2="467"/><line x1="106" y1="474" x2="114" y2="474"/>
      </g>
      <text class="sub" x="40" y="496">Tierra a chasis</text>

      <!-- caja IP67 + rastreador -->
      <rect class="comp" x="356" y="150" width="236" height="200" rx="8" style="stroke-dasharray:3 3"/>
      <text class="sub" x="364" y="144">Caja IP67</text>
      <rect class="dev" x="392" y="182" width="160" height="140" rx="6"/>
      <text class="lbl" id="sim-tDevName" x="404" y="206">Teltonika FMC130</text>
      <text class="sub" x="404" y="224">GPS + LTE internos</text>
      <text class="sub" x="404" y="240">SIM M2M · batería int.</text>
      <circle class="led" id="sim-ledPwr" cx="408" cy="304" r="5"/><text class="sub" x="418" y="308">ALIM</text>
      <circle class="led" id="sim-ledGps" cx="462" cy="304" r="5"/><text class="sub" x="472" y="308">GPS</text>
      <circle class="led" id="sim-ledNet" cx="508" cy="304" r="5"/><text class="sub" x="518" y="308">RED</text>
      <text class="sub" x="398" y="254" style="font-size:10px">VCC</text>
      <text class="sub" x="398" y="234" style="font-size:10px">DIN1</text>
      <text class="sub" x="398" y="294" style="font-size:10px">GND</text>
      <g id="sim-gCanLbl"><text class="sub" x="520" y="266" style="font-size:10px">CAN</text></g>
      <!-- sello -->
      <path class="seal" d="M592 168 c20 -2 22 26 0 24"/>
      <circle cx="592" cy="168" r="3" style="fill:rgb(var(--muted))"/>
      <text class="sub" x="540" y="380">Sello acero · folio 004817</text>

      <!-- tanque -->
      <g id="sim-gTank">
        <rect class="comp" x="340" y="440" width="200" height="64" rx="10"/>
        <rect class="fuel" id="sim-fuelRect" x="342" y="470" width="196" height="32" rx="8"/>
        <line x1="440" y1="440" x2="440" y2="500" stroke-width="4" style="stroke:rgb(var(--w-ble))"/>
        <rect x="430" y="430" width="20" height="12" rx="2" style="fill:rgb(var(--w-ble))"/>
        <text class="lbl" x="352" y="462">Tanque diésel</text>
        <text class="sub" id="sim-tTank" x="456" y="494">180 L</text>
        <text class="sub" id="sim-tProbe" x="456" y="428">Sonda BLE</text>
      </g>

      <!-- J1939 -->
      <g id="sim-gJ1939">
        <rect class="comp" x="690" y="424" width="170" height="52" rx="6"/>
        <text class="lbl" x="702" y="446">Conector J1939</text>
        <text class="sub" x="702" y="464">CAN H · CAN L (ECU)</text>
      </g>

      <!-- torre / traccar / sistema -->
      <g transform="translate(726 70)">
        <path d="M14 70 L0 70 L14 0 L28 70 Z" fill="none" stroke-width="2" style="stroke:rgb(var(--fg))"/>
        <line x1="5" y1="40" x2="23" y2="40" stroke-width="2" style="stroke:rgb(var(--fg))"/>
        <circle class="sim-pulse" id="sim-ping" cx="14" cy="0" r="4"/>
      </g>
      <text class="sub" x="762" y="100">Red celular</text>
      <rect class="comp" x="690" y="196" width="170" height="54" rx="6"/>
      <text class="lbl" x="702" y="219">Servidor Traccar</text>
      <text class="sub" id="sim-tLast" x="702" y="238">sin datos</text>
      <rect class="comp" x="690" y="306" width="170" height="54" rx="6"/>
      <text class="lbl" x="702" y="329">Sistema maquinaria</text>
      <text class="sub" x="702" y="348">API REST · KPIs</text>
    </svg>
`;
