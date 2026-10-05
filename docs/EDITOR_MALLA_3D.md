# Edición directa de mallas en Diseño 3D

Implementación y validación: 11 de septiembre de 2026.

## Uso

Selecciona una pieza sólida desbloqueada y pulsa **Tab** o **Editar malla**. Tab vuelve al trabajo habitual por piezas. La pieza permanece en el proyecto; los otros objetos aparecen como contexto durante la edición.

| Acción | Acceso |
| --- | --- |
| Seleccionar vértices / aristas / caras | 1 / 2 / 3 |
| Seleccionar varios | Shift + clic |
| Selección rectangular | B y arrastrar, o arrastrar sobre el fondo |
| Seleccionar todo / deseleccionar | A / Alt+A |
| Mover / rotar / escalar | G / R / S, o manijas de las herramientas |
| Restringir una transformación | X / Y / Z; repetir libera el eje |
| Valor exacto | Escribir después de iniciar la transformación; por ejemplo G, X, 5, Enter |
| Confirmar / cancelar | Enter o clic / Esc o clic derecho |
| Extruir caras seleccionadas | E; por defecto sigue la normal de la primera cara seleccionada |
| Conectar dos vértices de una cara | F |
| Crear cara con un contorno coplanar | F con tres o más vértices |
| Insertar vértices conectados | Seleccionar aristas y pulsar Subdividir |
| Eliminar componentes | Supr |
| Deshacer / rehacer | Ctrl+Z / Ctrl+Shift+Z o Ctrl+Y |
| Seleccionar a través de la pieza | Alt+Z o Rayos X |
| Encuadrar selección | Punto (.) |
| Cámara | Rueda para zoom, botón central para orbitar, derecho para desplazar |

