# STBlock Updates

STBlock usa Tauri Updater con paquetes firmados. El código fuente puede vivir en un repo privado, pero los binarios de actualización deben publicarse en un repo público de distribución para no exponer tokens en la app.

## Repos recomendados

- Privado: `STB-Academy/stblock-private`
- Público solo releases: `STB-Academy/stblock-releases`

El endpoint configurado actualmente es:

```text
https://github.com/STB-Academy/stblock-releases/releases/latest/download/latest.json
```

La política recomendada/obligatoria se lee desde:

```text
https://github.com/STB-Academy/stblock-releases/releases/latest/download/policy.json
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
C:\Users\bello\.tauri\stblock-update-dev.key
```

La pública está en `src-tauri/tauri.conf.json`. La privada no debe subirse al repo. Para producción conviene generar una nueva llave y guardar estos secretos en GitHub Actions:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

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
