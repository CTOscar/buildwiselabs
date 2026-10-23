import { View, Text, Pressable, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import Screen from '../components/ui/Screen';
import Button from '../components/ui/Button';
import CarbonTile from '../components/CarbonTile';
import HeroSpace from '../components/HeroSpace';
import LikeSection from '../components/LikeSection';
import FaqSection from '../components/FaqSection';
import LogoCarrusel from '../components/LogoCarrusel';
import { SERVICES, CARD_SERVICES, RECOMMENDED, PRODUCTS } from '../constants/services';

export default function HomeScreen({ navigation }) {
  const { colorScheme } = useColorScheme();
  const arrow = colorScheme === 'dark' ? '#f4f4f4' : '#161616';
  return (
    <Screen
      subfooter
      prefooter={<LogoCarrusel />}
      hero={(scrollY) => (
        <HeroSpace scrollY={scrollY} navigation={navigation} />
      )}
    >
      {/* RECOMENDADO */}
      <View className="pt-16" />
      <SectionTitle eyebrow="Novedades">Recomendado para ti</SectionTitle>
      <View className="mb-16 flex-row flex-wrap gap-px bg-carbon-gray20 dark:bg-carbon-gray90">
        {RECOMMENDED.map((r) => (
          <Pressable
            key={r.id}
            className="min-w-[220px] flex-1 bg-white dark:bg-carbon-black p-5 hover:bg-carbon-gray10 dark:hover:bg-carbon-gray90"
          >
            <Text className="font-plexsemibold text-xs uppercase tracking-wide text-carbon-blue">
              {r.tag}
            </Text>
            <Text className="mt-3 min-h-[72px] font-plex text-base leading-6 text-carbon-black dark:text-white">
              {r.title}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={arrow} />
          </Pressable>
        ))}
      </View>

      {/* SERVICIOS (tiles) */}
      <SectionTitle eyebrow="Lo que hacemos">Nuestros servicios</SectionTitle>
      <View className="mb-16 flex-row flex-wrap gap-px bg-carbon-gray20 dark:bg-carbon-gray90">
        {CARD_SERVICES.map((s, i) => (
          <View key={s.id} className="min-w-[260px] flex-1 basis-[45%]">
            <CarbonTile
              service={s}
              index={i}
              onPress={() => navigation.navigate('Servicio', { id: s.id })}
            />
          </View>
        ))}
      </View>

      {/* VITRINA DE SERVICIOS (estilo Astra) */}
      <ServiceShowcase navigation={navigation} />

      {/* PRODUCTOS */}
      <SectionTitle eyebrow="Productos">Tecnologia de vanguardia para tu negocio</SectionTitle>
      <View className="mb-16 flex-row flex-wrap gap-3">
        {PRODUCTS.map((p) => (
          <View
            key={p}
            className="border border-carbon-gray20 dark:border-carbon-gray90 px-4 py-3 hover:border-carbon-blue"
          >
            <Text className="font-plex text-base text-carbon-black dark:text-white">{p}</Text>
          </View>
        ))}
      </View>

      {/* LIKES */}
      <LikeSection />

      {/* PREGUNTAS FRECUENTES */}
      <FaqSection navigation={navigation} />

      {/* CTA FINAL: sin fondo propio, solo el contorno sobre el color de la pagina */}
      <View className="mb-16 overflow-hidden rounded-3xl border border-carbon-gray20 dark:border-white/10">
        <View className="flex-row flex-wrap items-center justify-between gap-6 p-10 md:p-14">
          <View className="max-w-[480px]">
            <Text className="font-plex text-xs uppercase tracking-[2px] text-carbon-blue dark:text-carbon-star">
              Hablemos
            </Text>
            <Text className="mt-3 font-plexlight text-3xl leading-10 text-carbon-black dark:text-white md:text-4xl md:leading-[48px]">
              Empecemos a construir la proxima etapa de tu empresa
            </Text>
          </View>
          <Button
            label="Contactar"
            variant={colorScheme === 'dark' ? 'pill' : 'pillInk'}
            onPress={() => navigation.navigate('Contacto')}
          />
        </View>
      </View>
    </Screen>
  );
}

// Etiquetas cortas para las pestanas de la vitrina.
const SHORT = {
  chatbot: 'Chatbot',
  automatizacion: 'Automatización',
  apps: 'Apps con IA',
  redes: 'Seguridad',
  'visor-reportes': 'Reportes',
  consultoria: 'Consultoría',
};

/** Selector tipo pildora + panel espacial con el servicio elegido. */
// Para el titulo de la vitrina: "Una plataforma, nueve capacidades".
const NUMEROS = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

function ServiceShowcase({ navigation }) {
  const [active, setActive] = useState(SERVICES[0].id);
  const s = SERVICES.find((x) => x.id === active) || SERVICES[0];
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  // El numero sale de la lista de servicios, asi no se queda viejo al agregar uno.
  const cuantos = NUMEROS[SERVICES.length] ?? SERVICES.length;

  // Sin fondo propio: va sobre el color normal de la pagina (blanco u oscuro segun el tema).
  return (
    <View className="mb-16">
      <View className="items-center px-5 pb-10 pt-12 md:px-10">
        <Text className="text-center font-plexlight text-3xl text-carbon-black dark:text-white md:text-4xl">
          Una plataforma, {cuantos} capacidades
        </Text>

        {/* Pestanas pildora */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-8 max-w-full"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <View className="flex-row gap-1 rounded-full border border-carbon-gray20 bg-carbon-gray10 p-1 dark:border-white/10 dark:bg-white/5">
            {SERVICES.map((x) => {
              const on = x.id === active;
              return (
                <Pressable
                  key={x.id}
                  onPress={() => setActive(x.id)}
                  className={`rounded-full px-4 py-2 ${
                    on ? 'bg-carbon-black dark:bg-white/15' : 'hover:bg-carbon-gray20 dark:hover:bg-white/5'
                  }`}
                >
                  <Text
                    className={`font-plexsemibold text-[13px] ${
                      on ? 'text-white' : 'text-carbon-gray70 dark:text-carbon-gray50'
                    }`}
                  >
                    {SHORT[x.id] || x.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Tarjeta del servicio activo */}
        <View className="mt-8 w-full max-w-3xl rounded-2xl border border-carbon-gray20 bg-carbon-gray10 p-8 dark:border-white/10 dark:bg-carbon-gray90">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-carbon-blue/10 dark:bg-white/10">
              <Ionicons name={s.icon} size={20} color={dark ? '#93a4c2' : '#9d6b99'} />
            </View>
            <Text className="font-plex text-xs uppercase tracking-[2px] text-carbon-blue dark:text-carbon-star">
              {s.tagline}
            </Text>
          </View>
          <Text className="mt-5 font-plexsemibold text-2xl text-carbon-black dark:text-white">{s.title}</Text>
          <Text className="mt-3 font-plexlight text-base leading-7 text-carbon-gray70 dark:text-carbon-gray20">
            {s.description}
          </Text>
          <Button
            label="Ver servicio"
            variant={dark ? 'pill' : 'pillInk'}
            className="mt-8 self-start"
            onPress={() => navigation.navigate('Servicio', { id: s.id })}
          />
        </View>
      </View>
    </View>
  );
}

function SectionTitle({ eyebrow, children }) {
  return (
    <View className="mb-8">
      <View className="mb-3 flex-row items-center gap-3">
        <View className="h-[2px] w-8 bg-carbon-blue" />
        {eyebrow ? (
          <Text className="font-plexsemibold text-xs uppercase tracking-[2px] text-carbon-blue">
            {eyebrow}
          </Text>
        ) : null}
      </View>
      <Text className="font-plexsemibold text-3xl leading-10 text-carbon-black dark:text-white">
        {children}
      </Text>
    </View>
  );
}