La convención G/R/S sigue el [manual de transformaciones de Blender](https://docs.blender.org/manual/en/4.2/modeling/meshes/editing/mesh/transform/basic.html). El proyecto conserva sus ejes: Y es la altura.

## Qué cambió

- Se retiró el panel numérico anterior y el bloque de reconstrucción CAD de vértices/aristas/caras del editor principal.
- El nuevo editor actualiza la superficie durante el arrastre, mediante buffers de Three.js. El movimiento no espera a un worker CAD ni escribe una entrada de historial por cada evento del ratón.
- Los vértices se comparten entre triángulos. Mover una arista deforma las caras adyacentes. Conectar vértices divide una superficie real; subdividir incorpora vértices a las caras existentes.
- Cada operación parte de una instantánea. Esc restaura esa instantánea, incluida la conectividad de una extrusión provisional. Confirmar registra una sola operación en el historial principal.
- El controlador dibuja mediante requestAnimationFrame y actualiza buffers como máximo una vez por fotograma. Durante las transformaciones no recalcula la agrupación de caras ni reconstruye objetos React por cada movimiento.
- La conversión a pieza conserva las coordenadas sin redondear las dimensiones. El archivo SKF conserva la agrupación de triángulos en caras editables mediante `importedMesh.editFaceGroups`.

## Compatibilidad y límites

Editar una superficie convierte la pieza modificada en una malla. Se eliminan las referencias CAD que ya no describen esa superficie; deshacer recupera el estado anterior. STL/OBJ y el proyecto editable SKF siguen usando la geometría resultante. Una malla deformada libremente no conserva automáticamente una representación STEP exacta.

Se edita una pieza cada vez. La selección, agrupación y transformación de piezas continúa en el modo original. El editor permite mallas abiertas; borrar caras no equivale a una operación booleana de sólido. Crear caras se limita a contornos coplanares sencillos, y conectar vértices requiere compartir el contorno de una cara. No es una implementación completa de las herramientas de Blender.

Las pruebas de interfaz se ejecutaron en Chrome con la exportación estática de producción. No se validó el ejecutable Windows ni se reconstruyó el instalador en este cambio.

## Validación

- TypeScript y compilación `pnpm run build:sketchforge`: aprobados. Export copiado a `scratch-gui/build/sketchforge`; verificados los dos runtimes de worker con prefijo `/sketchforge/_next/`.
- 288 pruebas unitarias aprobadas, incluidas 10 nuevas de geometría conectada, instantáneas, partición de caras y precisión de persistencia.
- 8 pruebas STEP con OpenCascade real aprobadas.
- 8 recorridos de navegador aprobados tanto en desarrollo como en la exportación estática: arrastre de vértice y arista antes de soltar, cancelación, deshacer/rehacer, valores exactos, escala/rotación, extrusión y reapertura SKF.
- Medición puntual en Chrome headless: esfera de 1.106 vértices y 2.208 triángulos, 60 actualizaciones de buffers; media 0,79 ms y percentil 95 de 1,10 ms. Mide actualización de geometría en CPU, no latencia total ni FPS garantizados para otros modelos o equipos.
- Advertencias preexistentes de build: dependencia dinámica de brepjs y formato de configuración de Vitest.

[Resultados de navegador](media/mesh-edit/browser-results.json) · [Captura durante el arrastre](media/mesh-edit/drag.png) · [Editor con una pieza editada](media/mesh-edit/editor.png)

## Archivos principales

- `components/MeshEditWorkspace.tsx`: controles y modo de edición.
- `lib/meshEditViewport.ts`: selección, cámara, manijas, teclado y actualización del visor.
- `lib/editableMesh.ts`, `lib/meshConnect.ts`: geometría y conectividad.
- `lib/editableMeshShape.ts`: conversión precisa a la pieza persistida.
- `lib/skfProject.ts`: conservación de las caras editables en SKF.

Para repetir las pruebas de navegador, iniciar Chrome con un perfil temporal fuera del repositorio y `--remote-debugging-port=9317`; ejecutar `node scripts/mesh-edit-browser-qa.mjs` desde `sketchforge`. Usa el editor de desarrollo en el puerto 3017 o la URL indicada en `MESH_QA_URL`. Las capturas y resultados se escriben en el directorio temporal del sistema, subcarpeta `stb-mesh-qa`, o en `MESH_QA_OUTPUT`.


## Ampliación del menú — 12 de septiembre de 2026

- Navegación: derecho o central orbita; Shift + derecho desplaza; rueda acerca. Vista ofrece seis direcciones centradas en la pieza (Num 1/3/7 y Ctrl para la opuesta). Son vistas en perspectiva.
- Seleccionar: todo, nada, invertir (Ctrl+I), conectados (Ctrl+L), ampliar/reducir (Ctrl +/-). Shift+clic y recuadro B mantienen selección múltiple; Alt+Z permite atravesar la superficie.
- Superficie: añadir puntos medios a aristas; conectar dos vértices del contorno de una cara con J/F; insertar un vértice en cada triángulo de las caras seleccionadas; triangular (Ctrl+T); invertir normales; suavizar vértices al 50%; alinear al centro en X/Y/Z.
- Todas las operaciones geométricas entran en el historial. Inserción usa los triángulos existentes para evitar cruzar contornos cóncavos o superficies dobladas. Suavizado modifica posiciones, no solo el sombreado.

Alcance: los puntos y líneas nuevos pertenecen a superficies existentes. Esta ampliación no implementa dibujo de vértices/aristas sueltos, Knife, loop cut, bisel interactivo, edición proporcional ni todos los modificadores de Blender. Alinear o suavizar puede aplanar/deformar la selección; se puede deshacer.

Referencia de comportamiento: https://docs.blender.org/manual/en/latest/modeling/meshes/editing/vertex/make_face_edge.html y https://docs.blender.org/manual/en/4.2/modeling/meshes/editing/face/poke_faces.html. La inserción actual opera por triángulo, no replica el abanico por polígono de Poke Faces.

Validación de esta ampliación: typecheck correcto, 293 pruebas unitarias (42 archivos), build:sketchforge correcto; 8 comprobaciones de regresión y 6 del nuevo menú en Chrome sobre export de producción. mesh-menu-browser-qa.mjs se ejecuta después de mesh-edit-browser-qa.mjs. Se confirmó órbita con objetivo fijo, desplazamiento con Shift, vista frontal, inversión múltiple, inserción/deshacer y triangulación/deshacer. Advertencia heredada de brepjs en build. No se generó un instalador nuevo.


## Actualización posterior: seis grupos de herramientas

El alcance de la ampliación anterior queda actualizado por [MALLA_SEIS_HERRAMIENTAS.md](MALLA_SEIS_HERRAMIENTAS.md): cuchillo, bucle, inset/bisel, soldadura/disolución, ajuste magnético y simetría/edición proporcional ya están disponibles con los límites y validaciones descritos allí.
