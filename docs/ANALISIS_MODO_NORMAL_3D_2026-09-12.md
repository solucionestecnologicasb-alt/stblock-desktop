# Análisis y mejoras del modo normal 3D

Fecha: 12 de septiembre de 2026.

## Alcance

Revisión del flujo Biblioteca → colocación → transformación de piezas, Boceto y Crear 2D. Implementación sobre SketchForge integrado en STBlock. Se conservaron las herramientas de Malla existentes.

## Correcciones implementadas

| Problema encontrado | Cambio y resultado |
| --- | --- |
| Pulsar una pieza la insertaba en el centro. | Ahora inicia una previsualización que sigue al cursor sobre el plano activo. Un clic confirma; Escape o clic derecho cancela. La confirmación crea un único paso de historial. |
| Una carga asíncrona podía utilizar una lista antigua de piezas. | La confirmación utiliza el estado más reciente. Un identificador de solicitud descarta resultados de cargas sustituidas o canceladas. Cambiar de proyecto o entrar en otro modo invalida la colocación. |
| Soltar desde la biblioteca calculaba la intersección a altura cero. | El arrastre nativo utiliza la altura del plano activo y exige una intersección válida. |
| Los controles de rotación mezclaban centros y orientaciones que no correspondían a los ejes de transformación. | Los tres controles comparten el centro real y bases de ejes coherentes con la rotación aplicada. Se retiraron los antiguos semicírculos redundantes y se identifican X, Y y Z con texto y color. |
| Plegar paneles podía cambiar el tamaño del visor sin actualizar su proyección. | Un ResizeObserver actualiza la cámara al cambiar el tamaño real del contenedor. |
| El SVG del boceto desbordaba verticalmente su área disponible. | El lienzo ocupa explícitamente su contenedor. Antes se observó una altura aproximada de 1394 px en un espacio de 740 px; la prueba de navegador ahora comprueba que encaja. |
| Boceto exponía demasiadas acciones al mismo nivel. | Seleccionar, línea, rectángulo, círculo y borrar quedan visibles; las herramientas adicionales están en un desplegable. Terminar y cancelar permanecen accesibles. |
| Crear 2D mostraba configuración y operaciones antes de tener un perfil. | Planos y formas adicionales quedan plegados. Las operaciones aparecen automáticamente al existir geometría. |
| El botón de opciones de visibilidad abría ayuda. | Se retiró ese botón engañoso. |
| Un icono utilizaba una ruta absoluta incompatible con el montaje bajo /sketchforge. | Se corrigió la ruta del recurso. |
| Un boceto vacío anunciaba que el trayecto de tubería estaba listo. | El mensaje depende ahora de que realmente existan segmentos. |
| El filtrado de piezas de referencia generaba una lista nueva en cada render del editor. | La lista se memoriza para evitar invalidaciones innecesarias del cálculo de referencias del boceto. |

## Optimización de colocación

La previsualización crea un objeto temporal independiente de la colección persistente. El movimiento actualiza su transformación mediante requestAnimationFrame, sin reconstruir la pieza ni escribir en el historial por cada evento del ratón. Al cancelar o confirmar se retiran sus eventos y recursos. No se han medido mejoras de FPS en escenas grandes; las pruebas comprueban la reutilización del objeto y el comportamiento observable.

## Problemas pendientes y prioridades

### Prioridad alta: precisión de herramientas de boceto

1. **Proyección real de contornos.** `projectSelectedShapesToSketch` genera círculos/elipses para ciertas primitivas y rectángulos para otras piezas. No reproduce la silueta exacta de una malla ni sus huecos. El mensaje de contorno asociable es más amplio que la implementación: no se crea una dependencia paramétrica con la pieza original. Hace falta proyección geométrica real y comunicación explícita de sus límites.
2. **Offset coherente.** `deriveSketchEntity` aplica reglas por tipo. Para texto y vectores escala un 10 %, aunque el control dice «Offset +2 mm». Una ampliación no equivale a un desplazamiento constante del contorno. Deben separarse ambos operadores y validar autointersecciones.
3. **Parámetros editables y previsualización.** Patrones usan cantidades/espaciados predeterminados y los tratamientos de esquina tienen dimensiones internas fijas. Conviene exponer solamente los parámetros del operador activo, con previsualización, confirmar y cancelar.
4. **Validación geométrica consistente.** Unificar los mensajes y requisitos de contorno abierto/cerrado, cruces y huecos antes de extruir o cortar. Una interfaz más compacta no sustituye esta validación.

### Prioridad media: rendimiento y mantenimiento

- Medir escenas representativas con numerosas piezas y STL densos: carga, selección, órbita, transformaciones y booleanas. Decidir con esas mediciones qué cálculos adicionales mover a workers.
- Auditar la agrupación del historial en todas las ediciones de puntos y parámetros; la colocación nueva ya confirma como una sola operación.
- Extraer de `SketchForgeEditor.tsx` los controladores de colocación, boceto y operadores 2D para reducir acoplamiento. El editor y el visor siguen siendo archivos grandes.
- La cancelación de colocación descarta resultados asíncronos tardíos; no debe interpretarse como garantía de que toda descarga o decodificación en curso se aborte físicamente.

## Validación realizada

- 305 pruebas unitarias aprobadas en 44 archivos durante esta intervención.
- 11 comprobaciones de navegador del modo normal: previsualización/cancelación, colocación y deshacer/rehacer, rotación numérica real y pivote, órbita, redimensionamiento, ejes, interfaz contextual, tamaño del SVG, creación de sólido desde Boceto y extrusión desde Crear 2D.
- 25 comprobaciones de regresión de Malla aprobadas con el nuevo paso de colocación.
- Compilación de producción, comprobación de tipos, exportación y copia a `scratch-gui/build/sketchforge` completadas. Persiste la advertencia de dependencia dinámica de brepjs.

No se reconstruyó un instalador ni se validaron físicamente todos los dispositivos gráficos o todos los tipos de modelos. Los problemas de precisión enumerados como pendientes no se consideran solucionados por reorganizar la interfaz.
