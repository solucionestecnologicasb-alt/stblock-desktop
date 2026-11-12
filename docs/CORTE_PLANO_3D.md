# Cortar piezas en Diseño 3D

El botón **Cortar**, junto a **2D** en la barra de Geometría, abre una herramienta de corte por planos. Selecciona una o más piezas sólidas desbloqueadas. Las piezas ocultas y los objetos de tipo hueco no se usan como objetivos independientes; los huecos ya aplicados a una pieza se conservan.

## Controles

- Plano horizontal (Y es la altura) y planos verticales X/Z.
- Manijas para mover el plano en tres ejes y anillos para girarlo. La cámara sigue disponible para inspeccionar la pieza.
- Posición XYZ en milímetros e inclinación XYZ en grados.
- Distancia desde el borde negativo de la caja de selección, deslizador para recorrer la selección y centrado. En orientación horizontal, esta distancia permite indicar la altura desde la parte inferior de la selección. En orientación oblicua, la referencia es la caja envolvente proyectada sobre la normal.
- Ajuste opcional a 1 mm y 5 grados.
- Conservar ambos lados, el lado de la flecha o el lado contrario.
- Hasta 32 planos paralelos, distribuidos alrededor del plano central con una distancia configurable. Los cortes múltiples conservan ambos lados.
- Grosor de material eliminado simétricamente alrededor de cada plano, independiente de la separación visual/física entre los resultados.
- Separación de los resultados a lo largo de la normal. No altera el tamaño de las piezas obtenidas.
- Separación opcional de componentes desconectados.
- Unión de las piezas seleccionadas antes del corte, o corte de cada pieza por separado. Las piezas ya agrupadas o unidas se cortan usando su geometría efectiva.
- Respaldo opcional de los originales como objetos ocultos.
- Panel minimizable para acceder al visor en pantallas pequeñas.

Pulsa **Vista previa** para calcular el resultado y **Aplicar corte** para confirmarlo. Cambiar los parámetros invalida la vista previa. Cancelar o pulsar Escape conserva el proyecto original. Aplicar registra una sola operación; Ctrl+Z y rehacer incluyen todo el corte y sus respaldos.

## Geometría y límites

La operación usa el motor Manifold existente y su [recorte por semiespacios](https://manifoldcad.org/docs/jsuser/classes/Manifold.html#trimbyplane). Los planos cierran las caras nuevas; no se limita a ocultar una parte del modelo. Se rechazan mallas abiertas/no válidas, planos exteriores o tangentes sin corte y resultados completamente eliminados. La separación entre planos debe superar el grosor eliminado.

El resultado queda como mallas independientes, con el color de la pieza de origen (o de la primera pieza si se fusionan varias). Conserva la geometría de huecos y uniones existentes, pero no genera ensamblajes nuevos de espigas, bisagras o cola de milano. El corte convierte la geometría resultante en malla: no conserva el historial paramétrico ni una representación STEP exacta de los originales. Deshacer o los respaldos permiten recuperar los originales.

Los cálculos se realizan en el navegador con WebAssembly; las mallas grandes y los cortes múltiples pueden tardar. La vista previa no escribe en el historial ni en el proyecto. Se verifica que la escena no haya cambiado antes de aplicar para evitar sobrescribir otra edición.

## Validación

- 13 pruebas nuevas con Manifold real: volúmenes, caras cerradas, orientaciones, altura, grosor, bandas múltiples, unión con hueco, componentes desconectados, casos inválidos, conservación del original y conversión a piezas sin referencias CAD/agrupaciones antiguas.
- Suite completa: 322 pruebas aprobadas.
- TypeScript y exportación estática de STBlock aprobados; advertencia preexistente de dependencia dinámica de brepjs.
- Nueve comprobaciones de navegador sobre la exportaci?n est?tica, incluida la reapertura SKF y el corte de una agrupaci?n real. Recorrido reproducible en `sketchforge/scripts/plane-cut-browser-qa.mjs`: arrastre real, vista previa, aplicar, cancelar, deshacer/rehacer, planos múltiples, grosor, inclinación y respaldo oculto.

Para ejecutar el recorrido, inicia Chrome con un perfil temporal y depuración en el puerto 9317. Ejecuta `node sketchforge/scripts/plane-cut-browser-qa.mjs`; `CUT_QA_URL` permite usar la exportación estática, por ejemplo `http://127.0.0.1:3217/sketchforge/?editor=1`. Los resultados y capturas se guardan en `%TEMP%/stb-plane-cut-qa-artifacts`.
