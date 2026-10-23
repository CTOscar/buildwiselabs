# Revisión de sensores y costos: Rastreo y Medición de Horas de Motor

**Proyecto:** Rastreo y medición de flota (85 tractores)
**Documento base:** *Propuesta Técnica: Rastreo y Medición de Horas de Motor con Infraestructura Propia* (14 oct 2026)
**Fecha de revisión:** 14 de octubre de 2026

> **Nota sobre precios:** son estimaciones de referencia en MXN, sin IVA, con tipo de cambio supuesto de ~$19 MXN/USD. No se pudieron consultar precios en línea al momento de la revisión, así que todas las cifras deben confirmarse con cotizaciones formales de distribuidores autorizados.

---

## 1. ¿Qué es M2M?

**M2M** significa *Machine to Machine* (máquina a máquina). Un **chip M2M** (o chip IoT) es una tarjeta SIM hecha para que los equipos se comuniquen entre sí sin intervención de una persona. En este proyecto, el rastreador del tractor manda sus datos al servidor Traccar.

Diferencias con un chip de celular normal:

| | Chip de celular normal | Chip M2M / IoT |
|---|---|---|
| Uso | Llamadas, WhatsApp, internet de una persona | Solo datos entre equipos |
| Consumo de datos | GB al mes | **5 a 15 MB al mes** por rastreador |
| Voz y SMS | Incluidos | Se bloquean (solo se deja SMS para configurar el equipo, si se necesita) |
| Administración | Uno por uno | Plataforma para activar, suspender y ver el consumo de toda la flota |
| Durabilidad | Estándar | Versiones industriales que resisten vibración y temperatura |
| Precio | Plan de consumo personal | Plan por volumen, mucho más barato por equipo |

Es la **única dependencia externa** del proyecto: el servidor puede ser propio, pero el dato tiene que viajar por la red celular de una operadora.

**Recomendaciones:**

- Cotizar planes M2M por volumen con Telcel y AT&T. La referencia es **$40–90 MXN por chip al mes** (la propuesta original estimaba $100–250).
- Cotizar también **chips IoT multioperador**, que se conectan a la red con mejor señal en cada zona. Ayudan en los lotes alejados. Antes de comprar en volumen hay que confirmar que se permitan en México de forma permanente.
- Hacer la prueba de cobertura con chips de **dos operadoras**.

---

## 2. Observaciones a los sensores de la propuesta original

| Punto del documento | Observación | Recomendación |
|---|---|---|
| **Queclink GV600** | Es una familia con varias versiones. Algunas son 2G/3G, redes que en México ya se apagaron o van de salida. | Exigir versión **LTE (Cat 1 o Cat M1) con respaldo 2G** por escrito en la cotización. |
| **Teltonika FMB640** como alternativa | Es **solo 2G**. Es riesgoso para un equipo que debe durar 5 años o más. | Quitarlo de la lista. |
| **Teltonika FMC650** | Es LTE y trae CAN integrado, pero es gama alta, más caro y no es IP67. | Solo para casos especiales. |
| **Horas por voltaje > 13.2 V** | Funciona, pero es frágil: baterías viejas, temperatura, y en tractores de **24 V** el umbral correcto es ~26.4 V. | Cablear una **entrada digital al borne D+ del alternador o al interruptor de presión de aceite** (señal sí/no, mucho más confiable). Dejar el voltaje como respaldo. |
| **Sonda de combustible "analógica o serial"** | La analógica pierde precisión. La serial (RS485) obliga a cablear el tanque, que es el punto más castigado del tractor. | Usar sondas capacitivas **Bluetooth (BLE)**. Teltonika las lee de forma nativa y no hay cable al tanque. |
| **Lector CAN "opcional con accesorio"** | En tractores modernos el CAN entrega horas reales, RPM, consumo y a veces nivel de tanque, lo que puede **evitar comprar la sonda**. | Usar un equipo con CAN integrado en la flota moderna. |

---

## 3. Solución recomendada: flota en dos niveles

Se usa Teltonika como base porque sus equipos se venden desbloqueados, su configurador y la actualización remota de firmware son gratuitos, el protocolo es público y Traccar lo soporta muy bien (puerto 5027; Queclink usa el 5004, a verificar en la documentación de Traccar). Esto cubre directamente el riesgo de "equipo bloqueado por el revendedor".

| Nivel | Tractores | Equipo | Cómo obtiene horas y diésel |
|---|---|---|---|
| **A: tractores sin electrónica** | ~55 | Teltonika **FMC130** (LTE Cat 1, con batería interna) en caja IP67 dentro de la cabina | Horas por D+ o presión de aceite. Sonda BLE solo en los de alto consumo. |
| **B: tractores modernos con J1939** | ~30 | Teltonika **FMC150** (CAN integrado) | Horas, RPM y litros consumidos directo de la computadora del motor. Sin sonda. Lector CAN sin contacto opcional para no tocar el cableado de fábrica (garantía). |
| **Sonda de combustible** | ~15 (nivel A, mayor consumo o con robos) | Sonda capacitiva BLE | Calibración por tramos. |

