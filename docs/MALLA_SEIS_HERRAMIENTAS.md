# Herramientas de malla — 12 de septiembre de 2026

Disponibles dentro del panel izquierdo del modo Malla. Las secciones se despliegan y el panel permite desplazamiento vertical.

| Herramienta | Uso | Alcance actual |
| --- | --- | --- |
| Cuchillo — K | Marca dos puntos sobre una cara; el movimiento muestra el corte y el segundo clic confirma. Esc restaura la pieza. | Línea recta extendida hasta los bordes de una cara plana convexa. No es todavía un trazado libre continuo a través de varias caras. |
| Corte en bucle — Ctrl+R | Selecciona una arista. Mueve el ratón o escribe la posición en porcentaje; Enter confirma. | Recorre bandas de cuadriláteros planos. Se detiene en triángulos y otros polígonos. |
| Borde interior / Inset — I | Selecciona caras y ajusta la distancia en milímetros, con ratón o entrada numérica. | Inset individual en caras planas convexas; comprueba que el ancho no cruce el contorno. |
| Bisel — Ctrl+B | Selecciona aristas, ajusta el ancho y confirma. El panel permite elegir de 1 a 8 segmentos antes de empezar. | Sólidos convexos cerrados con normales exteriores. Un segmento produce chaflán; varios aproximan el redondeo. |
| Soldar — M | Dos o más vértices: soldar al centro. Para puntos próximos, usa Soldar por distancia y su tolerancia en mm. | Remapea índices, elimina vértices sin uso, triángulos degenerados y duplicados. Soldar regiones lejanas puede cambiar radicalmente la forma. |
| Disolver | Selecciona aristas y pulsa Disolver aristas coplanares. | Quita la división entre dos caras coplanares conservando los triángulos de la superficie. |
| Ajuste magnético | Elige Cuadrícula, Vértices o Aristas. Shift+S alterna cuadrícula/apagado. | Actúa al mover: ajusta el centro de la selección a destinos fijos de la misma malla. Captura de vértices/aristas a 14 píxeles. Respeta X/Y/Z; los valores escritos tienen prioridad. |
| Simetría | Elige X, Y o Z antes de G/R/S o de arrastrar una manija. | Refleja desplazamientos entre pares existentes respecto al centro inicial de la pieza. No genera una mitad nueva ni constituye un modificador Mirror persistente. Si ambos lados están seleccionados, manda el positivo. |
| Edición proporcional — O | Actívala y ajusta el radio en mm antes de transformar. | Influencia suave por distancia espacial; círculo visible durante la transformación. No limita influencia por conectividad. |

Enter confirma y Esc cancela las operaciones interactivas. También funcionan desde el campo numérico. Cada operación confirmada ocupa una entrada en Deshacer; las previsualizaciones no se guardan como pasos separados. El guardado se bloquea mientras haya una operación pendiente. Las ayudas de transformación son opciones de la sesión de edición. La simetría y la influencia proporcional no se aplican a la creación de paredes de extrusión.

## Implementación y rendimiento

- Los cortes propagan puntos a los triángulos vecinos para evitar uniones abiertas. Inset y bucle conservan la triangulación original de las caras no modificadas.
- El bisel usa recortes por planos y tapas compartidas; incluye los puntos existentes sobre cada plano para cerrar las esquinas de varios biseles.
- Las previsualizaciones topológicas se agrupan por frame. Por ahora se limita su inicio a mallas de 40 000 triángulos; esto es un límite preventivo, no una garantía de fluidez a ese tamaño.
- Las transformaciones reutilizan buffers. La influencia proporcional se calcula una vez al iniciar mediante búsqueda espacial; la soldadura por distancia usa celdas espaciales y no compara todos los pares de la malla.
- No se ha implementado una pila de modificadores no destructivos equivalente a Blender.

## Verificación

- Compilación de producción e integración en `scratch-gui/build/sketchforge` correctas; comprobación de tipos incluida.
- 305 pruebas unitarias en 44 archivos. Incluyen superficie cerrada y orientación de triángulos, área/volumen, cancelación por parámetros inválidos y conservación de caras al convertir a pieza.
- 25 comprobaciones en Chrome sobre export de producción: 11 de estas herramientas y 14 de regresión. Se verifican las operaciones con teclado/ratón, deshacer, ajuste magnético a distinta profundidad, simetría, radio proporcional y el flujo SKF existente.
- Scripts: `sketchforge/scripts/mesh-six-browser-qa.mjs`, `mesh-edit-browser-qa.mjs` y `mesh-menu-browser-qa.mjs` (este último después del anterior).
- Se conserva la advertencia heredada de dependencia dinámica de brepjs. No se recompiló un instalador de escritorio.

Referencias de comportamiento: [edición de mallas de Blender](https://docs.blender.org/manual/en/5.2/modeling/meshes/editing/index.html), [cortes en bucle](https://docs.blender.org/manual/en/latest/modeling/meshes/tools/loop.html), [transformaciones y edición proporcional](https://docs.blender.org/manual/en/4.2/modeling/meshes/editing/mesh/transform/basic.html). Los límites anteriores describen nuestra implementación, no las capacidades completas de Blender.
