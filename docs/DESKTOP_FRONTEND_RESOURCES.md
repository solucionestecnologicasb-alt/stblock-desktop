# Recursos de la interfaz de escritorio

La interfaz compilada de `scratch-gui/build` se instala en `$RESOURCE/frontend`.
`resource_assets.rs` la sirve mediante el protocolo habitual de Tauri, conservando
las rutas, el origen y la comunicación con Rust. Los audios permanecen incluidos
y funcionan sin conexión. Windows y Linux usan el mismo proveedor; Android
conserva sus recursos incrustados y su configuración específica.
En desarrollo, `build.rs` omite la copia de `frontend`: `pnpm tauri dev` sigue
usando el servidor de desarrollo sin exigir una compilación previa de la interfaz.

No volver a incrustar todo el frontend mediante `generate_context!()` en escritorio.
Con las bibliotecas y voces incluidas, el frontend superó 1 GB. En la compilación
fallida de 0.1.64, `lib.rmeta` ocupaba 4.991.077.930 bytes dentro de un `.rlib` de
6.712.595.988 bytes y Rust rechazaba sus metadatos con E0786. Distribuir los archivos
como recursos evita ese crecimiento de los metadatos; borrar la caché no resuelve
por sí solo la causa.

`bundle.resources` usa un mapa para mantener las carpetas `drivers`,
`tools/Arduino` y `backends` en sus destinos anteriores y agregar `frontend`.
El instalador debe distribuir la carpeta completa; copiar solo el EXE no basta.
El proveedor solo permite leer archivos dentro de la carpeta de recursos y
no genera hashes CSP porque la aplicación configura `security.csp = null`.

Prueba del lector independiente de Tauri:

```powershell
rustc --test src-tauri/src/resource_files.rs -o "$env:TEMP\stblock-resource-assets-test.exe"
& "$env:TEMP\stblock-resource-assets-test.exe"
```

Para reintentar un despliegue que ya incrementó la versión, sin incrementarla
otra vez:

```powershell
pnpm deploy:all -Bump none
```

Si el instalador de esa versión ya terminó de generarse correctamente, se puede
reanudar la firma y publicación sin repetir la compilación:

```powershell
pnpm deploy:all -Bump none -SkipInstallerBuild
```
