# STBlock Updates

STBlock usa Tauri Updater con paquetes firmados. El código fuente puede vivir en un repo privado, pero los binarios de actualización deben publicarse en un repo público de distribución para no exponer tokens en la app.

## Repos recomendados

- Privado: `STB-Academy/stblock-private`
- Público solo releases: `STB-Academy/stblock-releases`

El endpoint configurado actualmente es:

```text
https://github.com/solucionestecnologicasb-alt/stblock-releases/releases/latest/download/latest.json
```

La política recomendada/obligatoria se lee desde:

```text
https://github.com/solucionestecnologicasb-alt/stblock-releases/releases/latest/download/policy.json
```

Para pruebas locales puedes cambiarlo desde DevTools:

```js
localStorage.stblock_update_policy_url = 'http://localhost:9000/policy.json'
window.dispatchEvent(new CustomEvent('stblock-check-updates', {detail: {manual: true}}))
```

Para volver a producción:

```js
localStorage.removeItem('stblock_update_policy_url')
```

## Llaves

Se generó una llave de desarrollo local en:

```text
%USERPROFILE%\.tauri\stblock-update-dev.key
```

La pública está en `src-tauri/tauri.conf.json`. La clave anterior se perdió tras reinstalar Windows. La primera versión publicada con la clave nueva requiere una instalación manual en los equipos que todavía tienen la clave pública anterior. Las versiones siguientes deben firmarse con la misma clave privada nueva.

Guarda una copia de la clave privada fuera del repositorio. Si necesitas restaurarla en otra ruta, indica esa ruta con `TAURI_SIGNING_PRIVATE_KEY_PATH`. Si está protegida, configura `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` en la sesión que ejecutará el deploy.

Puedes comprobar la firma sin compilar ni publicar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-all.ps1 -CheckSigning
```

`pnpm deploy:all` incrementa la versión y publica el instalador firmado. Para completar una versión que ya figura en `tauri.conf.json`, usa:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-all.ps1 -Bump none
```

El deploy actualiza los archivos del plugin en Local Sites. El instalador de la web pública cambia cuando se despliegan esos archivos al servidor WordPress.

## Actualizaciones en Debian

El deploy normal espera el build Linux, firma el `.deb` con la misma clave del updater y publica las entradas `linux-x86_64-deb` y `linux-x86_64` en `latest.json`. Este paquete está destinado a Debian/Ubuntu amd64.

La aplicación busca actualizaciones al abrirse y desde Ajustes. «Actualizar ahora» descarga el paquete firmado, solicita autorización del sistema, ejecuta `dpkg -i` y reinicia STBlock. Necesita permisos administrativos y una sesión gráfica con autenticación de polkit. El paquete recomienda `pkexec` y `polkitd`; comprueba su disponibilidad si la instalación original se hizo con `dpkg -i`, que no resuelve recomendaciones automáticamente. Si falla la instalación, el aviso conserva la descarga manual como alternativa.

Para que las instalaciones con la clave anterior vean el aviso de migración en «Buscar actualizaciones», publica la versión de transición con `pnpm deploy:all -ManualMigrationNotice`. El aviso dirigirá a los usuarios a https://www.stbacademy.net/stblock para instalarla manualmente una vez. Despliega también el instalador actualizado en WordPress para que esa página entregue la versión anunciada. Las versiones posteriores se publican con `pnpm deploy:all`.

## Publicar policy manual con GitHub CLI

Ejemplo recomendado:

```powershell
.\scripts\publish-update-policy.ps1 `
  -Repo "STB-Academy/stblock-releases" `
  -Tag "v0.1.1" `
  -Level recommended `
  -Version "0.1.1" `
  -MinimumVersion "0.1.0" `
  -Notes "Prueba de actualización recomendada"
```

Ejemplo obligatorio:

```powershell
.\scripts\publish-update-policy.ps1 `
  -Repo "STB-Academy/stblock-releases" `
  -Tag "v0.1.2" `
  -Level mandatory `
  -Version "0.1.2" `
  -MinimumVersion "0.1.2" `
  -Notes "Prueba de actualización obligatoria"
```

## Probar local sin GitHub

```powershell
cd updates
python -m http.server 9000
```

Luego en STBlock DevTools:

```js
localStorage.stblock_update_policy_url = 'http://localhost:9000/policy.example.json'
window.dispatchEvent(new CustomEvent('stblock-check-updates', {detail: {manual: true}}))
```

Para obligatorio:

```js
localStorage.stblock_update_policy_url = 'http://localhost:9000/policy.mandatory.example.json'
window.dispatchEvent(new CustomEvent('stblock-check-updates', {detail: {manual: true}}))
```
