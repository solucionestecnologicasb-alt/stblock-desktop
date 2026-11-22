import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Optional --prefix <base> (or --prefix=<base>) for exports served under a base
// path (e.g. /sketchforge inside STBlock). Defaults to "" so the worker public
// path is verified against "/_next/" as before.
function readPrefixArg() {
  const spacedIndex = process.argv.indexOf("--prefix");
  if (spacedIndex !== -1) {
    return process.argv[spacedIndex + 1] ?? "";
  }
  const equalsArg = process.argv.find((arg) => arg.startsWith("--prefix="));
  return equalsArg ? equalsArg.slice("--prefix=".length) : "";
}
const prefix = readPrefixArg().replace(/\/+$/, "");
const expectedPublicPath = `${prefix}/_next/`;

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const exportRoot = join(repositoryRoot, "apps", "web", ".next-export");
const chunksRoot = join(exportRoot, "_next", "static", "chunks");

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listJavaScriptFiles(path) : [path];
    }),
  );

  return files.flat().filter((path) => path.endsWith(".js"));
}

const indexHtml = await readFile(join(exportRoot, "index.html"), "utf8");
if (indexHtml.includes('="./_next/')) {
  throw new Error(
    "Static HTML uses a relative ./_next asset prefix. Worker chunks resolve that prefix " +
      "relative to their own directory and request a duplicated /_next/static/chunks path.",
  );
}

const workerChunks = [];
for (const path of await listJavaScriptFiles(chunksRoot)) {
  const source = await readFile(path, "utf8");
  if (source.includes("importScripts(") && source.includes("static/chunks/")) {
    workerChunks.push({ path, source });
  }
}

if (workerChunks.length === 0) {
  throw new Error("Could not find the generated CAD worker runtime to verify its public path.");
}

for (const { path, source } of workerChunks) {
  const hasExpectedPublicPath =
    source.includes(`.p="${expectedPublicPath}"`) || source.includes(`.p='${expectedPublicPath}'`);
  if (!hasExpectedPublicPath) {
    throw new Error(`Worker runtime ${path} does not use the expected ${expectedPublicPath} public path.`);
  }
}

console.log(`Verified ${workerChunks.length} static worker runtime(s) use ${expectedPublicPath}.`);
