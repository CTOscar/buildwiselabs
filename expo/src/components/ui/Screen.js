import { useRef } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NavBar from '../NavBar';
import Footer from '../Footer';
import StackSubfooter from '../StackSubfooter';

/**
 * Layout base estilo IBM: barra superior fija, contenido con scroll y footer.
 * @param {(scrollY: Animated.Value) => React.ReactNode} [hero]
 *   Bloque a todo el ancho renderizado antes del contenido; recibe el
 *   desplazamiento vertical para animarse con el scroll.
 * @param {boolean} [subfooter] Muestra el stack de herramientas arriba del footer.
 *   Solo lo pide el inicio: dentro de los servicios y las demas paginas no va.
 */
export default function Screen({ children, hero, prefooter, subfooter = false }) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scroll = useRef(null);
  // "Volver arriba" del footer: el scroll es de este ScrollView, no de la ventana.
  const arriba = () => scroll.current?.scrollTo?.({ y: 0, animated: true });

  return (
    <View className="flex-1 bg-white dark:bg-carbon-black" style={{ paddingTop: insets.top }}>
      <NavBar />
      <Animated.ScrollView
        ref={scroll}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {hero ? hero(scrollY) : null}
        <View className="mx-auto w-full max-w-5xl px-5">{children}</View>
        {prefooter ?? null}
        {subfooter ? <StackSubfooter /> : null}
        <Footer onArriba={arriba} />
      </Animated.ScrollView>
    </View>
  );
}
