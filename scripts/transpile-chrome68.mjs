/*
 * Chrome 68 (Android System WebView de las Chromebooks ARC++) no entiende la
 * sintaxis moderna con la que se publican los iframes empaquetados:
 *
 *   - ScratchJr / STBlock Kids  (static/scratchjr)
 *   - Electronics Lab / Circuito 3D  (static/electronics-lab)
 *   - SketchForge / Diseño 3D  (sketchforge)
 *
 * En la app principal ya transpila Babel a chrome68, pero estos iframes se
 * compilan con sus propias herramientas (esbuild/Vite/Next) con targets
 * modernos. Aquí se bajan con esbuild sólo esos directorios y se inyecta
 * scripts/chrome68-shims.js como primer script de cada documento, porque el
 * shim inline de index.ejs no se aplica dentro de los iframes.
 *
 * El script es idempotente: los archivos ya transpilados llevan la marca
 * `/*stblock-chrome68*\/` y los HTML llevan `data-stblock-chrome68`.
 *
 * Uso:
 *   node scripts/transpile-chrome68.mjs [ruta-build]
 *
 * También exporta transpileChrome68(buildDir) para que prepare-android-build
 * lo ejecute cuando se invoca `tauri android build` sin `build:app`.
 */
import {copyFile, mkdir, readFile, readdir, stat, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {existsSync, readdirSync} from "node:fs";
import {basename, dirname, extname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const shimSource = resolve(scriptDir, "chrome68-shims.js");
const MARKER = "/*stblock-chrome68*/";
const CSS_MARKER = "/*stblock-chrome68-css*/";

const require = createRequire(import.meta.url);
const esbuild = require(resolve(rootDir, "vendor", "scratchjr-reborn", "node_modules", "esbuild"));

function loadPostcss() {
  const pnpmDir = join(rootDir, "node_modules", ".pnpm");
  if (existsSync(pnpmDir)) {
    const candidates = readdirSync(pnpmDir)
      .filter(name => /^postcss@8\./.test(name))
      .sort((left, right) => left.localeCompare(right, undefined, {numeric: true}));
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const candidate = join(pnpmDir, candidates[index], "node_modules", "postcss");
      if (existsSync(candidate)) return require(candidate);
    }
  }
  throw new Error("No se encontró postcss 8 en node_modules/.pnpm");
}

const postcss = loadPostcss();
const chrome68LegacyCss = require(join(rootDir, "scratch-gui", "scripts", "postcss-chrome68-legacy.cjs"));

// Tailwind v4 (Electronics Lab y SketchForge) emite sintaxis que Chrome 68 no
// entiende. Un at-rule o un selector desconocido hace que el navegador
// descarte el bloque completo, así que hay que traducirlo:
//
//   @layer      (Chrome 99) -> se aplana conservando el orden de origen.
//   @property   (Chrome 85) -> se elimina.
//   @container  (Chrome 105) -> se aproxima con @media del viewport.
//   :is/:where  (Chrome 88) -> :matches, que Chrome 68 sí soporta.
//   :has        (Chrome 105) -> la regla se elimina (no hay equivalente).
//   oklch()     (Chrome 111) -> rgb/rgba; si no, --color-* queda inválido y se
//                               pierden todos los colores de Tailwind.
function oklchToCss(args) {
  const [colorPart, alphaPart] = args.split("/");
  const parts = colorPart.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  let lightness = parseFloat(parts[0]);
  if (/%$/.test(parts[0])) lightness /= 100;
  let chroma = parseFloat(parts[1]);
  if (/%$/.test(parts[1])) chroma = (chroma / 100) * 0.4;
  const hue = parseFloat(parts[2]);
  if (!isFinite(lightness) || !isFinite(chroma) || !isFinite(hue)) return null;

  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const lp = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mp = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sp = lightness - 0.0894841775 * a - 1.2914855480 * b;
  const l = lp * lp * lp;
  const m = mp * mp * mp;
  const s = sp * sp * sp;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ];
  const encode = channel => {
    const gamma = channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(gamma * 255)));
  };
  const [red, green, blue] = linear.map(encode);

  let alpha = 1;
  if (alphaPart !== undefined) {
    const raw = alphaPart.trim();
    alpha = /%$/.test(raw) ? parseFloat(raw) / 100 : parseFloat(raw);
    if (!isFinite(alpha)) alpha = 1;
    alpha = Math.max(0, Math.min(1, alpha));
  }
  if (alpha >= 1) return `rgb(${red}, ${green}, ${blue})`;
  return `rgba(${red}, ${green}, ${blue}, ${Math.round(alpha * 1000) / 1000})`;
}

