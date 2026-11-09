# Migración de datos simulados (MOCK) a GPS real

**Proyecto:** Panel de flota · Rastreo y Medición
**Fase:** piloto con **3 tractores** (2 John Deere + 1 New Holland)
**Fecha:** 7 de noviembre de 2026

> Los endpoints de Traccar, los puertos y los nombres de atributos están tomados de `versiones/antiguas/panel-flota/README.md` y del código. Hay que confirmarlos contra la versión de Traccar que se instale y contra el manual del modelo de rastreador comprado.

---

## 1. Cómo funciona el cambio

El panel elige el cliente de datos en `src/api/index.js`:

```js
config.useMock ? createMockClient() : createTraccarClient()
```

`config.useMock` es `true` salvo que `VITE_USE_MOCK=false`. Los dos clientes exponen la misma interfaz (`getDevices`, `getPositions`, `getGeofences`, `getSummary`, `getEvents`, `connect`, sesión y perfil). Por eso **no hay que cambiar código del panel**: la migración es de infraestructura y de datos.

| Cliente | Archivo | Origen de datos |
|---|---|---|
| Simulado | `src/api/mock.js` | 85 tractores inventados, movimiento y eventos aleatorios |
| Real | `src/api/traccar.js` | Servidor Traccar (REST + WebSocket `/api/socket`) |

---

## 2. Flota del piloto

| Código en Traccar | Marca | Modelo | Nivel | Rastreador sugerido |
|---|---|---|---|---|
| `TRC-0001` | John Deere | por definir | por definir | por definir |
| `TRC-0002` | John Deere | por definir | por definir | por definir |
| `TRC-0003` | New Holland | por definir | por definir | por definir |

**Cómo decidir el nivel de cada tractor** (ver `Revision_sensores_y_costos.md`, sección 3):

- **Nivel A**, sin electrónica o sin acceso a CAN: Teltonika **FMC130**. Horas por D+ o presión de aceite.
- **Nivel B**, con J1939 accesible: Teltonika **FMC150**. Horas, RPM y consumo por CAN.

Si el tractor Deere tiene JDLink activo, anota el dato. Sirve como **referencia independiente** para validar las horas del rastreador (ver sección 8).

Lo más útil del piloto es que cubre los dos casos: un tractor de cada nivel, si es posible. Si los tres son del mismo nivel, comprar 1 rastreador del otro nivel para probarlo.

---

## 3. Fase 0 · Antes de empezar

- [ ] Inventario de los 3 tractores: marca, modelo, año, voltaje (12 V o 24 V), ¿tiene conector de diagnóstico J1939?, lectura actual del horómetro.
- [ ] Rastreadores comprados: 2 a 3 Teltonika (FMC130 o FMC150 según el inventario) más 1 de repuesto.
- [ ] 3 chips M2M activos, de al menos 2 operadoras si se hace prueba de cobertura. Anotar el ICCID de cada uno.
- [ ] Material de instalación: portafusibles con fusible, caja IP67, sellos con folio, pinzas.
- [ ] Servidor para Traccar (VPS o equipo propio) con IP pública fija o dominio.

---

## 4. Fase 1 · Servidor Traccar

1. Instalar Traccar en el servidor (Linux recomendado; instalador oficial de traccar.org).
2. Abrir en el firewall:
   - **8082/TCP**: interfaz y API REST (mejor detrás de HTTPS con proxy inverso, ver sección 7).
   - **5027/TCP y UDP**: protocolo Teltonika.
   - **5004/TCP**: solo si se prueba un Queclink (a verificar en la documentación de Traccar).
3. En `traccar.xml`:
   - Activar el registro de usuarios si se quiere el formulario **Crear cuenta** del panel (`POST /api/users`).
   - Configurar SMTP si se quiere la recuperación de contraseña (`POST /api/password/reset`).
   - Configurar `web.origin` solo si el panel se sirve desde otro dominio.
4. Crear el usuario administrador y cambiar la contraseña por defecto.
5. Verificar que `http://IP:8082` abre la interfaz de Traccar.

---

## 5. Fase 2 · Instalar y configurar los rastreadores

### 5.1 Configuración del equipo (Teltonika Configurator)

| Parámetro | Valor |
|---|---|
| Servidor (dominio o IP) | El del Traccar |
| Puerto | `5027` |
| Protocolo | TCP |
| APN | El de la operadora del chip M2M |
| Envío en movimiento | cada 30–60 s |
| Envío detenido | cada 30 min (coincide con `offlineAfterMin: 35` en `src/config.js`) |
| Entrada DIN1 | Ignición (motor en marcha) |
| Alerta de corte de alimentación | Activada |

