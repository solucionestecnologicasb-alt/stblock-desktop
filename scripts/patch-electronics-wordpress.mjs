import { parse } from "acorn";

const marker = "/*stblock-wordpress-circuit-sync*/";

function inspectFunction(node) {
  const strings = new Set();
  let polls = false;
  let loadsCircuit = false;

  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "Literal" && typeof value.value === "string") {
      strings.add(value.value);
    }
    if (value.type === "CallExpression") {
      if (value.callee.type === "Identifier" && value.callee.name === "setInterval") polls = true;
      if (value.callee.type === "MemberExpression" &&
          value.callee.property.name === "loadUniversalCircuitDocument") loadsCircuit = true;
    }
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
    }
  }

  visit(node.body);
  return { strings, polls, loadsCircuit };
}

export function patchElectronicsWordPress(source, filename = "Electronics Lab") {
  const tree = parse(source, { ecmaVersion: "latest", sourceType: "module" });
  if (source.includes(marker) || !source.includes("/api/circuit-state")) return source;

  const functions = tree.body
    .filter((node) => node.type === "FunctionDeclaration")
    .map((node) => ({ node, ...inspectFunction(node) }));
  const saves = functions.filter(({ strings }) =>
    strings.has("/api/circuit-state") &&
    strings.has("electronics_lab_circuit_state_file") &&
    strings.has("STBLOCK_SAVE_CIRCUIT_FILE"));
  const watchers = functions.filter(({ strings, polls, loadsCircuit }) =>
    polls && loadsCircuit && [...strings].some((value) => value.startsWith("/api/circuit-state")));

  if (saves.length !== 1 || watchers.length !== 1) {
    throw new Error(`No se identificaron de forma univoca el guardado y el polling de circuit-state en ${filename}.`);
  }

  const save = saves[0].node;
  const watcher = watchers[0].node;
  const guard = save.body.body[0];
  const guardReturn = guard?.consequent?.type === "BlockStatement"
    ? guard.consequent.body[0]
    : guard?.consequent;
  const returned = guardReturn?.argument;
  const returnsFalse = returned?.type === "Literal" && returned.value === false ||
    returned?.type === "UnaryExpression" && returned.operator === "!" &&
    returned.argument.type === "Literal" && returned.argument.value === 1;
  if (!save.async || save.params.length !== 1 || save.params[0].type !== "Identifier" ||
      guard?.type !== "IfStatement" || guard.alternate ||
      guardReturn?.type !== "ReturnStatement" || !returnsFalse) {
    throw new Error(`Cambio inesperado en la funcion de guardado de circuit-state en ${filename}.`);
  }

  const parameter = save.params[0].name;
  const guardSource = source.slice(guard.start, guard.end);
  const saveBody = `{
    ${marker}
    ${guardSource}
    try {
      const serialized = JSON.stringify(${parameter});
      localStorage.setItem("electronics_lab_circuit_state_file", serialized);
      if (typeof window !== "undefined" && window.parent) {
        window.parent.postMessage({
          type: "STBLOCK_SAVE_CIRCUIT_FILE",
          filename: "circuit-state.json",
          payload: ${parameter}
        }, "*");
      }
      return true;
    } catch {
      return false;
    }
  }`;
  const edits = [
    { start: save.body.start, end: save.body.end, text: saveBody },
    { start: watcher.body.start, end: watcher.body.end, text: "{ return () => {}; }" },
  ].sort((left, right) => right.start - left.start);

  let patched = source;
  for (const edit of edits) {
    patched = patched.slice(0, edit.start) + edit.text + patched.slice(edit.end);
  }
  parse(patched, { ecmaVersion: "latest", sourceType: "module" });
  return patched;
}
