// Parchea el static export de SketchForge para que cargue sus assets (_next)
// de forma relativa a su directorio actual, en lugar de asumir la raíz del dominio /sketchforge/.
// Esto permite que funcione idéntico en:
// 1. Tauri Desktop (http://tauri.localhost/sketchforge/)
// 2. Android WebView (http://tauri.localhost/sketchforge/)
// 3. WordPress / Servidor Web (https://stbacademy.net/.../assets/editor/sketchforge/)
// 4. Servidor local Vite / Dev (:8601, :3000)

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function patchSketchforgeDirectory(sketchforgeDir) {
  console.log(`[patch-sketchforge] Parcheando assets relativos en: ${sketchforgeDir}`);

  // 1. Parchear index.html y páginas HTML
  const htmlFiles = ['index.html', '404.html', '404/index.html'];
  for (const relPath of htmlFiles) {
    const fullPath = join(sketchforgeDir, relPath);
    try {
      let content = await readFile(fullPath, 'utf8');

      // Inyectar helper de ruta dinámica al inicio del head si no existe
      const marker = 'data-sketchforge-dynamic-base';
      if (!content.includes(marker)) {
        const script = `<script ${marker}>(function(){try{var p=window.location.pathname;if(!p.endsWith("/")){p=p.endsWith(".html")?p.substring(0,p.lastIndexOf("/")+1):(p+"/");}window.__SKETCHFORGE_PUBLIC_PATH__=p+"_next/";}catch(e){}})();</script>`;
        content = content.replace('<head>', `<head>${script}`);
      }

      // Convertir todos los enlaces /sketchforge/_next/ a ./_next/
      content = content.replace(/\/sketchforge\/_next\//g, './_next/');

      await writeFile(fullPath, content, 'utf8');
      console.log(`[patch-sketchforge] OK: ${relPath} actualizado a rutas relativas.`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn(`[patch-sketchforge] Aviso al leer ${relPath}:`, err.message);
      }
    }
  }

  // 2. Parchear archivos JavaScript en _next/static/chunks
  const chunksDir = join(sketchforgeDir, '_next', 'static', 'chunks');
  try {
    const entries = await readdir(chunksDir);
    let patchedChunks = 0;

    for (const entry of entries) {
      if (!entry.endsWith('.js')) continue;
      const fullPath = join(chunksDir, entry);
      let content = await readFile(fullPath, 'utf8');
      let changed = false;

      // Parchear asignación de publicPath en webpack y chunks:
      // Ej: r.p="/sketchforge/_next/" o t.p="/sketchforge/_next/"
      if (content.includes('="/sketchforge/_next/"')) {
        content = content.replace(
          /([a-zA-Z_$][a-zA-Z0-9_$]*)\.p="\/sketchforge\/_next\/"/g,
          '$1.p=(typeof window!=="undefined"&&window.__SKETCHFORGE_PUBLIC_PATH__?window.__SKETCHFORGE_PUBLIC_PATH__:"/sketchforge/_next/")'
        );
        changed = true;
      }

      // Parchear cualquier ruta residual a imagen
      if (content.includes('"/sketchforge/_next/image/"')) {
        content = content.replace(/"\/sketchforge\/_next\/image\/"/g, '"_next/image/"');
        changed = true;
      }

      if (changed) {
        await writeFile(fullPath, content, 'utf8');
        patchedChunks++;
      }
    }
    console.log(`[patch-sketchforge] OK: ${patchedChunks} chunks JS de Webpack actualizados con publicPath dinámico.`);
  } catch (err) {
    console.warn(`[patch-sketchforge] Aviso en chunksDir:`, err.message);
  }

  // 3. Parchear _buildManifest.js
  async function findAndPatchManifest(dir) {
    try {
      const files = await readdir(dir, { withFileTypes: true });
      for (const f of files) {
        const full = join(dir, f.name);
        if (f.isDirectory()) {
          await findAndPatchManifest(full);
        } else if (f.name === '_buildManifest.js') {
          let content = await readFile(full, 'utf8');
          if (content.includes('/sketchforge/_next/')) {
            content = content.replace(/\/sketchforge\/_next\//g, '_next/');
            await writeFile(full, content, 'utf8');
            console.log(`[patch-sketchforge] OK: _buildManifest.js actualizado.`);
          }
        }
      }
    } catch {}
  }
  await findAndPatchManifest(join(sketchforgeDir, '_next', 'static'));

  console.log(`[patch-sketchforge] Parcheo de SketchForge finalizado con éxito.`);
}

// Si se ejecuta directamente desde CLI:
if (process.argv[1] && process.argv[1].endsWith('patch-sketchforge-relative.mjs')) {
  const targetDir = process.argv[2] || 'C:/stb/scratch-gui/build/sketchforge';
  await patchSketchforgeDirectory(targetDir);
}