### 5.2 Cableado

Seguir la tabla de la sección 5 de `Revision_sensores_y_costos.md`:

- Alimentación al borne + de la batería, directo, con fusible de 1–2 A.
- Tierra al chasis, en un punto limpio sin pintura.
- **DIN1 al borne D+ del alternador** (o al interruptor de presión de aceite), con fusible de 0.5–1 A.
- Nivel B: CAN H y CAN L al conector J1939 o a un lector CAN sin contacto.
- Rastreador dentro de la cabina, en caja IP67, con las antenas hacia arriba y sin metal encima.

### 5.3 Antes de entregar cada tractor

- [ ] Foto del horómetro (lectura inicial).
- [ ] Foto de la instalación.
- [ ] Sello colocado, con folio y foto del número.
- [ ] Prueba de arranque: el dispositivo aparece **online** en Traccar y la ignición cambia al arrancar y apagar.

---

## 6. Fase 3 · Dar de alta los tractores en Traccar

Para cada tractor, en la interfaz de Traccar → Dispositivos:

| Campo | Valor | Por qué |
|---|---|---|
| Nombre | `TRC-0001`, `TRC-0002`, `TRC-0003` | El panel identifica el tractor por este código |
| Identificador | IMEI del rastreador | Es como Traccar reconoce el equipo |
| Atributo `nivel` | `A` o `B` | Selecciona la escena 3D correcta |
| Atributo `marca` | `john-deere` o `new-holland` | El simulado usa estos mismos valores |
| Atributo `modelo` | por ejemplo `5075E` | Se muestra en la tarjeta del tractor |
| Atributo `sondaBLE` | `true` si tiene sonda | Solo para nivel A con sonda |

Después:

1. **Geocercas (lotes):** dibujar en Traccar los polígonos de los lotes. El panel los lee de `/api/geofences` (WKT `POLYGON`, `CIRCLE`, `LINESTRING`).
2. **Horas de motor:** activar el conteo de horas por ignición en el dispositivo o en la configuración de Traccar. Confirmar el nombre exacto del atributo en la versión instalada. El panel lee `attributes.hours` en milisegundos, igual que el simulado.
3. **Horómetro inicial:** cargar la lectura real del horómetro de cada tractor como valor de partida, para que las horas totales coincidan con el tablero.

### Atributos que el panel espera en cada posición

| Atributo | Qué es | Nivel A | Nivel B |
|---|---|---|---|
| `ignition` | Motor en marcha | Sí (DIN1 / D+) | Sí |
| `hours` | Horas de motor acumuladas (ms) | Sí | Sí (idealmente por CAN) |
| `power` | Voltaje de alimentación | Sí | Sí |
| `fuel` | Litros | Solo con sonda BLE | Por CAN |
| `rpm` | Revoluciones | No | Por CAN |

Los equipos que no reportan `fuel` o `rpm` simplemente no los muestran: el simulado ya hace lo mismo con los de nivel A sin sonda.

Los datos por J1939 (RPM, temperatura del refrigerante, presión de aceite, acelerador y códigos de falla), sus AVL ID y cómo pasarlos a estos atributos están en [`J1939.md`](J1939.md).

---

## 7. Fase 4 · Conectar el panel al Traccar real

### 7.1 En desarrollo

En `versiones/antiguas/panel-flota/.env` (o en las variables del build del bundle):

```
VITE_USE_MOCK=false
TRACCAR_PROXY_TARGET=http://IP-O-DOMINIO-DE-TRACCAR:8082
```

```bash
npm run dev      # http://localhost:5173
```

El proxy de Vite (`vite.config.js`) reenvía `/api`, incluido el WebSocket, así que no hay problemas de CORS.

### 7.2 En producción

- **Opción simple:** servir `dist/` (`npm run build`) desde el mismo dominio que Traccar, detrás de un proxy inverso (Nginx o Caddy) con **HTTPS**.
- **Si el panel va en otro dominio:** definir `VITE_TRACCAR_URL=https://traccar.tudominio.com` antes de compilar y configurar `web.origin` en `traccar.xml`.
- Las cookies de sesión y el WebSocket necesitan HTTPS (`wss://`) en producción.

### 7.3 Qué cambia al desactivar el simulado