function replaceOklch(value) {
  if (value.indexOf("oklch(") === -1) return value;
  return value.replace(/oklch\(\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (whole, args) => {
    const converted = oklchToCss(args);
    return converted || whole;
  });
}

const flattenCssLayers = {
  postcssPlugin: "stblock-flatten-css-layers",
  Once(root) {
    root.walkAtRules("layer", atRule => {
      if (atRule.nodes && atRule.nodes.length) {
        atRule.replaceWith(...atRule.nodes);
      } else {
        atRule.remove();
      }
    });
    root.walkAtRules("property", atRule => atRule.remove());
    root.walkAtRules("container", atRule => {
      const condition = atRule.params.match(/\(([^()]*)\)\s*$/);
      atRule.name = "media";
      atRule.params = condition ? `(${condition[1]})` : "all";
    });
  },
  Rule(rule) {
    if (rule.selector.indexOf(":has(") !== -1) {
      rule.remove();
      return;
    }
    if (rule.selector.indexOf(":is(") !== -1 || rule.selector.indexOf(":where(") !== -1) {
      rule.selector = rule.selector
        .replace(/:is\(/g, ":matches(")
        .replace(/:where\(/g, ":matches(");
    }
  },
  Declaration(decl) {
    decl.value = replaceOklch(decl.value);
  }
};

const HTML_ATTRIBUTE = "data-stblock-chrome68";

async function listFiles(directory, extension, result = []) {
  if (!existsSync(directory)) return result;
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await listFiles(fullPath, extension, result);
    } else if (extname(entry.name).toLowerCase() === extension) {
      result.push(fullPath);
    }
  }
  return result;
}

async function transpileFile(file) {
  if (file.endsWith("chrome68-shims.js")) return false;
  const source = await readFile(file, "utf8");
  if (source.startsWith(MARKER)) return false;
  const {size} = await stat(file);
  // El build asm.js de sql.js (motor de STBlock Kids en Chrome 68) viene
  // minificado; sin minificarWhitespace esbuild lo reimprime y pasa de 1.3 a
  // 8 MB, lo que penaliza el parseo en la Chromebook.
  const compact = /^sql-asm(\.min)?\.js$/i.test(basename(file));
  try {
    const result = await esbuild.transform(source, {
      loader: "js",
      target: "chrome68",
      legalComments: "none",
      charset: "utf8",
      sourcefile: file,
      ...(compact ? {minifyWhitespace: true, minifySyntax: true} : {})
    });
    const output = MARKER + result.code;
    await writeFile(file, output);
    console.log(`[chrome68] ${file.slice(rootDir.length + 1)} (${(size / 1024).toFixed(0)} KB)`);
    return true;
  } catch (error) {
    console.warn(`[chrome68] No se pudo transpilar ${file.slice(rootDir.length + 1)}: ${String(error.message).slice(0, 200)}`);
    return false;
  }
}

async function transpileDirectory(directory) {
  let changed = 0;
  for (const file of await listFiles(directory, ".js")) {
    if (file.endsWith(".map")) continue;
    if (await transpileFile(file)) changed += 1;
  }
  return changed;
}

async function processCssFile(file) {
  const source = await readFile(file, "utf8");
  if (source.startsWith(CSS_MARKER)) return false;
  // ScratchJr resuelve expresiones ${...} (css_vh/css_vw/scaleMultiplier) en
  // tiempo de ejecución desde el propio CSS. PostCSS no puede parsearlas, así
  // que las enmascaramos durante el análisis y las restauramos al escribir.
  const expressions = [];
  const masked = source.replace(/\$\{([^{}]*)\}/g, whole => {
    expressions.push(whole);
    return `__STBLOCK_EXPR_${expressions.length - 1}__`;
  });
  try {
    const result = await postcss([flattenCssLayers, chrome68LegacyCss()]).process(masked, {from: file});
    const css = result.css.replace(/__STBLOCK_EXPR_(\d+)__/g, (whole, index) => {
      const original = expressions[Number(index)];
      return original === undefined ? whole : original;
    });
    await writeFile(file, CSS_MARKER + css);
    const {size} = await stat(file);
    console.log(`[chrome68] css ${file.slice(rootDir.length + 1)} (${(size / 1024).toFixed(0)} KB)`);
    return true;
  } catch (error) {
    console.warn(`[chrome68] No se pudo procesar ${file.slice(rootDir.length + 1)}: ${String(error.message).slice(0, 200)}`);
    return false;
  }
}

async function processCssDirectory(directory) {
  let changed = 0;
  for (const file of await listFiles(directory, ".css")) {
    if (await processCssFile(file)) changed += 1;
  }
  return changed;
}

async function injectShim(htmlPath, src) {
  if (!existsSync(htmlPath)) return false;
  let html = await readFile(htmlPath, "utf8");
  if (html.includes(HTML_ATTRIBUTE)) return false;
  const tag = `<script ${HTML_ATTRIBUTE} src="${src}"></script>`;
  const headMatch = html.match(/<head[^>]*>/i);
  html = headMatch ? html.replace(headMatch[0], headMatch[0] + tag) : tag + html;
  await writeFile(htmlPath, html);
  console.log(`[chrome68] shim -> ${htmlPath.slice(rootDir.length + 1)}`);
  return true;
}

// Chrome 68 no conoce 'wasm-unsafe-eval' (Chrome 97). En CSP2 sql.js sólo
// puede compilar WebAssembly con 'unsafe-eval'; sin él Kids se queda en blanco.
async function patchKidsCsp(htmlPath) {
  if (!existsSync(htmlPath)) return;
  let html = await readFile(htmlPath, "utf8");
  if (html.includes("'wasm-unsafe-eval' 'unsafe-eval'")) return;
  if (!html.includes("'wasm-unsafe-eval'")) return;
  html = html.replace(
    "script-src 'self' 'wasm-unsafe-eval'",
    "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'"
  );
  await writeFile(htmlPath, html);
  console.log(`[chrome68] CSP wasm -> ${htmlPath.slice(rootDir.length + 1)}`);
}

async function installShim(directory, pages) {
  await mkdir(directory, {recursive: true});
  await copyFile(shimSource, join(directory, "chrome68-shims.js"));
  for (const page of pages) {
    await injectShim(page.path, page.src);
  }
}

export async function transpileChrome68(buildDir = resolve(rootDir, "scratch-gui", "build")) {
  if (!existsSync(join(buildDir, "index.html"))) {
    console.warn(`[chrome68] No existe ${buildDir}/index.html; se omite la compatibilidad de iframes.`);
    return;
  }

  const staticDir = join(buildDir, "static");
  const kidsDir = join(staticDir, "scratchjr");
  const electronicsDir = join(staticDir, "electronics-lab");
  const gearsDir = join(staticDir, "gears");
  const sketchforgeDir = join(buildDir, "sketchforge");
  const kidsAppDir = join(kidsDir, "app");

  const gearsPages = (await listFiles(gearsDir, ".html")).map(path => ({
    path,
    src: "chrome68-shims.js"
  }));

  // 1. Shim del documento principal (complementa los shims inline de index.ejs).
  await installShim(staticDir, [{path: join(buildDir, "index.html"), src: "static/chrome68-shims.js"}]);

  // 2. STBlock Kids: ScratchJr usa CSP 'self', el script externo es válido.
  const kidsPages = ["index", "home", "editor", "gettingstarted"].map(name =>
    join(kidsAppDir, `${name}.html`));
  await installShim(kidsDir, kidsPages.map(path => ({path, src: "../chrome68-shims.js"})));
  for (const pagePath of kidsPages) {
    await patchKidsCsp(pagePath);
  }

  // 3. Circuito 3D.
  await installShim(electronicsDir, [{path: join(electronicsDir, "index.html"), src: "chrome68-shims.js"}]);

  // 4. Simulador Gears: su Blockly 12.5.1 usa Array.flat/flatMap (Chrome 69).
  await installShim(gearsDir, gearsPages);

  // 5. Diseño 3D (SketchForge). El 404 vive en una subcarpeta.
  const sketchforgePages = [
    {path: join(sketchforgeDir, "index.html"), src: "chrome68-shims.js"},
    {path: join(sketchforgeDir, "404.html"), src: "chrome68-shims.js"},
    {path: join(sketchforgeDir, "404", "index.html"), src: "../chrome68-shims.js"}
  ];
  await installShim(sketchforgeDir, sketchforgePages);

  // 6. Bajar la sintaxis de los bundles de los iframes.
  const changed = (await transpileDirectory(kidsDir)) +
    (await transpileDirectory(electronicsDir)) +
    (await transpileDirectory(sketchforgeDir));

  // 7. Aplanar @layer y añadir fallbacks de CSS moderno (Tailwind v4).
  //    ScratchJr también usa CSS moderno en varios archivos (p. ej. los docks
  //    de STBlock Kids neutralizan los botones con `inset:auto`; sin fallback
  //    Chrome 68 los deja con sus coordenadas originales y el botón de play
  //    aparece fuera de sitio). Sin este paso Kids quedaba sin layout.
  const cssChanged = (await processCssDirectory(kidsDir)) +
    (await processCssDirectory(electronicsDir)) +
    (await processCssDirectory(sketchforgeDir));

  console.log(`[chrome68] ${changed} archivo(s) JS y ${cssChanged} CSS transpilado(s) a Chrome 68.`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  transpileChrome68(process.argv[2] ? resolve(process.argv[2]) : undefined)
    .catch(error => {
      console.error("[chrome68] Error fatal:", error);
      process.exitCode = 1;
    });
}
