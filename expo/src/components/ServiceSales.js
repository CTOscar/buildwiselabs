import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MALVA = '#9d6b99';

/*
 * Bloques de venta de un servicio. Salen del campo `venta` de cada servicio en
 * constants/services.js; si un servicio no lo trae, su pagina queda como antes.
 *
 * Van por separado (y no en un solo componente) porque el detalle los intercala con lo
 * que ya tenia -- la galeria, "Que hacemos" y "Que incluye" -- en el orden en que se
 * cuenta una venta: el problema, como se ve resuelto, como trabajamos y cuanto cuesta
 * empezar.
 */

function Titulo({ children, sub }) {
  return (
    <View className="mb-6">
      <Text className="font-plexsemibold text-2xl text-carbon-black dark:text-white">{children}</Text>
      {sub ? (
        <Text className="mt-2 max-w-2xl font-plex text-base leading-6 text-carbon-gray70 dark:text-carbon-gray20">{sub}</Text>
      ) : null}
    </View>
  );
}

/** Antes / despues: el problema de hoy al lado de como queda resuelto. */
export function Resolvemos({ problemas }) {
  if (!problemas?.length) return null;
  return (
    <View className="mb-16">
      <Titulo sub="Lo que hoy le quita horas a tu equipo, y cómo queda cuando corre solo.">Lo que resolvemos</Titulo>
      <View className="border-t border-carbon-gray20 dark:border-carbon-gray90">
        {problemas.map((p) => (
          <View key={p.antes} className="flex-row flex-wrap gap-x-8 gap-y-3 border-b border-carbon-gray20 py-5 dark:border-carbon-gray90">
            <View className="min-w-[260px] flex-1 flex-row gap-3">
              <Ionicons name="close-circle" size={20} color="#8d8d8d" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="font-plexsemibold text-xs uppercase tracking-wide text-carbon-gray50">Hoy</Text>
                <Text className="mt-1 font-plex text-base leading-6 text-carbon-gray70 dark:text-carbon-gray20">{p.antes}</Text>
              </View>
            </View>
            <View className="min-w-[260px] flex-1 flex-row gap-3">
              <Ionicons name="checkmark-circle" size={20} color={MALVA} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="font-plexsemibold text-xs uppercase tracking-wide text-carbon-blue">Con BuildWise</Text>
                <Text className="mt-1 font-plex text-base leading-6 text-carbon-black dark:text-white">{p.despues}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Ejemplos concretos de lo que se automatiza. */
export function Casos({ casos }) {
  if (!casos?.length) return null;
  return (
    <View className="mb-16">
      <Titulo sub="Algunos de los procesos que más pedimos. Si el tuyo no está, igual se puede.">Casos de uso</Titulo>
      <View className="flex-row flex-wrap gap-px bg-carbon-gray20 dark:bg-carbon-gray90">
        {casos.map((c) => (
          <View key={c.titulo} className="min-w-[260px] flex-1 basis-[45%] bg-white p-6 dark:bg-carbon-black">
            <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(157,107,153,0.14)' }}>
              <Ionicons name={c.icon} size={22} color={MALVA} />
            </View>
            <Text className="mt-4 font-plexsemibold text-lg text-carbon-black dark:text-white">{c.titulo}</Text>
            <Text className="mt-2 font-plex text-sm leading-5 text-carbon-gray70 dark:text-carbon-gray20">{c.texto}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Como trabajamos, en pasos numerados. */
export function Proceso({ pasos }) {
  if (!pasos?.length) return null;
  return (
    <View className="mb-16">
      <Titulo>Cómo trabajamos</Titulo>
      <View className="flex-row flex-wrap gap-6">
        {pasos.map((p, i) => (
          <View key={p.titulo} className="min-w-[200px] flex-1">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-carbon-blue">
                <Text className="font-plexsemibold text-sm text-white">{i + 1}</Text>
              </View>
              {i < pasos.length - 1 ? <View className="h-px flex-1 bg-carbon-gray20 dark:bg-carbon-gray90" /> : null}
            </View>
            <Text className="mt-4 font-plexsemibold text-base text-carbon-black dark:text-white">{p.titulo}</Text>
            <Text className="mt-2 font-plex text-sm leading-5 text-carbon-gray70 dark:text-carbon-gray20">{p.texto}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Paquetes para empezar. Sin precios a proposito: cada uno se cotiza segun el proceso,
 * y un precio fijo en la pagina solo sirve para que alguien descarte antes de hablar.
 */
export function Paquetes({ paquetes, onContact }) {
  if (!paquetes?.length) return null;
  return (
    <View className="mb-16">
      <Titulo sub="Empieza por un proceso y crece sobre lo que ya funciona. Cada paquete se cotiza según tu caso.">
        Formas de empezar
      </Titulo>
      <View className="flex-row flex-wrap gap-4">
        {paquetes.map((p) => (
          <View
            key={p.nombre}
            className={`min-w-[250px] flex-1 rounded-xl border p-6 ${
              p.destacado ? 'border-carbon-blue bg-carbon-night' : 'border-carbon-gray20 bg-white dark:border-carbon-gray90 dark:bg-carbon-black'
            }`}
            style={p.destacado ? { borderWidth: 2 } : undefined}
          >
            {p.destacado ? (
              <View className="mb-3 self-start rounded-full bg-carbon-blue px-3 py-1">
                <Text className="font-plexsemibold text-[11px] uppercase tracking-wide text-white">Recomendado</Text>
              </View>
            ) : null}
            <Text className={`font-plexsemibold text-xl ${p.destacado ? 'text-white' : 'text-carbon-black dark:text-white'}`}>{p.nombre}</Text>
            <Text className={`mt-2 font-plex text-sm leading-5 ${p.destacado ? 'text-carbon-gray20' : 'text-carbon-gray70 dark:text-carbon-gray20'}`}>
              {p.para}
            </Text>
            <View className="mt-5 gap-3">
              {p.incluye.map((x) => (
                <View key={x} className="flex-row gap-2">
                  <Ionicons name="checkmark" size={18} color={MALVA} />
                  <Text className={`flex-1 font-plex text-sm leading-5 ${p.destacado ? 'text-white' : 'text-carbon-black dark:text-white'}`}>{x}</Text>
                </View>
              ))}
            </View>
            <Pressable
              onPress={onContact}
              className={`mt-6 self-start flex-row items-center gap-2 rounded-full px-5 py-2.5 ${
                p.destacado ? 'bg-carbon-blue hover:bg-carbon-bluehover' : 'border border-carbon-blue hover:bg-carbon-gray10 dark:hover:bg-carbon-gray90'
              }`}
            >
              <Text className={`font-plexsemibold text-sm ${p.destacado ? 'text-white' : 'text-carbon-blue'}`}>Cotizar</Text>
              <Ionicons name="arrow-forward" size={16} color={p.destacado ? '#ffffff' : MALVA} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function Pregunta({ q, a }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <View className="border-b border-carbon-gray20 dark:border-carbon-gray90">
      <Pressable
        onPress={() => setAbierta((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        className="flex-row items-center justify-between gap-4 py-5"
      >
        <Text className="flex-1 font-plexsemibold text-base text-carbon-black dark:text-white">{q}</Text>
        <Ionicons name={abierta ? 'chevron-up' : 'chevron-down'} size={18} color="#8d8d8d" />
      </Pressable>
      {abierta ? (
        <Text className="pb-5 font-plex text-base leading-6 text-carbon-gray70 dark:text-carbon-gray20">{a}</Text>
      ) : null}
    </View>
  );
}

/** Preguntas frecuentes del servicio, desplegables. */
export function Preguntas({ faq }) {
  if (!faq?.length) return null;
  return (
    <View className="mb-16">
      <Titulo>Preguntas frecuentes</Titulo>
      <View className="border-t border-carbon-gray20 dark:border-carbon-gray90">
        {faq.map((f) => (
          <Pregunta key={f.q} q={f.q} a={f.a} />
        ))}
      </View>
    </View>
  );
}

/** Cierre: la invitacion a hablar, con la pregunta que abre la conversacion. */
export function Cierre({ texto, onContact }) {
  if (!texto) return null;
  return (
    <View className="mb-16 flex-row flex-wrap items-center justify-between gap-6 rounded-xl bg-carbon-night p-8">
      <Text className="min-w-[260px] max-w-2xl flex-1 font-plexlight text-2xl leading-9 text-white">{texto}</Text>
      <Pressable onPress={onContact} className="flex-row items-center gap-2 rounded-full bg-carbon-blue px-6 py-3 hover:bg-carbon-bluehover">
        <Text className="font-plexsemibold text-sm text-white">Hablemos</Text>
        <Ionicons name="arrow-forward" size={16} color="#ffffff" />
      </Pressable>
    </View>
  );
}
