# Reorganización de arquitectura (v2)

Esta rama recrea sobre `main` el trabajo de refactorización que quedó sin
fusionar en las ramas antiguas:

- `chore/toolchain-setup`
- `refactor/architecture-redesign`
- `refactor/backend-removal`
- `refactor/root-reorganization`

No se portó todo de forma automática: cada cambio se revisó contra el estado
actual del proyecto y solo se aplicó lo que seguía siendo necesario.

## Cambios aplicados

### Código muerto

Se eliminaron módulos y componentes sin referencias:

- `scratch-gui/src/lib/ai-block-creator.js`
- `scratch-gui/src/lib/ai-block-structures.js`
- `scratch-gui/src/lib/arduino-generator.js` (sombreaba a
  `arduino-generator/index.js`, que es el que se usa)
- `scratch-gui/src/lib/responsive.js`
- `scratch-gui/src/lib/tablet-full-screen.js`
- `scratch-gui/src/containers/deletion-restorer.jsx`
- `scratch-gui/src/containers/project-watcher.jsx`
- Componentes sin uso del menú: `community-button`, `login-dropdown`,
  `share-button`.
- Modos visuales heredados: `nineties-mode`, `oldtimey-mode`,
  `prehistoric-mode`.

`save-status` se conservó porque todavía tiene una prueba unitaria en
`scratch-gui/test/unit/containers/save-status.test.jsx`.

### Lockfiles y workspaces

- Se eliminaron los `package-lock.json` de la raíz y de los paquetes del
  workspace. `pnpm-lock.yaml` es la única fuente de verdad.
- Se quitó el campo `workspaces` de `package.json`; pnpm usa
  `pnpm-workspace.yaml`.

### Archivos sueltos en la raíz

- `enumerate-menus.js`, `enumerate-structure.js` e `inspect-blocks.mjs`
  pasaron a `scripts/analysis/`.
- `configurar_firewall_aula.bat` pasó a `scripts/windows/`.
- `test_sketch/test_sketch.ino` pasó a `scripts/test/`.
- `autosave_extracted.json` pasó a `test/fixtures/`.
- `UPDATES.md` pasó a `docs/UPDATES.md`.

### Backend eliminado

El servidor Express de `backend/` ya no era necesario:

- La IA usa `scratch-gui/src/lib/ai-service.js` directamente; `/api/chat` y
  `/api/providers` estaban muertos.
- El CRUD de Gearbot se movió a comandos Tauri en `src-tauri/src/lib.rs`.
- Los datos de Gearbot se guardan en `app_local_data_dir()/gears`
  (`maps/`, `robots/`, `assets/`), no en la carpeta de recursos.
- Los assets se sirven con el protocolo `asset://` de Tauri, configurado en
  `tauri.conf.json`, para que imágenes y modelos 3D sigan funcionando sin un
  servidor HTTP.
- `editor.js` usa un helper `gearsApi()` que siempre devuelve un `Response`
  tanto en Tauri como en la web. Esto corrige el bug de la rama anterior, que
  devolvía directamente el valor de `invoke()` mientras los llamadores hacían
  `.json()`.
- Se quitaron los scripts de compilación SEA, recursos de bundle, pasos de CI,
  comprobaciones del instalador NSIS y scripts de `package.json` asociados.

### `openblock-blocks/`

Se eliminó. Solo se mencionaba en comentarios; era una copia antigua del media
de `scratch-blocks`.

### Reorganización en `apps/`

- `scratch-gui` → `apps/gui`
- `scratch-vm` → `apps/vm`
- `sketchforge` → `apps/electronics`

Se mantuvieron los nombres de paquete (`scratch-gui`, `scratch-vm`,
`sketchforge`) para no romper los imports existentes, los filtros de pnpm ni
los enlaces del workspace. Se actualizaron las rutas de filesystem, el
lockfile, Tauri, scripts y documentación.

## Cambios de `chore/toolchain-setup` no aplicados

- **Nix flake / `.envrc` / `setup-linux.sh`**: el proyecto ya se compila y
  ejecuta en Linux con el toolchain del sistema. No aportan nada al flujo
  actual y agregan mantenimiento.
- **`setup-arduino-libs.sh`**: `scripts/prepare-arduino-bundle.sh` y
  `src-tauri/linux/postinstall.sh` ya cubren la preparación de Arduino de forma
  más completa.
- **Normalización de finales de línea**: el repositorio tiene muy pocos
  archivos de texto con CRLF y el cambio generaría ruido sin beneficio claro.
- **`cross-fetch`**: la rama lo agregaba pero el código actual no lo usa.

## Notas

- Los datos antiguos de Gearbot que estuvieran en
  `backend/data/gears` o en la carpeta de recursos no se migran
  automáticamente. A partir de esta versión se leen desde el directorio de
  datos local de la aplicación.
- `scripts/enumerate-*.js` conservan sus rutas de entrada relativas; son
  utilidades de análisis ejecutadas manualmente.
