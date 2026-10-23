import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Carrusel de tarjetas sueltas: se ven varias a la vez, separadas, y avanza de una en
 * una con las flechas, los puntos o el dedo.
 *
 * Cuantas caben lo decide el ancho disponible y no un numero fijo: en el escritorio
 * entran dos y en el telefono una, sin tener que escribir dos veces la misma pantalla.
 * Por eso el ancho se mide con onLayout en vez de fijarlo.
 *
 * @param items       lista de elementos.
 * @param renderItem  (item, indice) => contenido de la tarjeta.
 * @param anchoMin    ancho minimo de una tarjeta; de ahi sale cuantas caben.
 * @param separacion  hueco entre tarjetas.
 * @param auto        ms entre avances automaticos; 0 lo apaga.
 * @param etiqueta    nombre para lectores de pantalla.
 */
export default function Carrusel({
  items = [],
  renderItem,
  anchoMin = 360,
  separacion = 20,
  auto = 7000,
  etiqueta = 'Carrusel',
}) {
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState(0);
  const scroll = useRef(null);
  const ultimoToque = useRef(0);

  const porVista = ancho
    ? Math.max(1, Math.min(items.length, Math.floor((ancho + separacion) / (anchoMin + separacion))))
    : 1;
  // Las tarjetas no se reparten el ancho exacto: se les descuenta un trozo para que la
  // siguiente asome por la derecha. Eso hace dos cosas de una vez -- se ve que son piezas
  // sueltas y no un bloque, y se entiende sin instrucciones que hay mas de lado.
  const asoma = items.length > porVista ? 0.35 : 0;
  const anchoTarjeta = ancho ? (ancho - separacion * (porVista + asoma - 1)) / (porVista + asoma) : 0;
  const paso = anchoTarjeta + separacion;
  const anchoTotal = items.length * anchoTarjeta + (items.length - 1) * separacion;
  const maxScroll = Math.max(0, anchoTotal - ancho);
  // Hasta donde se puede avanzar de verdad, en pasos de una tarjeta.
  const maxIndice = paso ? Math.ceil(maxScroll / paso) : 0;

  const irA = (n, animado = true) => {
    if (!ancho || !items.length) return;
    const k = n > maxIndice ? 0 : Math.max(0, n);
    setActivo(k);
    scroll.current?.scrollTo({ x: Math.min(k * paso, maxScroll), animated: animado });
  };

  // Lo que mueve la persona marca la hora, para que el avance automatico se aparte.
  const mover = (n) => {
    ultimoToque.current = Date.now();
    irA(n < 0 ? maxIndice : n);
  };

  // Si cambia el ancho (giro del telefono, ventana redimensionada) hay que recolocarse:
  // el desplazamiento esta en pixeles y dejaria una tarjeta cortada a la mitad.
  useEffect(() => {
    if (!ancho) return;
    const k = Math.min(activo, maxIndice);
    setActivo(k);
    scroll.current?.scrollTo({ x: Math.min(k * paso, maxScroll), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancho, porVista]);

  useEffect(() => {
    if (!auto || !ancho || maxIndice === 0) return undefined;
    const id = setInterval(() => {
      // Si acaban de deslizar o de usar las flechas, se espera una vuelta entera antes
      // de volver a avanzar solo: nada molesta mas que un carrusel que te quita de
      // encima la tarjeta que estabas leyendo.
      if (Date.now() - ultimoToque.current < auto) return;
      irA(activo + 1);
    }, auto);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, ancho, activo, maxIndice, paso]);

  const alSoltar = (e) => {
    ultimoToque.current = Date.now();
    const x = e.nativeEvent.contentOffset.x;
    if (paso) setActivo(Math.max(0, Math.min(maxIndice, Math.round(x / paso))));
  };

  const flecha = (icono, nombre, alPulsar, lado) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={nombre}
      onPress={alPulsar}
      className="items-center justify-center rounded-full border border-white/20 bg-carbon-night/85 hover:bg-carbon-night"
      style={{ position: 'absolute', top: '50%', marginTop: -20, [lado]: -6, height: 40, width: 40, zIndex: 2 }}
    >
      <Ionicons name={icono} size={20} color="#ffffff" />
    </Pressable>
  );

  const navega = maxIndice > 0 && ancho > 0;

  return (
    <View accessibilityLabel={etiqueta} onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}>
      <View>
        {ancho > 0 ? (
          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={paso}
            decelerationRate="fast"
            onMomentumScrollEnd={alSoltar}
            onScrollEndDrag={alSoltar}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {items.map((it, i) => (
              <View key={it.caption || i} style={{ width: anchoTarjeta, marginRight: i === items.length - 1 ? 0 : separacion }}>
                {renderItem(it, i)}
              </View>
            ))}
          </ScrollView>
        ) : null}

        {navega ? flecha('chevron-back', 'Anterior', () => mover(activo - 1), 'left') : null}
        {navega ? flecha('chevron-forward', 'Siguiente', () => mover(activo + 1), 'right') : null}
      </View>

      {/* La fila de puntos lleva su acomodo en "style" y no en clases: es una pieza de
          interfaz, no de apariencia, y asi no depende de que Tailwind haya generado esas
          clases para quedar centrada. */}
      {navega ? (
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {Array.from({ length: maxIndice + 1 }).map((_, i) => (
            <Pressable
              key={`p${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${i + 1} de ${maxIndice + 1}`}
              onPress={() => mover(i)}
              hitSlop={10}
              style={{
                height: 6,
                width: i === activo ? 22 : 6,
                borderRadius: 3,
                backgroundColor: i === activo ? '#9d6b99' : '#8d8d8d',
                opacity: i === activo ? 1 : 0.5,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
