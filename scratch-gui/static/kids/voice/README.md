# Narración incluida de STBlock Kids

Los WAV de `es/` son recursos de producto, no una caché descargada por el usuario. Se incluyen en Windows, Debian, Android y la web al copiar `scratch-gui/static`. No se distribuye ningún sintetizador ni modelo de voz dentro de la aplicación.

## Fuentes de voz

- Motor de generación: Piper 1.8.0, usado únicamente durante la preparación de los archivos. Proyecto: https://github.com/OHF-Voice/piper1-gpl (GPL-3.0).
- Voz: `es_ES-davefx-medium`, español de España, 22.050 Hz. Modelo y configuración: https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_ES/davefx/medium
- La ficha de esta versión del modelo declara CC0 para el conjunto de grabaciones y para la voz base rdh: https://huggingface.co/rhasspy/piper-voices/raw/main/es/es_ES/davefx/medium/MODEL_CARD
- El SHA-256 del modelo utilizado y de cada archivo generado están en `es/manifest.json`.

## Regeneración

1. Instalar `piper-tts==1.8.0` en un entorno de herramientas separado del programa y descargar el modelo y su `.onnx.json`.
2. Ejecutar desde la raíz: `python scripts/generate-kids-voice.py --model RUTA/es_ES-davefx-medium.onnx`.
3. Ejecutar `node scripts/verify-kids-voice-assets.mjs` y `node --test scripts/kids-voice.test.mjs`.
4. Versionar los WAV y el manifiesto junto al cambio de textos. La compilación no necesita Python, Piper, el modelo, internet ni claves de servicios de voz.

Los WAV usan PCM mono de 16 bits para evitar depender de códecs de compresión particulares. Los archivos existentes se reutilizan: para sustituir una grabación o cambiar de voz, mueve antes los WAV afectados fuera de `es/` y vuelve a generar y verificar el catálogo. La URL de reproducción incorpora el hash del contenido para evitar reutilizar una grabación anterior desde la caché.
