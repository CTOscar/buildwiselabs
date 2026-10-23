import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import Screen from '../components/ui/Screen';
import Button from '../components/ui/Button';
import Starfield from '../components/ui/Starfield';
import { CASES, PRODUCTS } from '../constants/services';

// Como trabajamos. Son tres y no diez a proposito: una pagina de "nosotros" que enumera
// quince virtudes no dice nada.
const PILARES = [
  {
    icon: 'search-outline',
    title: 'Primero entender',
    text: 'Antes de proponer herramientas vemos como trabaja tu equipo hoy, con que archivos y en que pasos se pierde el tiempo.',
  },
  {
    icon: 'construct-outline',
    title: 'Construir en pequeño',
    text: 'Arrancamos por el proceso que mas duele y lo dejamos funcionando. Lo demas se suma encima de algo que ya da resultado.',
  },
  {
    icon: 'people-outline',
    title: 'Dejarlo andando',
    text: 'Entregamos con capacitacion y documentacion, para que tu equipo pueda operarlo y cambiarlo sin depender de nosotros.',
  },
];

export default function AboutScreen() {
  const navigation = useNavigation();

  const hero = () => (
    <View className="w-full overflow-hidden bg-carbon-night">
      <Starfield count={70} seed={11} />
      <View className="mx-auto w-full max-w-5xl px-5 py-16">
        <Text className="font-plexsemibold text-xs uppercase tracking-wide text-carbon-blue">
          Nosotros
        </Text>
        <Text className="mt-3 max-w-3xl font-plexlight text-4xl leading-[46px] text-white">
          Un laboratorio de software en México, enfocado en PYMES
        </Text>
        <Text className="mt-4 max-w-2xl font-plex text-lg leading-7 text-carbon-gray20">
          BuildWise Labs nacio de una idea simple: la mayoria de las empresas no necesitan
          mas software, necesitan que el que ya usan deje de darles trabajo. Automatizamos
          procesos, conectamos sistemas que no se hablaban y ponemos inteligencia artificial
          donde de verdad ahorra horas.
        </Text>
      </View>
    </View>
  );

  return (
    <Screen hero={hero}>
      <Text className="mb-6 mt-16 font-plexsemibold text-2xl text-carbon-black dark:text-white">
        Como trabajamos
      </Text>
      <View className="mb-16 flex-row flex-wrap gap-px bg-carbon-gray20 dark:bg-carbon-gray90">
        {PILARES.map((p) => (
          <View key={p.title} className="min-w-[240px] flex-1 bg-white p-6 dark:bg-carbon-black">
            <Ionicons name={p.icon} size={28} color="#9d6b99" />
            <Text className="mt-4 font-plexsemibold text-lg text-carbon-black dark:text-white">
              {p.title}
            </Text>
            <Text className="mt-2 font-plex text-sm leading-5 text-carbon-gray70 dark:text-carbon-gray20">
              {p.text}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mb-6 font-plexsemibold text-2xl text-carbon-black dark:text-white">
        Resultados
      </Text>
      <View className="mb-16 flex-row flex-wrap gap-6">
        {CASES.map((c) => (
          <View key={c.id} className="min-w-[220px] flex-1 border-t-2 border-carbon-blue pt-4">
            <Text className="font-plexlight text-4xl text-carbon-black dark:text-white">{c.metric}</Text>
            <Text className="mt-2 font-plex text-sm leading-5 text-carbon-gray70 dark:text-carbon-gray20">
              {c.text}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mb-6 font-plexsemibold text-2xl text-carbon-black dark:text-white">
        Lo que construimos
      </Text>
      <View className="mb-16 flex-row flex-wrap gap-2">
        {PRODUCTS.map((p) => (
          <View
            key={p}
            className="rounded-full border border-carbon-gray20 px-4 py-2 dark:border-carbon-gray90"
          >
            <Text className="font-plex text-sm text-carbon-black dark:text-white">{p}</Text>
          </View>
        ))}
      </View>

      <View className="mb-20 border-t border-carbon-gray20 pt-10 dark:border-carbon-gray90">
        <Text className="max-w-2xl font-plexlight text-2xl leading-9 text-carbon-black dark:text-white">
          Si tienes un proceso que se hace a mano todas las semanas, probablemente se pueda
          automatizar. Cuentanos cual es.
        </Text>
        <Button
          label="Hablemos de tu proyecto"
          variant="pill"
          className="mt-6 self-start"
          onPress={() => navigation.navigate('Contacto')}
        />
      </View>
    </Screen>
  );
}
