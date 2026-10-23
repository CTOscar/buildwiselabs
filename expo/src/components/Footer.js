import { useState } from 'react';
import { View, Text, Pressable, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import BuildWiseLogo from './BuildWiseLogo';
import Button from './ui/Button';
import { CARD_SERVICES } from '../constants/services';
import { logoPlataforma } from '../constants/plataformas';

const KIRI_URL = 'https://trykiriinbox.com';

const SOCIALS = [
  { icon: 'logo-instagram', label: 'Instagram', url: 'https://instagram.com/buildwiselabs' },
  { icon: 'logo-linkedin',  label: 'LinkedIn',  url: 'https://linkedin.com/company/buildwiselabs' },
  { icon: 'logo-github',    label: 'GitHub',    url: 'https://github.com/buildwiselabs' },
  { icon: 'logo-whatsapp',  label: 'WhatsApp',  url: 'https://wa.me/521XXXXXXXXXX' },
];

// Accesos grandes de arriba: lo que mas se busca al llegar al final de la pagina.
const ACCESOS = [
  {
    icon: 'chatbubbles-outline',
    titulo: 'Chatbot inteligente',
    texto: 'Pregúntale a nuestro agente por texto o por voz.',
    ir: { route: 'Chatbot' },
  },
  {
    icon: 'flask-outline',
    titulo: 'Labs',
    texto: 'Guías de instalación, tools, soporte y compatibilidad.',
    ir: { route: 'Labs' },
  },
  {
    icon: 'document-text-outline',
    titulo: 'Visor de reportes',
    texto: 'Consulta los reportes de campo que genera el bot.',
    ir: { route: 'Reportes' },
  },
  {
    icon: 'mail-unread-outline',
    titulo: 'trykiriinbox.com',
    texto: 'Abre Kiri Inbox en otra pestaña.',
    ir: { url: KIRI_URL },
  },
];

// Paginas del sitio.
const EMPRESA = [
  { label: 'Nosotros', route: 'Nosotros' },
  { label: 'Todos los servicios', route: 'Servicios' },
  { label: 'Documentación', route: 'Docs' },
  { label: 'Labs', route: 'Labs' },
  { label: 'Contacto', route: 'Contacto' },
  { label: 'Iniciar sesión', route: 'Login' },
];

const HERRAMIENTAS = [
  { label: 'Chatbot', route: 'Chatbot' },
  { label: 'Visor de reportes', route: 'Reportes' },
  { label: 'trykiriinbox.com', url: KIRI_URL },
];

// Fuentes y plataformas externas que integramos en los proyectos. Van aparte de las
// paginas del sitio y se abren en otra pestana: son de terceros, no nuestras.
const RECURSOS = [
  { label: 'Banco Central (Banxico)', url: 'https://www.banxico.org.mx' },
  { label: 'Mercado cripto', url: 'https://www.coingecko.com' },
  { label: 'API de mapas', url: 'https://developers.google.com/maps' },
  { label: 'OpenStreetMap', url: 'https://www.openstreetmap.org' },
  { label: 'Datos del clima', url: 'https://open-meteo.com' },
  { label: 'n8n', url: 'https://n8n.io' },
  { label: 'Ollama', url: 'https://ollama.com' },
  { label: 'Open WebUI', url: 'https://openwebui.com' },
];

// Grupos de la documentacion de Labs. `p` es la pagina dentro de Labs (la misma ruta
// que tiene en labs-docs/docs, sin el .md). Si se agrega una pagina alla, se suma aqui.
const LABS = [
  {
    titulo: 'Primeros pasos',
    enlaces: [
      { label: 'Requisitos previos', p: 'iniciar/requisitos' },
      { label: 'Instalación paso a paso', p: 'chatbot/instalacion' },
      { label: 'Cómo levantar un bot', p: 'iniciar/levantar-bot' },
      { label: 'Configuración inicial', p: 'chatbot/configuracion' },
      { label: 'Primer mensaje de prueba', p: 'iniciar/primer-mensaje' },
    ],
  },
  {
    titulo: 'Tools',
    enlaces: [
      { label: 'APIs disponibles', p: 'tools/apis' },
      { label: 'Integraciones n8n', p: 'tools/n8n' },
      { label: 'Plugins de voz', p: 'tools/voz' },
      { label: 'Procesamiento de Excel', p: 'tools/excel' },
      { label: 'Webhooks', p: 'tools/webhooks' },
    ],
  },
  {
    titulo: 'Uso y operación',
    enlaces: [
      { label: 'Chat por texto y voz', p: 'chatbot/uso/chat' },
      { label: 'Reportes de campo', p: 'chatbot/uso/reportes-de-campo' },
      { label: 'Análisis de Excel', p: 'chatbot/uso/analisis-excel' },
      { label: 'OpenWebUI', p: 'chatbot/uso/openwebui' },
      { label: 'Referencia de la API', p: 'chatbot/referencia/api' },
      { label: 'Despliegue', p: 'chatbot/operacion/despliegue' },
    ],
  },
  {
    titulo: 'Soporte',
    enlaces: [
      { label: 'Preguntas frecuentes', p: 'soporte/preguntas-frecuentes' },
      { label: 'Solución de problemas', p: 'chatbot/operacion/solucion-de-problemas' },
      { label: 'Reportar un problema', p: 'soporte/reportar-problema' },
      { label: 'Tiempo de respuesta', p: 'soporte/tiempo-respuesta' },
      { label: 'Contacto directo', p: 'soporte/contacto' },
    ],
  },
  {
    titulo: 'Aprende',
    enlaces: [
      { label: 'Descripción general', p: 'chatbot' },
      { label: 'Tutoriales en video', p: 'educacion/tutoriales' },
      { label: 'Guía de prompts', p: 'educacion/guia-de-prompts' },
      { label: 'Ejemplos prácticos', p: 'educacion/ejemplos' },
      { label: 'Certificación básica', p: 'educacion/certificacion' },
      { label: 'Glosario de términos', p: 'documentacion/glosario' },
    ],
  },
  {
    titulo: 'Comunidad',
    enlaces: [
      { label: 'Foro de usuarios', p: 'comunidad/foro' },
      { label: 'Canal de Discord', p: 'comunidad/discord' },
      { label: 'Casos de uso compartidos', p: 'comunidad/casos-de-uso' },
      { label: 'Contribuir al proyecto', p: 'comunidad/contribuir' },
      { label: 'Hoja de ruta', p: 'orientaciones/hoja-de-ruta' },
    ],
  },
  {
    titulo: 'Orientaciones',
    enlaces: [
      { label: 'Arquitectura del sistema', p: 'documentacion/arquitectura' },
      { label: 'Buenas prácticas', p: 'orientaciones/buenas-practicas' },
      { label: 'Seguridad y privacidad', p: 'orientaciones/seguridad' },
      { label: 'Limitaciones conocidas', p: 'orientaciones/limitaciones' },
    ],
  },
  {
    titulo: 'Compatibilidad',
    enlaces: [
      { label: 'Sistemas operativos', p: 'compatibilidad/sistemas-operativos' },
      { label: 'Kernels', p: 'compatibilidad/kernels' },
      { label: 'Procesadores', p: 'compatibilidad/procesadores' },
      { label: 'GPU recomendadas', p: 'compatibilidad/gpu' },
      { label: 'RAM mínima', p: 'compatibilidad/ram' },
      { label: 'Requisitos de red', p: 'compatibilidad/red' },
    ],
  },
];

// Franja "Funciona en", acomodada como el pie de electronjs.org: solo los logos, sin
// recuadros ni frases; servidor a la izquierda y navegadores a la derecha. Resume
// labs-docs/docs/compatibilidad/sistemas-operativos.md, que tiene el detalle.
const FUNCIONA_EN = [
  {
    id: 'servidor',
    items: [
      { logo: 'linux', label: 'Linux' },
      { logo: 'windows', label: 'Windows' },
      { logo: 'macos', label: 'macOS' },
      { logo: 'docker', label: 'Docker' },
    ],
  },
  {
    id: 'navegadores',
    items: [
      { logo: 'chrome', label: 'Chrome' },
      { logo: 'edge', label: 'Edge' },
      { logo: 'safari', label: 'Safari' },
      { logo: 'firefox', label: 'Firefox' },
    ],
  },
];

export default function Footer({ onArriba }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  // En pantallas angostas las columnas se pliegan: son muchas y el pie se haria eterno.
  const plegable = width < 640;

  const abrir = (url) => {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  };
  const ir = (destino) => (destino.url ? abrir(destino.url) : navigation.navigate(destino.route));
  const labs = (p) => navigation.navigate('Labs', p ? { p } : undefined);

  return (
    <View className="w-full bg-carbon-black px-5 pb-10 pt-16">
      <View className="mx-auto w-full max-w-6xl">
        {/* Llamada a la accion: el footer es el final de cada pagina, y quien llega
            hasta aqui leyendo es justo a quien hay que darle por donde seguir. */}
        <View className="mb-12 flex-row flex-wrap items-center justify-between gap-6 border-b border-carbon-gray90 pb-12">
          <View className="min-w-[280px] flex-1">
            <Text className="font-plexlight text-3xl leading-10 text-white">
              ¿Listo para automatizar tu operación?
            </Text>
            <Text className="mt-3 max-w-lg font-plex text-sm leading-6 text-carbon-gray50">
              Cuéntanos qué necesitas y te respondemos con una propuesta concreta.
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <Button label="Ver servicios" variant="pillDark" onPress={() => navigation.navigate('Servicios')} />
            <Button label="Hablemos" variant="pill" onPress={() => navigation.navigate('Contacto')} />
          </View>
        </View>

        {/* Accesos rapidos */}
        <View className="mb-14 flex-row flex-wrap gap-4">
          {ACCESOS.map((a) => (
            <Pressable
              key={a.titulo}
              onPress={() => ir(a.ir)}
              className="min-w-[220px] flex-1 border border-carbon-gray90 p-5 hover:border-carbon-blue hover:bg-carbon-gray90"
            >
              <View className="flex-row items-center justify-between">
                <Ionicons name={a.icon} size={22} color="#c99ec5" />
                <Ionicons name={a.ir.url ? 'open-outline' : 'arrow-forward'} size={16} color="#6f6f6f" />
              </View>
              <Text className="mt-4 font-plexsemibold text-base text-white">{a.titulo}</Text>
              <Text className="mt-1 font-plex text-sm leading-5 text-carbon-gray50">{a.texto}</Text>
            </Pressable>
          ))}
        </View>

        {/* Marca a la izquierda y, junto a ella, todas las columnas: las del sitio y las
            de la documentacion de Labs, en una sola cuadricula. */}
        <View className="flex-row flex-wrap">
          <View className={`min-w-[240px] flex-1 pr-8 ${plegable ? 'pb-8' : ''}`}>
            <BuildWiseLogo height={28} variant="light" />
            <Text className="mt-4 max-w-xs font-plex text-sm leading-6 text-carbon-gray50">
              Diseñamos sistemas inteligentes que automatizan operaciones y
              hacen crecer negocios.
            </Text>
            <View className="mt-6 flex-row gap-2">
              {SOCIALS.map((s) => (
                <Pressable
                  key={s.label}
                  onPress={() => abrir(s.url)}
                  accessibilityLabel={s.label}
                  className="h-10 w-10 items-center justify-center border border-carbon-gray90 hover:border-carbon-blue hover:bg-carbon-gray90"
                >
                  <Ionicons name={s.icon} size={18} color="#c6c6c6" />
                </Pressable>
              ))}
            </View>
          </View>

          <View className={`min-w-[280px] flex-[3.6] flex-row flex-wrap ${plegable ? '' : 'gap-y-10'}`}>
            <Columna title="Servicios" plegable={plegable}>
              {CARD_SERVICES.map((s) => (
                <Enlace
                  key={s.id}
                  label={s.title}
                  onPress={() => navigation.navigate('Servicio', { id: s.id })}
                />
              ))}
            </Columna>

            <Columna title="Empresa" plegable={plegable}>
              {EMPRESA.map((c) => (
                <Enlace key={c.route} label={c.label} onPress={() => navigation.navigate(c.route)} />
              ))}
            </Columna>

            <Columna title="Herramientas" plegable={plegable}>
              {HERRAMIENTAS.map((h) => (
                <Enlace key={h.label} label={h.label} externo={!!h.url} onPress={() => ir(h)} />
              ))}
            </Columna>

            <Columna title="Recursos" plegable={plegable}>
              {RECURSOS.map((r) => (
                <Enlace key={r.url} label={r.label} externo onPress={() => abrir(r.url)} />
              ))}
            </Columna>

            {/* Documentacion de Labs: un enlace por pagina, agrupados como el menu de Labs */}
            {LABS.map((g) => (
              <Columna key={g.titulo} title={g.titulo} plegable={plegable}>
                {g.enlaces.map((e) => (
                  <Enlace key={e.p} label={e.label} onPress={() => labs(e.p)} />
                ))}
              </Columna>
            ))}
          </View>
        </View>

        {/* Funciona en */}
        {/* Funciona en: izquierda y derecha, como el pie de electronjs.org. En el movil
            van uno debajo del otro y alineados a la izquierda; la ultima columna plegada
            ya trae su linea, asi que aqui no se repite. */}
        <View
          className={`flex-row flex-wrap justify-between gap-x-10 gap-y-8 ${
            plegable ? 'mt-10' : 'mt-14 border-t border-carbon-gray90 pt-10'
          }`}
        >
          {FUNCIONA_EN.map((f, i) => {
            const derecha = i === 1 && !plegable;
            return (
              <View
                key={f.id}
                className={`min-w-0 max-w-full shrink ${plegable ? 'w-full' : ''} ${derecha ? 'items-end' : 'items-start'}`}
              >
                <Pressable
                  onPress={() => labs('compatibilidad/sistemas-operativos')}
                  accessibilityLabel={`Compatible con ${f.items.map((it) => it.label).join(', ')}`}
                  className={`max-w-full flex-row flex-wrap items-center gap-x-7 gap-y-4 hover:opacity-80 ${
                    derecha ? 'justify-end' : ''
                  }`}
                >
                  {f.items.map((it) => (
                    <View key={it.label} className="flex-row items-center gap-2">
                      <Image
                        source={{ uri: logoPlataforma(it.logo) }}
                        style={{ width: 30, height: 30 }}
                        resizeMode="contain"
                        accessibilityLabel={`Logo de ${it.label}`}
                      />
                      <Text className="font-plexsemibold text-lg text-carbon-gray20">{it.label}</Text>
                    </View>
                  ))}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View className="mt-14 flex-row flex-wrap items-center justify-between gap-4 border-t border-carbon-gray90 pt-6">
          <View className="min-w-0 shrink flex-row flex-wrap items-center gap-x-5 gap-y-2">
            <Text className="font-plex text-xs text-carbon-gray50">
              © {new Date().getFullYear()} BuildWise Labs. Todos los derechos reservados.
            </Text>
            <Text className="font-plex text-xs text-carbon-gray50">Hecho en México</Text>
            <View className="flex-row items-center gap-1">
              <Ionicons name="globe-outline" size={12} color="#8d8d8d" />
              <Text className="font-plex text-xs text-carbon-gray50">Español (México)</Text>
            </View>
          </View>
          <View className="min-w-0 shrink flex-row flex-wrap items-center gap-x-5 gap-y-2">
            <Pressable onPress={() => navigation.navigate('Nosotros')}>
              <Text className="font-plex text-xs text-carbon-gray50 hover:text-white">Nosotros</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Contacto')}>
              <Text className="font-plex text-xs text-carbon-gray50 hover:text-white">Contacto</Text>
            </Pressable>
            <Pressable onPress={() => labs('soporte/preguntas-frecuentes')}>
              <Text className="font-plex text-xs text-carbon-gray50 hover:text-white">Ayuda</Text>
            </Pressable>
            {onArriba ? (
              <Pressable
                onPress={onArriba}
                accessibilityLabel="Volver arriba"
                className="flex-row items-center gap-1 border border-carbon-gray90 px-3 py-1.5 hover:border-carbon-blue"
              >
                <Ionicons name="arrow-up" size={12} color="#c6c6c6" />
                <Text className="font-plex text-xs text-carbon-gray20">Volver arriba</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Columna de enlaces. Con `plegable` (pantallas angostas) el titulo abre y cierra la
 * lista; en pantallas anchas siempre se ve completa.
 */
function Columna({ title, children, plegable }) {
  const [abierta, setAbierta] = useState(false);
  const titulo = (
    <Text className="font-plexsemibold text-xs uppercase tracking-[2px] text-white">{title}</Text>
  );

  if (plegable) {
    return (
      <View className="w-full border-b border-carbon-gray90 py-4">
        <Pressable
          onPress={() => setAbierta((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: abierta }}
          className="flex-row items-center justify-between py-1"
        >
          {titulo}
          <Ionicons name={abierta ? 'chevron-up' : 'chevron-down'} size={16} color="#8d8d8d" />
        </Pressable>
        {abierta ? <View className="mt-4 gap-3">{children}</View> : null}
      </View>
    );
  }

  return (
    <View className="min-w-[170px] basis-1/4 pr-6">
      <View className="mb-4">{titulo}</View>
      <View className="gap-3">{children}</View>
    </View>
  );
}

/** Un enlace del footer. `externo` marca los que salen del sitio, con su flechita. */
function Enlace({ label, onPress, externo }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1.5 self-start">
      <Text className="font-plex text-sm text-carbon-gray50 hover:text-white">{label}</Text>
      {externo ? <Ionicons name="open-outline" size={12} color="#6f6f6f" /> : null}
    </Pressable>
  );
}
