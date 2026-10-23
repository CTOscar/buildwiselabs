import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';

// Fondo pizarra de la referencia y el bot en el malva del logotipo (carbon.blue de
// tailwind.config.js), para que la pantalla de carga sea de la marca y no de la imagen
// de la que se copio la composicion.
const FONDO = '#242A33';
const MALVA = '#9d6b99';
const MALVA_ALTO = '#c99ec5';
const PUNTO = '#4C5563';

const CELDAS = 3;
const PASO = 30;   // separacion entre puntos de la matriz
const R = 5;       // radio de cada punto
// Cuanto se queda la pantalla antes de desvanecerse. El punto tarda 1800 ms en
// recorrer la matriz completa, asi que 3600 son dos vueltas enteras: termina donde
// empezo y no se corta a la mitad del recorrido. Si se quiere mas o menos tiempo,
// conviene moverlo de 1800 en 1800 por esa misma razon.
const MS_VISIBLE = 3600;

// Recorrido en serpiente por la matriz 3x3: el pulso entra por arriba a la izquierda y
// sale por abajo a la derecha, pasando por los nueve. En zigzag y no por filas sueltas
// para que el movimiento se lea continuo.
const RUTA = [
  [0, 0], [1, 0], [2, 0],
  [2, 1], [1, 1], [0, 1],
  [0, 2], [1, 2], [2, 2],
];
const pos = (c) => c * PASO;

/**
 * Pantalla de carga del servicio de chatbot: el bot respirando y una matriz de 3x3 por
 * la que viaja un punto, como si el asistente estuviera pensando.
 *
 * Todo se mueve con transform y opacity, que son las dos propiedades que la animacion
 * puede manejar fuera del hilo de JavaScript (useNativeDriver). Asi no se traba aunque
 * la pagina este montando el resto del contenido por detras, que es justo cuando esto
 * se ve.
 */
export default function CargaChatbot({ onListo, duracion = MS_VISIBLE }) {
  const t = useRef(new Animated.Value(0)).current;      // recorrido del pulso (0..1)
  const respira = useRef(new Animated.Value(0)).current; // el bot latiendo
  const salida = useRef(new Animated.Value(1)).current;  // desvanecido final

  // El aviso de "ya termine" se guarda en una ref y NO entra en las dependencias del
  // efecto de abajo. Quien usa el componente casi siempre pasa una funcion nueva en cada
  // render; si estuviera en las dependencias, cualquier render del padre reiniciaria el
  // temporizador y la carga no acabaria nunca.
  const avisar = useRef(onListo);
  avisar.current = onListo;

  useEffect(() => {
    const viaje = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
    );
    const aliento = Animated.loop(
      Animated.sequence([
        Animated.timing(respira, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(respira, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    viaje.start();
    aliento.start();

    const fin = setTimeout(() => {
      Animated.timing(salida, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true })
        .start(({ finished }) => { if (finished) avisar.current?.(); });
    }, duracion);

    return () => { clearTimeout(fin); viaje.stop(); aliento.stop(); };
  }, [t, respira, salida, duracion]);

  // El pulso recorre los nueve puntos: una sola interpolacion por eje, con un tramo por
  // salto. Animated va de un valor al siguiente en linea recta, que es exactamente el
  // movimiento que se quiere entre celdas vecinas.
  const entrada = RUTA.map((_, i) => i / (RUTA.length - 1));
  const mueveX = t.interpolate({ inputRange: entrada, outputRange: RUTA.map(([c]) => pos(c)) });
  const mueveY = t.interpolate({ inputRange: entrada, outputRange: RUTA.map(([, f]) => pos(f)) });

  const lado = (CELDAS - 1) * PASO + R * 2;

  return (
    <Animated.View
      accessibilityLabel="Cargando el servicio de chatbot"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
        alignItems: 'center', justifyContent: 'center', backgroundColor: FONDO, opacity: salida,
      }}
    >
      {/* Tocar salta la espera: nadie deberia quedarse atrapado mirando una animacion. */}
      <Pressable
        accessibilityLabel="Saltar la animacion de carga"
        onPress={() => onListo?.()}
        style={{ alignItems: 'center' }}
      >
        {/* Bot */}
        <Animated.View
          style={{
            width: 132, height: 112, borderRadius: 56, backgroundColor: MALVA,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 26,
            transform: [{ scale: respira.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
          }}
        >
          {/* Brillo superior: un apunte de volumen. Va con opacidad muy baja y muy
              redondeado a proposito -- React Native no tiene desenfoque en los estilos
              (el filter de CSS solo funciona en web), asi que la unica forma de que no se
              lea como un rectangulo pegado es que casi no se vea. */}
          <View style={{ position: 'absolute', top: 16, left: 34, width: 58, height: 22, borderRadius: 14, backgroundColor: MALVA_ALTO, opacity: 0.18 }} />
          <View style={{ width: 13, height: 18, borderRadius: 7, backgroundColor: '#fff' }} />
          <View style={{ width: 13, height: 18, borderRadius: 7, backgroundColor: '#fff' }} />
        </Animated.View>

        {/* Matriz 3x3 */}
        <View style={{ width: lado, height: lado, marginTop: 42 }}>
          {RUTA.map(([c, f], i) => (
            <View
              key={`p${i}`}
              style={{
                position: 'absolute', left: pos(c), top: pos(f),
                width: R * 2, height: R * 2, borderRadius: R, backgroundColor: PUNTO,
              }}
            />
          ))}
          {/* El punto que viaja */}
          <Animated.View
            style={{
              position: 'absolute', width: R * 2, height: R * 2, borderRadius: R,
              backgroundColor: MALVA,
              transform: [{ translateX: mueveX }, { translateY: mueveY }, { scale: 1.5 }],
            }}
          />
          {/* Su estela, un poco atrasada y mas tenue */}
          <Animated.View
            style={{
              position: 'absolute', width: R * 2, height: R * 2, borderRadius: R,
              backgroundColor: MALVA, opacity: 0.3,
              transform: [{ translateX: mueveX }, { translateY: mueveY }, { scale: 2.6 }],
            }}
          />
        </View>

        <Text style={{ marginTop: 38, color: '#E8ECF1', fontSize: 19, letterSpacing: 3 }}>CARGANDO</Text>
        <Text style={{ marginTop: 8, color: '#8B94A1', fontSize: 12 }}>Chatbot Inteligente para PYMES</Text>
      </Pressable>
    </Animated.View>
  );
}
