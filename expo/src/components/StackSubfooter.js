import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useNavigation } from '@react-navigation/native';

import { TOOLS, ToolDetail, svgUri, themed } from './ToolsGrid';
import { STACK_APPS } from '../constants/stackApps';

/*
 * Subfooter del inicio (solo ahi: Screen lo muestra cuando la pantalla pasa `subfooter`).
 * Sigue el acomodo de la seccion "Apps users love, built with Electron" de
 * electronjs.org: titulo centrado, una frase, fichas con logo y nombre centradas en
 * renglones y un boton "Ver mas" al final.
 */

// Que se muestra y en que orden: primero las aplicaciones del dia a dia, luego las
// herramientas de desarrollo y de mercados. La infraestructura de red (Cisco, Juniper, GNS3, Nginx,
// Cloudflare, Vercel) ya no va aqui; su documentacion sigue en Docs.
const ORDEN = [
  'Discord', 'Postman', 'VS Code', 'Slack', 'PostgreSQL', 'GitHub', 'Notion', 'Jira',
  'Visual Studio', 'Microsoft 365', 'Linux', 'Debian',
  'Git', 'MetaTrader 5', 'TypeScript', 'Python', 'Expo', 'Tailwind CSS', 'TradingView',
];
const POR_NOMBRE = Object.fromEntries([...TOOLS, ...STACK_APPS].map((t) => [t.name, t]));
const LISTA = ORDEN.map((n) => POR_NOMBRE[n]).filter(Boolean);

function Ficha({ tool: raw, activa, onPress }) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const tool = themed(raw, dark);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: activa }}
      accessibilityLabel={`${tool.name}: ${activa ? 'ocultar' : 'ver'} cómo lo usamos`}
      className="flex-row items-center gap-4 rounded-2xl border px-6 py-5 hover:border-carbon-blue"
      style={{
        borderColor: activa ? tool.color : dark ? '#2c2c30' : '#e0e0e0',
        backgroundColor: activa ? `${tool.color}22` : dark ? '#18181b' : '#ffffff',
      }}
    >
      {/* Mas ancho que alto: varios logos son palabras (Babel, Expo). */}
      <Image source={{ uri: svgUri(tool.svg) }} style={{ width: 56, height: 42 }} resizeMode="contain" />
      <Text className="font-plexsemibold text-lg text-carbon-black dark:text-white">{tool.name}</Text>
    </Pressable>
  );
}

export default function StackSubfooter() {
  const navigation = useNavigation();
  const [abierta, setAbierta] = useState(null);
  const tool = LISTA.find((t) => t.name === abierta);

  return (
    <View className="w-full border-t border-carbon-gray20 bg-carbon-gray10 px-5 py-16 dark:border-carbon-gray90 dark:bg-[#101012]">
      <View className="mx-auto w-full max-w-5xl items-center">
        <Text className="text-center font-plexbold text-3xl leading-10 text-carbon-black dark:text-white">
          All users love BuildWise Labs, built with us
        </Text>
        <Text className="mt-3 max-w-2xl text-center font-plex text-base leading-6 text-carbon-gray70 dark:text-carbon-gray20">
          Las herramientas con las que construimos, publicamos y mantenemos cada proyecto. Toca una para ver cómo la usamos.
        </Text>

        {/* Fichas centradas en renglones, como en Electron. */}
        <View className="mt-10 flex-row flex-wrap justify-center gap-4" style={{ maxWidth: 1100 }}>
          {LISTA.map((t) => (
            <Ficha
              key={t.name}
              tool={t}
              activa={t.name === abierta}
              onPress={() => setAbierta(t.name === abierta ? null : t.name)}
            />
          ))}
        </View>

        {tool ? (
          <View className="w-full">
            <ToolDetail tool={tool} />
            <Pressable
              onPress={() => setAbierta(null)}
              className="mx-auto mt-4 flex-row items-center gap-1.5 px-3 py-2"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-up" size={16} color="#8d8d8d" />
              <Text className="font-plex text-sm text-carbon-gray70 dark:text-carbon-gray20">Cerrar</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate('Labs', { p: 'tools/apis' })}
          className="mt-8 flex-row items-center gap-2 rounded-full bg-carbon-blue px-5 py-2.5 hover:bg-carbon-bluehover"
        >
          <Text className="font-plexsemibold text-sm text-white">Ver más</Text>
          <Ionicons name="arrow-forward" size={15} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
