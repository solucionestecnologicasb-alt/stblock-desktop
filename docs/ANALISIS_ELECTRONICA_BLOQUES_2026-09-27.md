# Auditoría de electrónica, tarjetas, bloques y búsqueda

Fecha: 2026-09-27. Checkout: `C:\stb`.

Actualización: se implementaron correcciones después de esta auditoría. Ver
[CORRECCIONES_ELECTRONICA_2026-09-27.md](CORRECCIONES_ELECTRONICA_2026-09-27.md).
Las definiciones y los bloques anteriores se conservan al cambiar de tarjeta por petición expresa del usuario.
La matriz JSON ahora refleja la cobertura corregida; las cifras de este documento son el diagnóstico inicial.

## Alcance y resultado

Se inspeccionaron los 19 manifiestos de tarjetas, los 24 elementos de la biblioteca de extensiones (65 bloques), los dos generadores Arduino, el registro de definiciones de Blockly, los cambios de categoría y el buscador. La matriz detallada y los identificadores afectados están en `electronics-blocks-audit.json`; se reproduce con `node scripts/audit-electronics-blocks.cjs`.

Esta es una auditoría de código y registros de generadores, no una certificación eléctrica ni una prueba de compilación por tarjeta. La cobertura de un identificador no demuestra que el C++ generado sea correcto. Los manifiestos tampoco incluyen todos los bloques estándar ni las inyecciones adicionales que hace el runtime. micro:bit tiene una ruta distinta y no se cuenta como fallo por carecer de generador Arduino.

## Hallazgos prioritarios

### P1: definiciones de bloques de otra tarjeta permanecen registradas

`scratch-gui/src/containers/blocks.jsx`, `handleExtensionAdded`, solo define un bloque si su tipo todavía no existe en `ScratchBlocks.Blocks`. `handleBlocksInfoUpdate` delega en esa misma función. Sin embargo, hay 99 tipos compartidos entre manifiestos con JSON diferente: pines, menús y otras definiciones dependen de la placa.

Ejemplo: seleccionar Uno y después Mega conserva potencialmente la definición anterior de `arduino_pin_setPinMode`, aunque el manifiesto de Mega tenga un menú diferente. La prevención de redefiniciones impide aplicar cambios legítimos. Esto es un defecto confirmado por la comparación de fuentes; su manifestación visual exacta requiere prueba en navegador.

Corrección propuesta: diferenciar alta y actualización, reemplazar definiciones cuyo contenido cambió, e invalidar las instancias recicladas de la paleta al cambiar tarjeta/definición. Validar Uno → Mega → ESP32 → Uno, incluidos bloques ya colocados, sin sustituir pines silenciosamente.

### P1: extensiones cargadas en la interfaz pero ausentes del runtime

`device-mode-gui.jsx` mantiene `loadedExtensions` en estado React y lo modifica antes de conocer el resultado de activación. `runtime.setDeviceProfile` reemplaza `_deviceBlockInfo` desde el manifiesto; `activateDeviceExtension` solo añade categorías a esa lista. No existe sincronización equivalente que reconstruya el estado de extensiones de la interfaz a partir de la nueva lista.

Por tanto, un cambio de perfil puede eliminar una extensión y mantener su indicador de cargada. También existe el caso inverso al desmontar/remontar el componente. Una segunda pulsación puede desactivar en lugar de activar. El activador no registra primitivas de ejecución: registrar una categoría visual no implementa su funcionamiento.

Corrección propuesta: estado único de extensiones por proyecto/tarjeta, resultado explícito de activación y rehidratación al cargar/cambiar perfil. Persistir metadatos de extensiones y validar compatibilidad de placa y modo antes de mostrarlas como listas.

### P1: bloques visibles sin generación funcional y dos rutas discrepantes

Los generadores son `scratch-vm/src/generators/arduino/index.js` y `scratch-gui/src/lib/arduino-generator/index.js`. La GUI publica código desde el workspace y también escucha `CODE_GENERATED` del VM. La cobertura y los alias no coinciden.

En las 24 extensiones, solo 3 de 65 identificadores tienen resolución en el generador VM y solo 1 de 65 tiene manejador directo en el generador GUI. El ultrasónico genérico tiene cobertura en ambos; `stbV2Ultra_readDistCm` y `stbV2Ultra_readDistInch` tienen cobertura VM. El resto requiere implementación o adaptación, no simplemente repintado. Por ejemplo, `dht_dht_readTemperature` no está registrado. La existencia de otra función DHT en la tarjeta no garantiza que reciba esos argumentos ni el mismo identificador.

Los fallbacks emiten comentarios como `Bloque no soportado`, y la GUI también omite ciertos nombres interpretados como inicio. Esto puede producir un programa vacío o incompleto en vez de un error claro. No se debe anunciar una extensión como funcional porque su bloque aparezca en la paleta.

Corrección propuesta: consolidar generación en una sola ruta, usar un contrato de identificadores/argumentos compartido y bloquear la subida con diagnóstico concreto cuando haya bloques sin soporte. Implementar y compilar por familia de placa, con validación de bibliotecas y pines.

### P1: reproducción visual pendiente de los bloques rojos/vacíos

Hay varios mecanismos que justifican una prueba dirigida, pero no se ha reproducido el síntoma en un navegador real en esta sesión:

- El color inicial de Blockly es rojo (`core/block.js`: `colour_ = '#FF0000'`); verlo puede indicar una instancia incompletamente inicializada, pero no demuestra por sí solo la causa.
- `setSelectedItem` está interceptado para mostrar una sola categoría y alternar a todas al seleccionar la misma. `updateToolbox` restaura una selección llamando a esa misma función sin distinguir restauración de clic. Si coincide con la categoría ya seleccionada, puede entrar en la rama de deselección.
- El reciclador del flyout identifica instancias por id o tipo, sin comparar el XML. Los cambios de valores, búsquedas o definiciones necesitan una invalidación coherente.
- `handleBlocksInfoUpdate` omite reemplazar definiciones existentes, como se explicó antes.

