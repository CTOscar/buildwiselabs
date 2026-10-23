import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, View } from 'react-native';

import Starfield from './ui/Starfield';
import FlujoNodos from './ui/FlujoNodos';

const MARK = require('../../assets/buildwise-mark.png');
const WEB = Platform.OS === 'web';

// Portadas propias por servicio. El que tenga una aqui la usa a sangre en vez del fondo
// espacial con el logotipo; el resto sigue igual que siempre.
//
// Hay dos formas: una imagen, o un componente que se dibuja y se anima solo.
//
// Las imagenes se recortan al centro (resizeMode "cover"), asi que lo importante tiene
// que quedar en la franja central: la tarjeta del listado es mas ancha que alta y en el
// detalle crece de alto, de modo que los extremos se pierden en uno u otro caso. Por eso
// los archivos estan preparados a 1440x600.
const PORTADAS_FOTO = {
  chatbot: require('../../assets/portada-chatbot.jpg'),
  redes: require('../../assets/portada-redes.jpg'),
  // Esta es una ilustracion sobre fondo claro: el lienzo se preparo con ese mismo gris
  // alrededor del dibujo, asi que los margenes no se leen como barras y el recorte
  // nunca se come la consola ni el cubo.
  apps: require('../../assets/portada-apps.jpg'),
  consultoria: require('../../assets/portada-consultoria.jpg'),
  // Estas cuatro son collages propios, dibujados por scripts/collage-portadas.py: sin
  // fotos ni logotipos de terceros. Para cambiarlas se edita el script y se vuelve
  // a generar (python scripts/collage-portadas.py), no se retocan los .jpg.
  monitoreo: require('../../assets/portada-monitoreo.jpg'),
  'visor-reportes': require('../../assets/portada-visor-reportes.jpg'),
  'bank-central': require('../../assets/portada-bank-central.jpg'),
  'cripto-world': require('../../assets/portada-cripto-world.jpg'),
};

// Portadas dibujadas. Automatizacion lleva el tablero de nodos con los pulsos corriendo:
// es SVG, asi que se ve nitido a cualquier tamano y pesa unos KB en vez de los megas de
// un video -- y no depende de que el navegador autorice la reproduccion automatica.
const PORTADAS_ANIMADAS = {
  automatizacion: FlujoNodos,
};

// Tono del resplandor por escena (paleta de la marca), para distinguir las
// imagenes sin agregar iconos: solo el logotipo sobre el fondo espacial.
const GLOW = {
  chatbot: '#9d6b99',
  automatizacion: '#7088b3',
  apps: '#b58ab1',
  redes: '#8a7fb8',
  'visor-reportes': '#6f9a8f',
  consultoria: '#93a4c2',
  monitoreo: '#6f9a8f',
  'bank-central': '#7088b3',
  'cripto-world': '#b58ab1',
};

/**
 * Imagen de marca de los servicios (tarjetas del Home y de Servicios, hero y
 * galeria del detalle): el simbolo de BuildWise Labs sobre el fondo espacial,
 * con un resplandor que late suavemente. Sin iconos ni fotos externas.
 * `scene` elige el tono del resplandor (galeria "En accion").
 */
export default function ServiceArt({ service, scene, height = 150, seed = 1, label }) {
  const id = scene || service.id;
  const glow = GLOW[id] || GLOW.chatbot;
  // Solo la PORTADA del servicio la lleva: la tarjeta del listado y el encabezado del
  // detalle, que llaman sin "scene". Las miniaturas de la galeria "En accion" si mandan
  // "scene", y ahi se deja el fondo espacial -- una misma escena aparece en las galerias
  // de varios servicios, asi que usarla repetiria la misma imagen por todo el sitio.
  const Animada = scene ? null : PORTADAS_ANIMADAS[service.id];
  const foto = scene ? null : PORTADAS_FOTO[service.id];
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(t, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    const start = setTimeout(() => loop.start(), (seed % 4) * 400);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [t, seed]);

  const mark = Math.round(height * 0.42);

  if (Animada || foto) {
    return (
      <View
        className="w-full overflow-hidden bg-carbon-night"
        style={{ height }}
        accessibilityRole="image"
        accessibilityLabel={`${label || service.title} · BuildWise Labs`}
      >
        {Animada ? <Animada height={height} /> : <Image source={foto} resizeMode="cover" style={{ width: '100%', height }} />}
      </View>
    );
  }

  return (
    <View
      className="w-full overflow-hidden bg-carbon-night"
      style={{ height }}
      accessibilityRole="image"
      accessibilityLabel={`${label || service.title} · BuildWise Labs`}
    >
      <Starfield count={28} seed={seed * 7 + 3} glow={false} />
      <View className="absolute inset-0 items-center justify-center">
        {/* Resplandor */}
        <Animated.View
          style={{
            position: 'absolute',
            width: mark * 2.4,
            height: mark * 2.4,
            borderRadius: mark * 1.2,
            backgroundColor: glow,
            opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.05] }) }],
            ...(WEB ? { filter: `blur(${Math.round(mark * 0.45)}px)` } : {}),
          }}
        />
        {/* Logotipo */}
        <Animated.Image
          source={MARK}
          resizeMode="contain"
          style={{
            width: mark,
            height: mark,
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
          }}
        />
      </View>
    </View>
  );
}