| Función | Simulado | Real |
|---|---|---|
| Flota | 85 tractores inventados | Solo los 3 dados de alta |
| Inicio de sesión | `demo@buildwiselabs.mx` / `demo1234`, en el navegador | Usuarios de Traccar |
| Crear cuenta | Se guarda en el navegador | `POST /api/users`, requiere registro activado |
| Recuperar contraseña | Simulada | Requiere SMTP |
| Inicio con Google | Simulado | Requiere OpenID en `traccar.xml` |
| Tiempo real | Eventos aleatorios cada 2 s | WebSocket `/api/socket` |

---

## 8. Fase 5 · Validación del piloto

Criterio de aceptación: **diferencia de horas menor a 3%** contra el horómetro físico, comparando por tipo de detección (D+, CAN).

| Prueba | Cómo se hace | Aceptación |
|---|---|---|
| Horas de motor | Trabajar 1 semana. Comparar horas de Traccar con la diferencia del horómetro (foto inicial y final). | < 3% |
| Referencia JDLink | En los Deere con JDLink, comparar con las horas que muestra Operations Center. | Misma tendencia |
| Ubicación y lotes | Entrar y salir de una geocerca con el tractor. | Evento en el panel en menos de 2 min |
| Ignición | Arrancar y apagar 5 veces. | 5 eventos correctos, sin falsos |
| Corte de alimentación | Desconectar el fusible de alimentación. | Alerta `powerCut` en el panel |
| Sin señal | Llevar el tractor a una zona sin cobertura y regresar. | Marca "sin señal" y recupera los datos guardados en memoria |
| Combustible (si aplica) | Carga de pipa o carga con recipiente aforado. | Diferencia < 3% |
| Cobertura | Probar en los lotes más lejanos con 2 operadoras. | Reporta sin huecos largos |

Si el criterio se cumple en D+ y en CAN, se puede escalar a la flota completa.

---

## 9. Lista de revisión del panel con datos reales

Al abrir el panel con `VITE_USE_MOCK=false`:

- [ ] El indicador de conexión pasa de `connecting` a `online`.
- [ ] Aparecen los 3 tractores, con el código y la marca correctos.
- [ ] El mapa centra los tractores en su ubicación real.
- [ ] Los lotes (geocercas) aparecen dibujados.
- [ ] Los KPI de la flota muestran 3 equipos, no 85.
- [ ] Las horas del día salen de `getSummary` (`engineHours`).
- [ ] Alertas y eventos del día salen de `getEvents`.
- [ ] La vista 3D muestra la escena del nivel correcto (A o B).
- [ ] Reportes: barras por rancho y por tractor con 3 tractores.

---

## 10. Problemas comunes

| Síntoma | Causa probable | Qué revisar |
|---|---|---|
| El dispositivo aparece "desconocido" | El IMEI no está dado de alta | Dar de alta con el IMEI exacto |
| Nunca conecta | APN mal o puerto cerrado | APN del chip, firewall del puerto 5027 |
| Conecta pero sin horas | DIN1 sin cablear o sin conteo de horas activado | Cableado a D+, configuración de horas |
| Horas con la llave abierta y el motor apagado | Se está contando por voltaje o por llave | Usar D+ o presión de aceite |
| El panel pide iniciar sesión en bucle | Cookie bloqueada por dominio o por HTTP | Mismo dominio o HTTPS, `web.origin` |
| Error de CORS | Panel en otro dominio | `VITE_TRACCAR_URL` y `web.origin` |
| WebSocket se cae | Proxy inverso sin soporte `Upgrade` | Reenviar el encabezado `Upgrade` en Nginx o Caddy |
| Aparece la escena 3D equivocada | Falta el atributo `nivel` | Revisar `nivel` en el dispositivo |
| Mapa sin mosaicos en producción | Política de uso de OpenStreetMap | Contratar un proveedor de mosaicos |

---

## 11. Volver al simulado

Para volver a datos de prueba (demostración, desarrollo de interfaz): poner `VITE_USE_MOCK=true` en `.env` o borrarlo, y reiniciar `npm run dev`. No se pierde nada del Traccar real.

---

## 12. Pendientes

- [ ] Definir modelo, año y nivel de los 3 tractores.
- [ ] Confirmar si los 2 Deere tienen JDLink activo.
- [ ] Comprar rastreadores, chips y material de instalación del piloto.
- [ ] Levantar el servidor Traccar con HTTPS.
- [ ] Dar de alta los tractores y las geocercas de los lotes del piloto.
- [ ] Confirmar el nombre del atributo de horas en la versión de Traccar instalada.
- [ ] Ejecutar la validación de la sección 8 durante 1 semana.
- [ ] Decidir con los resultados el estándar de detección de horas (D+ o CAN) para la flota de 85.
