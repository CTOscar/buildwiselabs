import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { WebView } from 'react-native-webview';

import NavBar from '../components/NavBar';
import { LABS_DOCS, LABS_DOCS_URL } from '../constants/labs';

/**
 * Labs: solo la documentacion, a pantalla completa, con su menu lateral (Tools, Chatbot
 * PYME...). El contenido es el sitio de Docusaurus de labs-docs/, ya compilado en
 * public/labs-docs; se carga aqui debajo de la barra del sitio. Docusaurus esconde su
 * propia barra y su pie cuando esta dentro de esta pagina (labs-docs/src/embebido.js).
 *
 * ?p=chatbot abre directo esa pagina de la documentacion (lo usa el boton
 * "Documentacion en Labs" de cada servicio).
 */
export default function LabsScreen({ route }) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const tema = colorScheme === 'dark' ? 'dark' : 'light';
  const pagina = route?.params?.p;
  // Las paginas se piden con .html: asi se encuentran igual con "expo start" que publicadas.
  const archivo = pagina ? `${pagina}.html` : '';
  const query = `?docusaurus-theme=${tema}`;

  return (
    <View className="flex-1 bg-white dark:bg-carbon-black" style={{ paddingTop: insets.top }}>
      <NavBar />
      <View style={{ flex: 1 }}>
        {Platform.OS === 'web' ? (
          <iframe
            key={`${tema}-${archivo}`}
            src={`${LABS_DOCS}${archivo}${query}`}
            title="Documentación de Labs"
            style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
          />
        ) : (
          <WebView source={{ uri: `${LABS_DOCS_URL}${archivo}${query}` }} style={{ flex: 1 }} />
        )}
      </View>
    </View>
  );
}
