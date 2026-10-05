# Correcciones de electrónica — 2026-09-27

## Comportamiento conservado

Se conserva el registro de los bloques anteriores al cambiar de tarjeta, incluidos los bloques ya colocados y sus valores. No se sustituyen los menús existentes por los de otra placa ni se borra el programa para corregir la paleta. Se verificó un bloque DHT a través de Uno → Mega → ESP32 → Uno.

## Cambios

- **Categorías:** la selección programática ahora muestra el contenido de la categoría, además de resaltarla. Se distingue de la pulsación para alternar categorías y de la restauración tras actualizar el toolbox. Se cancela la animación anterior. La paleta reconstruye sus instancias para evitar reutilizar SVG o valores de otra vista; esto no afecta al programa.
- **Extensiones:** catálogo compartido GUI/VM, estado único en el runtime, persistencia en SB3, restauración de proyectos antiguos y reconocimiento de extensiones locales al cargar/copiar bloques. Los IDs con guiones bajos, como `ir_receiver`, se resuelven completos. Desaparece el intento de descargar `/dht` como un script externo. El indicador «Cargada» refleja el estado real.
- **Generación:** los dos productores activos de código de la GUI usan ahora el generador VM. Se añadieron manejadores para los 65 bloques originales de extensiones y 3 bloques de configuración necesarios: stepper, RFID y teclado matricial. Se completaron los 36 casos de tarjetas de la auditoría sin manejador (varios comparten el mismo tipo).
- **Configuración:** pines explícitos para stepper/RFID/teclado, dirección OLED y nivel activo HIGH/LOW de relé. Los periféricos con construcción global exigen parámetros constantes; los errores se muestran en el código. Las operaciones que necesitan inicialización la exigen, en vez de generar instrucciones sin un dispositivo configurado.
- **Diagnósticos:** un bloque no soportado, una configuración inválida o una extensión incompatible producen `#error STBlock`. La subida se detiene antes de desconectar el puerto. No se envía un programa aparentemente correcto que solo contiene comentarios de bloques omitidos.
- **Manifiestos:** reparadas las seis entradas `[INDEX` de estructuras en Uno, Nano y STBoard Extension, sus sombras y los corchetes del texto. El importador aplica la misma normalización para impedir que vuelvan a generarse mal.
- **Búsqueda:** mantiene XML, valores y mutaciones; encuentra nombres en español sin tildes; incluye variables, listas y procedimientos con sus IDs y argumentos; se actualiza cuando cambian. La biblioteca filtra compatibilidad y aclara que las extensiones se ejecutan mediante carga del programa.
- **Pruebas:** adaptador Babel 7 y resolución de enlaces pnpm para el Jest existente, sin actualizar sus dependencias ni el lockfile. El test de electrónica funciona con el Node local.

El archivo legado `scratch-gui/src/lib/arduino-generator/index.js` se conserva por compatibilidad, pero ya no alimenta el editor de electrónica. La auditoría automatizada comprueba la ruta activa compartida.

## Validación realizada

| Comprobación | Resultado |
|---|---|
| Catálogo y argumentos de los 19 manifiestos | Pasó |
| Generación de los 68 bloques de extensiones y 36 casos antes sin generador | Pasó |
| Categorías en Chrome, comprobando contenido, color y campos | Pasó: 24 alternancias y 24 restauraciones |
| Clics reales por las 24 categorías de extensiones | Pasó: 68 bloques, con sombras y desplegables |
| Añadir DHT desde la biblioteca, DHT22 en pin 4, generar, guardar y recargar | Pasó |
| Mantener bloque y valores al cambiar perfil Uno/Mega/ESP32/Uno | Pasó |
| Jest de búsqueda, compatibilidad y perfil antiguo | Pasó: 4 pruebas |
| Regresión existente de procedimientos Arduino | Pasó: 4 subpruebas |
| Compilación de sketches de las 24 extensiones, Uno/Mega según corresponda | Pasó |
| Casos corregidos de Uno, Nano, Leonardo, STBoard Extension y STBoard V2 | Pasó |
| Build de producción de la GUI | Pasó, con advertencias de tamaño de bundles |

Comandos principales:

```powershell
pnpm --dir C:\stb exec node scripts/test-electronics-fixes.cjs
pnpm --dir C:\stb exec node scripts/test-electronics-search.cjs
pnpm --dir C:\stb\scratch-gui exec jest --runInBand electronics-search
pnpm --dir C:\stb\scratch-vm exec tap --no-coverage test/unit/generators_arduino_procedures.js
pnpm --dir C:\stb exec node scripts/audit-electronics-blocks.cjs
```

Los scripts `electronics-cdp.cjs` y `electronics-browser-*.js` reproducen las pruebas de navegador usando un Chrome de pruebas en el puerto 9333. Los resultados, capturas, sketches y logs se guardan en `test-results/electronics`, excluido de Git.

## Dependencias locales y límites

Se instalaron y compilaron las bibliotecas de las extensiones en el directorio de QA y se copiaron las que faltaban a `src-tauri/tools/Arduino/libraries`, conservando las ya existentes. `compile-electronics-qa.cjs install` y `prepare-electronics-libraries.cjs` permiten repetir la preparación. Esta carpeta de herramientas ya estaba excluida de Git: para distribuir estos cambios se debe reconstruir el paquete de la aplicación con esas bibliotecas. No se publicó ni se generó un instalador.

ESP32 tenía ausente `esptool_py`; se restauró desde el índice oficial verificando SHA-256. La compilación completa sigue detenida porque al SDK local le falta `esp_bt.h`. No se declara validada la compilación ESP32/ESP32-S3. Tampoco se ejecutó compilación de ESP8266, K210 o Pico, cuyos cores no están instalados en este entorno. No se modificaron sus opciones de hardware para ocultar esas carencias.

La existencia de generadores y la compilación de ejemplos no equivalen a validación física de todas las combinaciones de placa, librería y periférico. No se conectaron tarjetas ni motores, no se subió firmware y no se verificaron niveles eléctricos. Las extensiones del catálogo son para carga de C++; no se anuncian como nuevas primitivas de Firmata en tiempo real.

Persisten advertencias previas de mocks duplicados y tamaño de bundles. Al ampliar la prueba a `python-executor.test.js`, una prueba existente de orden de código de bandera verde falla (5 de 6 pruebas combinadas pasaron); no se modificó ese módulo, ajeno a electrónica.

Referencias de API consultadas: [IRremote](https://github.com/Arduino-IRremote/Arduino-IRremote), [SparkFun APDS9960](https://github.com/sparkfun/SparkFun_APDS-9960_Sensor_Arduino_Library), [ESP32](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/ledc.html), [UART Pico](https://github.com/earlephilhower/arduino-pico/blob/master/docs/serial.rst), [UART Maixduino](https://maixduino.sipeed.com/zh/cores/serial.html).
