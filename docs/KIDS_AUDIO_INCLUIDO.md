# Narración de Kids mediante audio incluido

## Comportamiento

La narración de bloques y la narración del modo Historia usan un único reproductor `HTMLAudioElement` en el documento principal de STBlock. Se eliminó el uso de `speechSynthesis` y `SpeechSynthesisUtterance` en ambas rutas.

El catálogo español incluye instrucciones de bloques, variantes de salto/vuelo, los veinte mundos, introducciones, guías, pistas compradas, consejos, reglas, mensajes de resultado, letras, números y operadores. Las frases fijas se reproducen completas cuando existe una coincidencia; las frases variables se componen con fragmentos, palabras y números incluidos. Números fuera del rango normal de campaña se leen dígito por dígito. Las instrucciones genéricas de bloques no necesitan sintetizar nombres arbitrarios de personajes o grabaciones del usuario.

Los efectos de sonido, grabaciones creadas por el usuario y vídeos de las historias mantienen sus rutas de audio existentes. El botón de voz conserva la preferencia de silencio del usuario; después de instalar la actualización puede reactivarse para probar la nueva narración.

## Estabilidad

- Un solo elemento de audio, creado al necesitarse, y una sola cola; no se precargan los 1.553 archivos a memoria.
- Las voces de bloques no interrumpen las explicaciones de historia.
- Una nueva explicación cancela la anterior. Silenciar, cambiar de modo o salir de Kids cancela toda la cola.
- Cancelación protegida mediante identificadores de petición, incluso mientras se carga el manifiesto.
- Errores de reproducción, restricciones de reproducción automática y falta de eventos de finalización detienen la narración sin interrumpir el arrastre ni el proyecto.
- No hay alternativa automática a voces del sistema ni a servicios externos.
- Peticiones del iframe verificadas por origen y ventana de procedencia; solo se aceptan identificadores de bloque conocidos.
- WAV PCM mono 16 bits/22.050 Hz incluidos, aproximadamente 113 MiB en total. Las versiones instaladas no generan ni descargan voces.

## Compilación

`prepare-scratchjr-web.mjs` verifica el catálogo, la existencia y los hashes de las grabaciones antes de sustituir el editor anterior. Si un cambio de textos necesita nuevas grabaciones, el despliegue falla con una explicación para regenerarlas, en lugar de publicar una versión incompleta.

El catálogo se obtiene de los textos y plantillas actuales de Kids, sus reglas de misión y las instrucciones de bloques. La generación es una herramienta de mantenimiento separada, descrita en `scratch-gui/static/kids/voice/README.md`. Los modelos y ejecutables de generación se guardan fuera del repositorio y no forman parte del instalador.

## Validación

- Pruebas del reproductor: orden, prioridad, cancelación, silencio, errores, tiempo máximo, rutas sin TTS y cobertura de los veinte mundos y retos aleatorios.
- Verificación de los 1.553 WAV y sus hashes.
- Compilación completa de STBlock y compatibilidad JavaScript/CSS con Chrome 68.
- Comprobación de navegador sobre el build final: arrastre real, reproducción de WAV local, historia, consejo y silencio sin acceso al sintetizador.

La validación en navegador no sustituye la prueba del instalador actualizado en una Lenovo 100w Gen 3 afectada. El cambio elimina la dependencia del sintetizador que activaba el cierre observado; no se afirma haber reproducido el fallo de hardware original en el entorno de desarrollo.
