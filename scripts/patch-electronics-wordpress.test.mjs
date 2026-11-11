import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { patchElectronicsWordPress } from "./patch-electronics-wordpress.mjs";

const fixture = `
let importing = false;
async function persist(doc) {
  if (importing) return false;
  try {
    await fetch("/api/circuit-state", {method: "POST", body: JSON.stringify(doc)});
  } catch {
    localStorage.setItem("electronics_lab_circuit_state_file", JSON.stringify(doc));
    window.parent.postMessage({type: "STBLOCK_SAVE_CIRCUIT_FILE", payload: doc}, "*");
  }
  return false;
}
function watch(store) {
  const id = setInterval(() => {
    fetch("/api/circuit-state?t=" + Date.now());
    store.loadUniversalCircuitDocument({});
  }, 1000);
  return () => clearInterval(id);
}
`;

for (const [name, source, saveName, watchName, guardName] of [
  ["formatted", fixture, "persist", "watch", "importing"],
  ["minified", fixture.replace(/\s+/g, " ").replaceAll("return false;", "return!1;"), "persist", "watch", "importing"],
  ["renamed", fixture.replaceAll("persist", "saveRenamed").replaceAll("watch", "pollRenamed").replaceAll("importing", "busyFlag").replace(/\bdoc\b/g, "payload"), "saveRenamed", "pollRenamed", "busyFlag"],
]) {
  test(`WordPress save and polling work with ${name} bundles`, async () => {
    const patched = patchElectronicsWordPress(source);
    const saved = new Map();
    const messages = [];
    const storage = { setItem: (key, value) => saved.set(key, value) };
    const api = vm.runInNewContext(patched + `;({
      save: ${saveName},
      watch: ${watchName},
      setImporting: value => { ${guardName} = value; }
    })`, {
      localStorage: storage,
      window: { parent: { postMessage: (message, origin) => messages.push({ message, origin }) } },
      fetch: () => { throw new Error("WordPress must not call the dev endpoint"); },
      setInterval: () => { throw new Error("WordPress must not poll"); },
    });
    const document = { schema: "test", circuit: { components: [] } };
    assert.equal(await api.save(document), true);
    assert.deepEqual(JSON.parse(saved.get("electronics_lab_circuit_state_file")), document);
    assert.equal(messages[0].message.type, "STBLOCK_SAVE_CIRCUIT_FILE");
    assert.equal(messages[0].message.filename, "circuit-state.json");
    assert.equal(messages[0].message.payload, document);
    assert.equal(messages[0].origin, "*");
    assert.equal(typeof api.watch({}), "function");
    api.watch({})();
    api.setImporting(true);
    assert.equal(await api.save(document), false);
    assert.equal(messages.length, 1);
    api.setImporting(false);
    storage.setItem = () => { throw new Error("Quota exceeded"); };
    assert.equal(await api.save(document), false);
    assert.equal(patchElectronicsWordPress(patched), patched);
  });
}

test("unexpected circuit-state logic fails validation", () => {
  assert.throws(() => patchElectronicsWordPress(fixture.replace("if (importing) return false;", "")), /Cambio inesperado/);
  assert.throws(() => patchElectronicsWordPress(fixture.replace("setInterval", "setTimeout")), /No se identificaron/);
});

test("unrelated bundles are preserved", () => {
  const source = "export const version = 1;";
  assert.equal(patchElectronicsWordPress(source), source);
});