**Fase de laboratorio:** comprar 2 FMC130, 2 FMC150 y 1 Queclink LTE para comparar marcas con equipos en mano.

> Antes de comprar, revisar la cuenta de tractores con J1939 contra el inventario real. Si son más o menos de 30, cambia la proporción entre FMC130 y FMC150 y también cuántas sondas se necesitan.

---

## 4. Lista de compras final

Se quitaron de la lista el arnés y el servidor. Los sellos ya usan el precio real del producto elegido.

| Material | Cantidad | Cómo se calcula | Costo estimado (MXN) |
|---|---|---|---|
| Rastreador Teltonika FMC130 (nivel A) | **57** | 55 + 2 de repuesto | $102,600 – 142,500 |
| Rastreador Teltonika FMC150 (nivel B, CAN) | **32** | 30 + 2 de repuesto | $80,000 – 112,000 |
| Portafusible con fusible | **180** | 2 por tractor (alimentación y señal D+) + 10 de repuesto | $2,700 – 5,400 |
| Caja IP67 | **89** | 1 por rastreador | $10,680 – 22,250 |
| Sello de acero con folio | **100** | 2 paquetes de 50 a $584 | $1,168 |
| Sonda de combustible BLE | **16** | 15 + 1 de repuesto | $64,000 – 96,000 |
| Calibración de sonda (servicio) | **15** | 1 por sonda instalada; $0 si la hace el taller | $12,000 – 22,500 |
| Instalación (servicio) | **85** | 1 por tractor; menos si la hace el taller | $51,000 – 102,000 |
| **Total** | | | **≈ $324,000 – 504,000** |

**Gastos e insumos aparte:**

- **Chips M2M:** 85, más 2–4 de repuesto sin activar. Unos $3,400–7,700 al mes para la flota.
- **Lector CAN sin contacto (opcional):** 30, uno por tractor de nivel B. Agrega unos $1,000–1,800 por tractor.
- **Cable y terminales:** como se quitó el arnés, si el cable que trae el rastreador no alcanza a la batería y al borne D+, pedir que el material venga incluido en la cotización de instalación.
- **Equipos de laboratorio:** los FMC130 y FMC150 de la prueba cuentan dentro de estas cantidades si esa marca resulta ganadora. El Queclink de comparación es aparte.

### Comparativo con la propuesta original

| Concepto | Propuesta original | Esta revisión |
|---|---|---|
| Rastreadores instalados | $325,000 – 765,000 | ≈ $250,000 – 384,000 |
| Combustible | $90,000 – 240,000 (30 sondas) | $76,000 – 118,500 (15 sondas; 30 tractores por CAN) |
| Chips M2M (mensual) | $8,500 – 21,000 | $3,400 – 7,700 |

---

## 5. Diagrama de conexión en el tractor

Hay una simulación interactiva publicada: *Conexión Rastreador–Tractor* (artifact en Claude).

| Cable | Desde | Hasta (rastreador) | Protección | Para qué sirve | Nivel |
|---|---|---|---|---|---|
| Alimentación | Borne + de batería (directo, no por la llave) | VCC (+) | F1 · 1–2 A | Mantiene el equipo encendido 24 h para detectar robos con el tractor apagado. | A y B |
| Tierra | Chasis, en punto limpio sin pintura | GND (−) | — | Referencia eléctrica. Una mala tierra da lecturas de voltaje falsas. | A y B |
| Motor en marcha | Borne D+ del alternador (o interruptor de presión de aceite) | DIN1 (ignición) | F2 · 0.5–1 A | Solo da señal cuando el motor gira. Así no se cuentan horas con la llave abierta y el motor apagado. | A y B |
| CAN H / CAN L | Conector de diagnóstico J1939 o lector CAN sin contacto | CAN H / CAN L | — | Lee horas, RPM, consumo y nivel de tanque desde la computadora del motor. | Solo B |
| Sonda BLE | Sonda capacitiva en el tanque | Bluetooth interno | — | Envía el nivel sin cable. Tiene batería propia de varios años. | A (alto consumo) |
| Datos | Chip M2M dentro del equipo | Antena LTE interna | — | Envía cada 60 s en movimiento y cada 30 min detenido. Sin señal, guarda en memoria y reenvía. | A y B |

**Notas de instalación:**

- **Ubicación:** dentro de la cabina, bajo el tablero o detrás del asiento, con la etiqueta hacia el cielo. Sin metal encima, porque las antenas son internas.
- **Tractores de 24 V:** el rastreador acepta 10–30 V, no necesita convertidor. Si se usa respaldo por voltaje, el umbral sube a ~26.4 V.
- **Antes de entregar cada tractor:** foto del horómetro, foto de la instalación, prueba de arranque en Traccar y validación de nivel con una carga de pipa.
- Los valores de fusibles, voltajes y asignación de pines son de referencia. Hay que confirmarlos con el manual de instalación del modelo que se compre antes de cablear.

---

## 6. Calibración de la sonda de combustible

