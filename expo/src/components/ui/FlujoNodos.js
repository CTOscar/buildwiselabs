import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { G, Path, Rect, Circle, Text as SvgText } from 'react-native-svg';

const PathAnimado = Animated.createAnimatedComponent(Path);

// Paleta tomada de la referencia: naranja de n8n, turquesa de las ramas, verde de los
// nodos activos y un cian para la salida.
const NARANJA = '#F08A3C';
const TEAL = '#2E8A99';
const VERDE = '#3FBF6F';
const CIAN = '#7FE6F0';
const TRAZO = '#272B31';
const CARA = '#141719';
const TXT = '#4A5058';

const NW = 92;
const NH = 60;
const n = (x, y, tipo = 'simple') => ({ x, y, tipo });
const der = (a) => a.x + NW;
const izq = (a) => a.x;
const cx = (a) => a.x + NW / 2;
const cy = (a) => a.y + NH / 2;
const aba = (a) => a.y + NH;

// Capa de fondo: nodos tenues que no llevan a ningun lado. Son solo profundidad -- en la
// referencia el tablero sigue mas alla del foco, y sin esto la escena se ve vacia.
const FONDO = [];
for (let f = 0; f < 5; f++) {
  for (let c = 0; c < 7; c++) {
    if ((f * 7 + c) % 3 === 0) continue;
    FONDO.push(n(180 + c * 340, 90 + f * 250));
  }
}

// Capa principal: la cadena que de verdad se recorre.
const A = {
  a1: n(170, 430, 'verde'), a2: n(420, 430, 'verde'), a3: n(670, 430, 'verde'),
  a4: n(820, 700, 'llave'), a5: n(1070, 700, 'llave'), a6: n(1320, 700, 'llave'),
  a7: n(1570, 700, 'simple'),
  b1: n(1070, 250, 'teal'), b2: n(1430, 250, 'simple'), b3: n(1800, 430, 'salida'),
  c1: n(600, 980, 'teal'), c2: n(950, 980, 'simple'), c3: n(1300, 980, 'llave'),
};

// "fase" (0..1) = en que momento del ciclo arranca el pulso de cada tramo. Estan
// escalonadas para que el recorrido se lea como una secuencia y no como un parpadeo
// simultaneo de todas las lineas.
const RUTAS = [
  { c: NARANJA, d: `M ${der(A.a1)} ${cy(A.a1)} H ${izq(A.a2)}`, fase: 0.00 },
  { c: NARANJA, d: `M ${der(A.a2)} ${cy(A.a2)} H ${izq(A.a3)}`, fase: 0.07 },
  { c: NARANJA, d: `M ${cx(A.a3)} ${aba(A.a3)} V ${cy(A.a4)} H ${izq(A.a4)}`, fase: 0.14 },
  { c: NARANJA, d: `M ${der(A.a4)} ${cy(A.a4)} H ${izq(A.a5)}`, fase: 0.24 },
  { c: NARANJA, d: `M ${der(A.a5)} ${cy(A.a5)} H ${izq(A.a6)}`, fase: 0.31 },
  { c: NARANJA, d: `M ${der(A.a6)} ${cy(A.a6)} H ${izq(A.a7)}`, fase: 0.38 },
  { c: NARANJA, d: `M ${der(A.a7)} ${cy(A.a7)} H ${cx(A.b3)} V ${aba(A.b3)}`, fase: 0.45 },
  { c: TEAL, d: `M ${der(A.a3)} ${cy(A.a3)} H ${izq(A.b1)}`, fase: 0.16 },
  { c: TEAL, d: `M ${der(A.b1)} ${cy(A.b1)} H ${izq(A.b2)}`, fase: 0.26 },
  { c: TEAL, d: `M ${der(A.b2)} ${cy(A.b2)} H ${cx(A.b3)} V ${A.b3.y}`, fase: 0.34 },
  { c: TEAL, d: `M ${cx(A.a4)} ${aba(A.a4)} V ${cy(A.c2)} H ${izq(A.c2)}`, fase: 0.52 },
  { c: TEAL, d: `M ${der(A.c1)} ${cy(A.c1)} H ${izq(A.c2)}`, fase: 0.56 },
  { c: TEAL, d: `M ${der(A.c2)} ${cy(A.c2)} H ${izq(A.c3)}`, fase: 0.63 },
  { c: NARANJA, d: `M ${der(A.c3)} ${cy(A.c3)} H 2100`, fase: 0.70 },
];

const LARGO = 3000;   // mas largo que cualquier tramo: el pulso siempre entra y sale
const VENTANA = 0.30; // que fraccion del ciclo dura el recorrido de un tramo
const CICLO = 13000;  // ms de una vuelta completa. Es la perilla de la velocidad:
                      // subirlo lo vuelve mas lento, bajarlo mas rapido. Cada pulso
                      // tarda CICLO * VENTANA en recorrer su tramo (aqui, 3.9 s).

