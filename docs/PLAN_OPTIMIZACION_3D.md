# Plan de optimización del visor 3D (SketchForge) y la página "Diseño 3D"

## Diagnóstico

### Retraso al mover objetos (arrastre por manijas de transformación)
En `WorkplaneViewport.tsx`, el flujo de transformación (`transformRef`) llama a `onUpdateShape`
en **cada** evento `pointermove`. Esto:
1. Dispara un re-render completo de `SketchForgeEditor` (~12 800 líneas) + `WorkplaneViewport`
   (~8 400 líneas) en cada movimiento del ratón.
2. Reactiva el shadow map de 2048×2048 en cada frame durante el arrastre.
3. **No baja el pixel ratio** durante estos arrastres: el `setViewportInteractionQuality(true)`
   solo se activa con `pointerdown` sobre el canvas, pero las manijas de transformación son
   elementos DOM encima del canvas, así que nunca se dispara para ese caso.

### Carga inicial lenta
1. `page.tsx` importa `SketchForgeEditor` de forma estática; el chunk principal del editor
   (~649 KB) y ~2.9 MB totales de JS se cargan/parsean al abrir el iframe, aunque solo se
   muestre el dashboard.
2. En `SketchForgeEditor.tsx` (líneas ~6123-6140), un `MutationObserver` ejecuta
   `document.querySelectorAll("button")` sobre TODO el documento en **cada** mutación del DOM,
   lo que causa jank durante el render inicial y durante toda la sesión.

## Cambios propuestos

### A. Visor: eliminar retraso al mover objetos

**A1. Bajar pixel ratio durante los arrastres de transformación**
- En `beginTransform`: llamar `setViewportInteractionQuality(state, true)`.
- En `finishTransform` y en la rama transform de `finishDrag`: llamar
  `setViewportInteractionQuality(state, false)`.

**A2. Reducir el shadow map durante la interacción**
- Guardar la luz direccional clave en `ThreeState.keyLight`.
- En `setViewportInteractionQuality`, al activar: shadow map 1024×1024; al desactivar: 2048×2048.
- Reduce el coste por frame del pase de sombras durante el arrastre.

**A3. Coalescer las actualizaciones React durante el arrastre a 1 por frame**
- Añadir `scheduleTransformMove` que acumula las últimas coordenadas del puntero y ejecuta
  `updateTransform` a lo sumo una vez por `requestAnimationFrame`.
- Usarlo en `handlePointerMove` y en el `onMoveTransform` del `TransformOverlay`.
- Flush síncrono del pendiente en `finishTransform`/`finishDrag` antes de confirmar.

### B. Carga inicial

**B1. Carga diferida del editor (`next/dynamic`)**
- En `page.tsx`, importar `SketchForgeEditor` con `next/dynamic` + `ssr: false` y un skeleton.
- Importar `importedShapeFromStl`/`importedShapeFromSvg` desde `@/lib/stlImport` y `@/lib/svgImport`
  (y hacerlos lazy en el handler de importación) para no arrastrar el editor ni three.js en el
  bundle inicial del dashboard.
- Reduce el JS inicial de ~2.9 MB a solo lo necesario para el dashboard.

**B2. Optimizar el `MutationObserver` de títulos de botones**
- En `SketchForgeEditor.tsx`, debounce con `requestAnimationFrame` para que escanee los botones
  a lo sumo una vez por frame (en vez de en cada mutación).

### C. Verificación
- Reconstruir SketchForge (`pnpm build:sketchforge`), copiar el static export a
  `scratch-gui/build/sketchforge/` y verificar:
  - El dashboard carga más rápido.
  - El editor abre correctamente desde el iframe de STBlock.
  - Mover objetos con las manijas es fluido.
  - No hay errores de consola nuevos.

## Estado final (implementado)

### A. Visor 3D
- **A1 pixel ratio**: `setViewportInteractionQuality(state, true)` en `beginTransform`
  (WorkplaneViewport.tsx:3822) y `false` en `finishTransform` (:4172) y en las ramas
  transform/marquee/body-drag de `finishDrag` (:5287, :5336, :5371).
- **A2 shadow map**: se guardó la luz direccional en `ThreeState.keyLight`; al activar la
  interacción se reduce a 1024×1024 (diferido 150 ms para no recrear el mapa en clics rápidos),
  y al terminar se restaura a 2048×2048. Helper `setShadowMapSize`.
- **A3 coalescer**: `scheduleTransformMove` + `flushPendingTransformMove` (rAF). Se usa en
  `handlePointerMove` (:5075) y en `TransformOverlay.onMoveTransform` (:5740). Al finalizar se
  hace flush síncrono para confirmar la posición final. Se eliminó el `requestRender()` redundante
  del handler (el efecto de `shapes` ya lo dispara), evitando un draw obsoleto por frame.

### B. Carga inicial
- **B1**: `page.tsx` ahora importa `SketchForgeEditor` con `next/dynamic` (`ssr:false`, skeleton),
  e importa lazy `importedShapeFromStl`/`importedShapeFromSvg`/`importExtensionSupported` en el
  handler de archivos. El worker de CAD se crea de forma perezosa
  (`cadModifierWorkerRestartRef.current = createWorker`, sin llamarlo al montar).
- **B2**: `applyTitles` debounced con `requestAnimationFrame`.

### Resultados
- First Load JS del dashboard: ~2.9 MB → **223 kB** (chunk del editor, ~1.36 MB, ahora lazy).
- `npm run typecheck`: OK. `npm run export:stblock`: OK (solo el warning pre-existente de brepjs).
- Export copiado a `scratch-gui/build/sketchforge/` (webpack `-0dd9a8cbd844565c`, 9 ficheros occt,
  manifold.js/wasm preservados, sin chunks obsoletos).
- El aviso "Critical dependency ... brepjs" viene de `node_modules/brepjs` (require dinámico
  interno), es pre-existente y no afecta al runtime.