No se aplicó un parche especulativo al reciclador ni se considera resuelto el fallo rojo. Prueba necesaria: instrumentar errores de creación, alternar Control/Eventos repetidamente después de cambios de dispositivo y verificar color, campos, sombras y arrastre en la misma sesión.

### P2: entradas de estructuras mal nombradas

En Uno, Nano y STBoard Extension, `structArraySet` y `structArrayGet` contienen una entrada `[INDEX` aunque sus metadatos declaran `INDEX`. El texto con corchetes anidados se interpretó incorrectamente al generar el manifiesto. El campo de índice queda sin su sombra predeterminada y puede no ser leído por el generador.

Corregir el importador que produce los manifiestos y regenerarlos; añadir una comprobación que compare argumentos declarados, entradas JSON y nombres XML.

### P2: búsqueda pierde valores y nombres de electrónica — corregido

Antes, el índice obtenía nombres de `ScratchBlocks.Msg` y clasificaba los bloques por el prefijo del identificador. Los bloques de tarjeta normalmente no tienen una clave correspondiente en ese diccionario. Además, los resultados se reconstruían como `<block type="..."/>`, perdiendo sombras, valores y mutaciones.

Cambios aplicados:

- Leer textos JSON de los metadatos ya registrados en el runtime.
- Conservar categoría, color y XML completo de cada bloque del toolbox.
- Buscar ignorando tildes, mayúsculas y espacios exteriores.
- Usar «Buscar bloques» y «Resultados» en la interfaz.

Esto corrige la pérdida de valores causada por la búsqueda; no prueba que sea la causa de los bloques rojos al cambiar categorías. Quedan mejoras de búsqueda de variables/procedimientos: actualmente se indexan pero el constructor de resultados solo muestra bloques estáticos. La búsqueda de la biblioteca de extensiones también requiere normalización y filtrado real por compatibilidad.

## Matriz por tarjeta

Recuento de bloques con `info` y `json` en el manifiesto, sin menús ni separadores. «Sin VM» corresponde a resolución de manejador/alias/prefijo ausente; «sin GUI» a manejador directo ausente. Las rutas no son intercambiables y estos números no equivalen a fallos físicos demostrados.

| Tarjeta | Bloques | Sin VM | Sin GUI |
|---|---:|---:|---:|
| Uno | 125 | 1 | 116 |
| STBoard Extension | 163 | 7 | 122 |
| Nano | 125 | 1 | 116 |
| Leonardo | 81 | 1 | 72 |
| Mega 2560 | 118 | 0 | 109 |
| STBoard V2 | 295 | 3 | 112 |
| Uno R4 Minima | 81 | 1 | 72 |
| Uno R4 WiFi | 86 | 1 | 77 |
| ESP32 | 86 | 6 | 78 |
| ESP32-S3 | 72 | 5 | 64 |
| ESP8266 NodeMCU | 94 | 2 | 85 |
| K210 Maix Dock | 80 | 2 | 74 |
| K210 Maixduino | 80 | 2 | 74 |
| Pico | 81 | 1 | 73 |
| Pico W | 81 | 1 | 73 |
| Pico 2 | 81 | 1 | 73 |
| Pico 2 W | 81 | 1 | 73 |
| micro:bit | 28 | No aplica | No aplica |
| micro:bit V2 | 28 | No aplica | No aplica |

Ejemplos VM pendientes: ESP32 PWM/DAC/touch/servo/interrupciones; K210 PWM e inicio multiserial; Pico inicio multiserial; varios AVR `serialReadAByte`; STBoard V2 desactivar retraso de arranque, estado de configuración y detener precisión. Consultar el JSON para identificadores exactos.

Los perfiles de compilación cubren las 19 tarjetas; micro:bit tiene `fqbn: null` y necesita auditar su flujo HEX por separado. No se ejecutó compilación/subida ni validación eléctrica de ninguna placa.

## Orden de implementación recomendado

1. Estabilizar actualización de definiciones y restauración de categorías, con reproducción de Control/Eventos y cambio de placa en navegador.
2. Sincronizar extensiones con el runtime y persistencia del proyecto; probar activar, cambiar placa, volver, guardar y reabrir.
3. Unificar generación y detectar explícitamente bloques no soportados; después implementar las extensiones por grupos verificables.
4. Corregir importación de manifiestos, compatibilidad y búsqueda de variables/procedimientos.
5. Añadir matriz de compilación por familia y pruebas físicas de conexión/reconexión, pines, sensores y actuadores.

## Validación y límites

- Auditoría reproducible ejecutada sobre todos los manifiestos y todas las extensiones; informe JSON generado.
- `node scripts/test-electronics-search.cjs`: pasa búsqueda española, categoría/color, conservación de sombras/valores y mutaciones, fallback Scratch y consulta vacía; también genera y valida XML de búsqueda para los 19 manifiestos. Usa DOM de jsdom instalado localmente.
- Jest normal no pudo ejecutar las pruebas: incompatibilidad heredada Babel 6.26.3 con plugins que requieren Babel 7; también advertencias de mocks duplicados. La prueba aislada evita ese ejecutor sin modificar sus dependencias.
- No se ejecutó build completo, navegador real ni prueba de hardware. La utilidad `agent-browser` no está disponible en PATH.
- Se preservaron los cambios previos del usuario. Los cambios funcionales de esta auditoría se limitan al buscador y a pasarle los metadatos del VM; los demás hallazgos son pendientes documentados.