function Nodo({ a, tenue }) {
  const o = tenue ? 0.34 : 1;
  return (
    <G opacity={o}>
      <Rect x={a.x} y={a.y} width={NW} height={NH} rx={11} fill={CARA} stroke={TRAZO} strokeWidth={1.8} />
      {a.tipo === 'verde' && (
        <>
          <Rect x={a.x + 36} y={a.y + 15} width={20} height={30} rx={5} fill={VERDE} opacity={0.9} />
          <Circle cx={a.x + 64} cy={a.y + 18} r={3.5} fill="#cfd6dd" opacity={0.8} />
        </>
      )}
      {a.tipo === 'llave' && (
        <SvgText x={a.x + NW / 2} y={a.y + NH / 2 + 9} textAnchor="middle" fontFamily="monospace" fontSize={26} fill={NARANJA} opacity={0.92}>
          {'{ }'}
        </SvgText>
      )}
      {a.tipo === 'teal' && <Rect x={a.x + 30} y={a.y + 22} width={32} height={15} rx={4} fill={TEAL} opacity={0.65} />}
      {a.tipo === 'simple' && <Rect x={a.x + 28} y={a.y + 24} width={36} height={12} rx={4} fill="#5b636d" opacity={0.45} />}
      {a.tipo === 'salida' && (
        <>
          <Circle cx={a.x + NW / 2} cy={a.y + NH / 2} r={46} fill={CIAN} opacity={0.1} />
          <Rect x={a.x + 18} y={a.y + 16} width={56} height={28} rx={7} fill="#0A2429" stroke={CIAN} strokeWidth={1.8} />
        </>
      )}
      {/* Barritas de texto: en la referencia cada nodo lleva su etiqueta y es lo que da
          la sensacion de tablero lleno. Legibles no tienen que ser. */}
      {!tenue && (
        <>
          <Rect x={a.x + 8} y={a.y + NH + 9} width={NW - 24} height={5} rx={2.5} fill={TXT} opacity={0.5} />
          <Rect x={a.x + 8} y={a.y + NH + 20} width={NW - 48} height={5} rx={2.5} fill={TXT} opacity={0.3} />
        </>
      )}
    </G>
  );
}

/**
 * Portada animada del servicio de automatizacion: un tablero de nodos por el que corren
 * pulsos, como un flujo ejecutandose.
 *
 * Es SVG y no un video a proposito: se ve nitido a cualquier tamano, pesa unos pocos KB
 * en vez de varios MB, no necesita que el navegador autorice la reproduccion y funciona
 * igual en la web y en la app.
 *
 * La animacion se mueve con UN solo valor que da vueltas; cada tramo mira una ventana
 * distinta de ese ciclo (su "fase"). Con un valor por tramo serian catorce animaciones
 * corriendo a la vez por una ilustracion de adorno.
 */
export default function FlujoNodos({ height = 150 }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: CICLO, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  return (
    <View style={{ width: '100%', height, overflow: 'hidden', backgroundColor: '#07080A' }}>
      <Svg width="100%" height="100%" viewBox="260 180 1900 800" preserveAspectRatio="xMidYMid slice">
        {/* rotacion + inclinacion: la perspectiva del tablero visto de lado. Se dibuja
            todo en coordenadas rectas y se inclina al final, que es mas facil de mantener
            que calcular cada diagonal a mano. */}
        <G transform="rotate(-6.5 1300 650) skewY(4.5)">
          {FONDO.map((a, i) => (
            <G key={`f${i}`}>
              <Path d={`M ${der(a)} ${cy(a)} H ${a.x + 250}`} stroke={i % 2 ? TEAL : '#3a4047'} strokeWidth={2} opacity={0.18} fill="none" />
              <Nodo a={a} tenue />
            </G>
          ))}

          {RUTAS.map((r, i) => {
            // El pulso recorre su tramo dentro de su ventana del ciclo y desaparece fuera
            // de ella: sin eso, al terminar se quedaria la linea pintada entera.
            const desde = r.fase;
            const hasta = r.fase + VENTANA;
            // Los cuatro valores tienen que ir SIEMPRE de menor a mayor: si no, Animated
            // lanza una excepcion, y esa excepcion tumba el sitio entero -- esta portada
            // se dibuja en las tarjetas del inicio, en servicios y en el encabezado del
            // detalle. Por eso se separan con un epsilon en vez de recortarlos contra 0
            // y 1: a "t" solo le llegan valores de 0 a 1 y los extremos ya quedan fijos
            // con extrapolate "clamp".
            const E = 0.001;
            const dentro = [desde - E, desde, hasta, hasta + E];
            return (
              <G key={`r${i}`}>
                <Path d={r.d} stroke={r.c} strokeWidth={9} opacity={0.09} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <Path d={r.d} stroke={r.c} strokeWidth={2.4} opacity={0.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <PathAnimado
                  d={r.d}
                  stroke={r.c}
                  strokeWidth={4}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={[70, LARGO]}
                  strokeDashoffset={t.interpolate({
                    inputRange: [desde, hasta],
                    outputRange: [LARGO + 70, 0],
                    extrapolate: 'clamp',
                  })}
                  strokeOpacity={t.interpolate({
                    inputRange: dentro,
                    outputRange: [0, 1, 1, 0],
                    extrapolate: 'clamp',
                  })}
                />
              </G>
            );
          })}

          {Object.keys(A).map((k) => <Nodo key={k} a={A[k]} />)}
        </G>
      </Svg>
    </View>
  );
}
