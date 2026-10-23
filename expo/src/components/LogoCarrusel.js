import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, Text, View, useWindowDimensions,
} from 'react-native';

import { useColorScheme } from 'nativewind';
import { STACK_APPS } from '../constants/stackApps';
import { LOGOS_PLATAFORMA } from '../constants/plataformas';

/*
 * Cinta de logos que corre sola, como la de electronjs.org: todos los logos del mismo
 * color, solo la silueta (negros en modo claro, blancos en modo oscuro), sobre el fondo
 * normal de la pagina y desfilando de derecha a izquierda. Se detiene al
 * pasar el mouse y, si el sistema pide reducir movimiento, se queda quieta.
 * Va en el inicio, justo arriba del subfooter (Screen la recibe como `prefooter`).
 */

const svgUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const svgDe = (nombre) => STACK_APPS.find((a) => a.name === nombre)?.svg;

const ALTO = 40; // alto de cada logo (Electron usa 3rem)
const ALTO_CHICO = 28; // en el celular, para que quepa mas de un logo a la vez
const BUILDWISE_ASPECTO = 1430 / 262; // mismo recorte que BuildWiseLogo
const VELOCIDAD = 45; // px por segundo

const LOGOS = [
  { id: 'buildwise', nombre: 'BuildWise Labs', imagen: require('../../assets/buildwise-light.png') },
  { id: 'vscode', nombre: 'Visual Studio Code', svg: svgDe('VS Code') },
  { id: 'debian', nombre: 'Debian', svg: svgDe('Debian') },
  { id: 'microsoft', nombre: 'Microsoft', svg: svgDe('Microsoft 365') },
  { id: 'linux', nombre: 'Linux', svg: LOGOS_PLATAFORMA.linux },
].filter((l) => l.imagen || l.svg);

// Cada tramo lleva la lista dos veces para que llene pantallas anchas; la cinta pinta
// dos tramos seguidos y se recorre un tramo completo, asi el salto no se nota.
const TRAMO = [...LOGOS, ...LOGOS];

function Logo({ logo, chico, color }) {
  const alto = chico ? ALTO_CHICO : ALTO;
  if (logo.imagen) {
    // El logo de BuildWise ya trae su nombre: va solo, del mismo color que los demas.
    return (
      <Image
        source={logo.imagen}
        tintColor={color}
        resizeMode="contain"
        style={{ height: alto, width: alto * BUILDWISE_ASPECTO }}
        accessibilityLabel={`Logo de ${logo.nombre}`}
      />
    );
  }
  // Los demas son solo el simbolo: se arma "simbolo + nombre" para que se lean igual
  // que un logotipo completo.
  return (
    <View className={`flex-row items-center ${chico ? 'gap-2' : 'gap-3'}`}>
      <Image
        source={{ uri: svgUri(logo.svg) }}
        tintColor={color}
        resizeMode="contain"
        style={{ height: alto, width: alto }}
        accessibilityLabel={`Logo de ${logo.nombre}`}
      />
      <Text className={`font-plexsemibold ${chico ? 'text-lg' : 'text-2xl'}`} style={{ color }}>
        {logo.nombre}
      </Text>
    </View>
  );
}

export default function LogoCarrusel() {
  const x = useRef(new Animated.Value(0)).current;
  const [ancho, setAncho] = useState(0); // ancho de un tramo
  const [quieto, setQuieto] = useState(false); // reducir movimiento
  const correr = useRef(() => {});
  const chico = useWindowDimensions().width < 640;
  const { colorScheme } = useColorScheme();
  const color = colorScheme === 'dark' ? '#ffffff' : '#161616';

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((r) => vivo && setQuieto(!!r))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Avanza desde donde va hasta el final del tramo y vuelve a empezar.
  correr.current = () => {
    if (!ancho || quieto) return;
    x.stopAnimation((v) => {
      const falta = ancho + v; // v va de 0 a -ancho
      Animated.timing(x, {
        toValue: -ancho,
        duration: Math.max(0, (falta / VELOCIDAD) * 1000),
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) {
          x.setValue(0);
          correr.current();
        }
      });
    });
  };

  useEffect(() => {
    correr.current();
    return () => x.stopAnimation();
  }, [ancho, quieto, x]);

  const pausar = useCallback(() => x.stopAnimation(), [x]);
  const seguir = useCallback(() => correr.current(), []);

  // Los logos se desvanecen en las orillas (solo web: mascara de CSS). Con mascara, y no
  // con una capa encima, el fondo estrellado se sigue viendo igual en los bordes.
  const mascara = 'linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)';
  const orillas = Platform.OS === 'web' ? { maskImage: mascara, WebkitMaskImage: mascara } : null;

  return (
    <View className="w-full overflow-hidden bg-white py-16 dark:bg-carbon-black">

      <View className="mx-auto mb-10 w-full max-w-3xl items-center px-5">
        <Text className="font-plexsemibold text-xs uppercase tracking-[2px] text-carbon-blue">
          Construido con
        </Text>
        <Text className="mt-3 text-center font-plexlight text-2xl leading-9 text-carbon-black dark:text-white md:text-3xl md:leading-10">
          Herramientas de primer nivel, del editor al servidor
        </Text>
      </View>

      {quieto ? (
        <View className="flex-row flex-wrap items-center justify-center gap-x-14 gap-y-8 px-5" style={{ opacity: 0.9 }}>
          {LOGOS.map((l) => (
            <Logo key={l.id} logo={l} chico={chico} color={color} />
          ))}
        </View>
      ) : (
        <Pressable onHoverIn={pausar} onHoverOut={seguir} accessible={false} style={orillas}>
          <Animated.View style={{ flexDirection: 'row', opacity: 0.9, transform: [{ translateX: x }] }}>
            {[0, 1].map((t) => (
              <View
                key={t}
                className="flex-row items-center"
                onLayout={t === 0 ? (e) => setAncho(Math.round(e.nativeEvent.layout.width)) : undefined}
                accessibilityElementsHidden={t === 1}
                importantForAccessibility={t === 1 ? 'no-hide-descendants' : 'auto'}
              >
                {TRAMO.map((l, i) => (
                  <View key={`${l.id}-${i}`} style={{ marginRight: chico ? 40 : 64 }}>
                    <Logo logo={l} chico={chico} color={color} />
                  </View>
                ))}
              </View>
            ))}
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}