La calibración convierte la lectura de la sonda en litros reales. Los tanques de tractor tienen formas irregulares, así que la misma altura no equivale a los mismos litros en todo el tanque. Cada tanque necesita su propia tabla.

**Pasos:**

1. **Cortar e instalar la sonda.** Se corta a la profundidad del tanque y se monta vertical, lo más cerca posible del centro.
2. **Ajustar vacío y lleno.** Con la app o el configurador del fabricante se registra la lectura con el tanque vacío y con el tanque lleno.
3. **Llenar por tramos y armar la tabla de tarado.** Con el tractor en piso nivelado y el motor apagado, se carga en tramos fijos (por ejemplo, 20 L) con un recipiente aforado o un medidor de flujo confiable. Tras cada tramo se esperan 1–2 minutos y se anota la lectura.

   | Litros cargados | Lectura de la sonda |
   |---|---|
   | 0 | 12 |
   | 20 | 95 |
   | 40 | 210 |
   | 60 | 340 |
   | … | … |
   | 300 (lleno) | 1010 |

4. **Cargar la tabla al sistema** (Traccar como atributo calculado, o el sistema de maquinaria). Los litros se calculan por interpolación entre los dos puntos más cercanos.
5. **Validar** con una carga real de pipa. La diferencia debe quedar abajo de 3%.

**Lógica a programar en el sistema:**

- **Filtrado:** usar un promedio móvil de varios minutos, o tomar como válidas solo las lecturas con el tractor detenido.
- **Detección de extracción:** alerta cuando el nivel baje más de cierto umbral (por ejemplo 10–15 L) con el motor apagado.
- **Detección de carga:** una subida repentina se registra como carga y se concilia con el vale de la pipa.

**Datos prácticos:**

- **Tiempo:** de 1 a 2 horas por tractor.
- **Quién lo hace:** el taller, con un recipiente aforado y la hoja de registro. Así se ahorra el servicio de calibración ($12,000–22,500).
- **Cuándo repetirla:** si se cambia el tanque, si la sonda se mueve o se reemplaza, o si la validación contra la pipa empieza a salir con más de 3% de diferencia.
- **Atajo:** en tractores del mismo modelo con el mismo tanque, una tabla bien hecha sirve para todos. Aun así, hay que validar cada uno con una carga de pipa.

---

## 7. Sellos antimanipulación

**Producto elegido:** sello de cable de acero autobloqueante (Amazon MX, B0CHYK7ZP7).

| Característica | Valor | Valoración |
|---|---|---|
| Material | Cable de acero de 1.5 mm | No le afectan el sol, el calor, el diésel ni la vibración. Pasa por orificios pequeños. |
| Resistencia | 3,400 N (≈ 350 kg) | Más de lo necesario. Hay que cortarlo con herramienta. |
| Longitud | 300 mm | Suficiente para la caja IP67 y el conector. |
| Folio | Número único en cada sello | Cumple. |
| Precio | $584 por 50 piezas ($11.68 c/u, IVA incluido) | Más barato que lo estimado ($20–40 c/u). |

**Uso:**

- Pasar el sello por el cierre de la caja IP67 y por el conector de alimentación. **No enrollarlo sobre el rastreador**, porque el acero junto a las antenas internas baja la señal.
- **Al instalar:** registrar el folio en el sistema junto al código del tractor (ej. TRC-0012), con foto donde se vea el número.
- **En ronda:** el supervisor compara el folio contra el registrado. Si no coincide o está roto, se levanta reporte.
- **En mantenimiento:** el taller registra el folio retirado, el nuevo folio y el motivo. Necesita **pinzas corta cable**.
- **Sistema:** agregar un campo de "folio de sello vigente" por tractor, con historial de cambios.
- El sello solo **evidencia** que alguien abrió la caja; no lo impide. La protección real es la alerta por corte de alimentación (con la batería interna) y por pérdida de señal.

---

## 8. Otros ajustes a la propuesta original

- **Prueba de cobertura:** hacerla con chips de dos operadoras.
- **Intervalos:** para asignar horas por lote con precisión, usar 30 s o registro por cambio de rumbo en movimiento, y 30 min detenido.
- **Antimanipulación:** configurar alerta por corte de alimentación externa.
- **Validación del piloto:** mantener el criterio de menos de 3% contra el horómetro, comparándolo por tipo de detección (D+, voltaje, CAN) para decidir el estándar de la flota.

---

## 9. Pendientes

- [ ] Confirmar cuántos tractores tienen J1939 (define la proporción FMC130 / FMC150 y el número de sondas).
- [ ] Pedir cotizaciones formales: rastreadores, sondas BLE, cajas IP67, instalación.
- [ ] Cotizar planes M2M por volumen (Telcel, AT&T y opción multioperador).
- [ ] Prueba de cobertura en los lotes más alejados.
- [ ] Comprar equipos de laboratorio (2 FMC130, 2 FMC150, 1 Queclink LTE).
- [ ] Confirmar valores de fusibles y asignación de pines con el manual del modelo elegido.
