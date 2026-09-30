// SPDX-License-Identifier: MIT
// Root census: what has to agree across the repository, seen in both colours.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { parcial } = require("./_parcial.cjs");
const { CASOS: CASOS_ANCLA } = require("../packages/ancla/test/_casos.cjs");
const { SABOTAJES: SABOTAJES_REGLA } = require("../packages/eslint-plugin-ancla/test/_sabotajes.cjs");
const { SABOTAJES: SABOTAJES_ANCLA } = await import("../packages/ancla/test/_sabotajes.mjs");

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8");
const PKG = JSON.parse(leer("package.json"));
const PAQUETES = fs
  .readdirSync(path.join(RAIZ, "packages"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

// ---- pure functions, so that each one can also be seen red ----

export function diferenciasScript(reales, script) {
  const listados = script.split(/\s+/).filter((x) => x.startsWith("test/"));
  return {
    sinListar: reales.filter((f) => !listados.includes(f)),
    sinFichero: listados.filter((f) => !reales.includes(f)),
  };
}

export function versionDelChangelog(texto) {
  const m = /^## \[(\d+\.\d+\.\d+)\]/m.exec(texto);
  return m ? m[1] : null;
}

const CON_SPDX = /\.(?:c?m?js|c?m?ts|md|ya?ml)$|^\.gitignore$|\/\.gitignore$/;
const CC_BY = (rel) => rel === "README.md" || rel.startsWith("ensayo/");

export function spdxQueFalla(ficheros) {
  const fallos = [];
  for (const { rel, texto } of ficheros) {
    const cabeza = texto.split("\n").slice(0, 5).join("\n");
    const m = /SPDX-License-Identifier:\s*([A-Za-z0-9.+-]+)/.exec(cabeza);
    const esperado = CC_BY(rel) ? "CC-BY-4.0" : "MIT";
    if (!m) fallos.push(`${rel}: sin cabecera SPDX en las 5 primeras líneas`);
    else if (m[1] !== esperado) fallos.push(`${rel}: dice ${m[1]} y le toca ${esperado}`);
  }
  return fallos;
}

function ficherosDeTexto() {
  const salida = [];
  const pila = [RAIZ];
  while (pila.length) {
    const dir = pila.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if ([".git", "node_modules", ".worktrees"].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      const rel = path.relative(RAIZ, p).split(path.sep).join("/");
      if (e.isDirectory()) pila.push(p);
      else if (e.isFile() && CON_SPDX.test(rel)) salida.push({ rel, texto: fs.readFileSync(p, "utf8") });
    }
  }
  return salida;
}

// ---- the census ----

test("hay paquetes que censar", () => {
  assert.deepEqual(PAQUETES, ["ancla", "eslint-plugin-ancla"]);
});

test("la licencia MIT de cada paquete es, byte a byte, la de la raíz", () => {
  const raiz = fs.readFileSync(path.join(RAIZ, "LICENSE"));
  for (const p of PAQUETES) {
    const suya = fs.readFileSync(path.join(RAIZ, "packages", p, "LICENSE"));
    assert.ok(raiz.equals(suya), `packages/${p}/LICENSE no es igual que LICENSE`);
  }
});

test("el texto legal de CC BY 4.0 está entero junto a la prosa que licencia", (t) => {
  const ruta = path.join(RAIZ, "LICENSE-CC-BY-4.0.txt");
  if (!fs.existsSync(ruta)) {
    return parcial(t, "falta LICENSE-CC-BY-4.0.txt: el texto legal íntegro se descarga de creativecommons.org y esa descarga está pendiente de permiso");
  }
  const texto = fs.readFileSync(ruta, "utf8");
  assert.match(texto, /Attribution 4\.0 International Public License/);
  assert.match(texto, /Section 1.{0,5}Definitions/);
});

test("la versión es la misma en los package.json y en la primera entrada del CHANGELOG", () => {
  const delChangelog = versionDelChangelog(leer("CHANGELOG.md"));
  assert.ok(delChangelog, "el CHANGELOG no tiene ninguna entrada ## [x.y.z]");
  const versiones = { raiz: PKG.version };
  for (const p of PAQUETES) versiones[p] = JSON.parse(leer("packages", p, "package.json")).version;
  for (const [quien, v] of Object.entries(versiones)) assert.equal(v, delChangelog, `${quien} dice ${v} y el CHANGELOG ${delChangelog}`);
});

test("el censo de versiones sabe fallar", () => {
  assert.equal(versionDelChangelog("# Changelog\n\n## [Unreleased]\n\n## [0.2.0] - 2026-01-01\n"), "0.2.0");
  assert.equal(versionDelChangelog("# Changelog\n\nnada\n"), null);
});

test("test:raiz lista cada test/*.test.* de la raíz, y nada que no exista", () => {
  const reales = fs.readdirSync(path.join(RAIZ, "test")).filter((f) => /\.test\.[cm]?js$/.test(f)).map((f) => `test/${f}`);
  assert.ok(reales.length >= 3, `solo hay ${reales.length} pruebas en test/`);
  assert.deepEqual(diferenciasScript(reales, PKG.scripts["test:raiz"]), { sinListar: [], sinFichero: [] });
  assert.match(PKG.scripts.test, /npm run test:raiz/);
  assert.match(PKG.scripts.test, /--workspaces/);
});

test("el censo de scripts sabe fallar, por los dos lados", () => {
  const d = diferenciasScript(["test/a.test.mjs", "test/nuevo.test.mjs"], "node --test test/a.test.mjs test/borrado.test.mjs");
  assert.deepEqual(d, { sinListar: ["test/nuevo.test.mjs"], sinFichero: ["test/borrado.test.mjs"] });
});

test("cada fichero de texto lleva su cabecera SPDX, y la que le toca", () => {
  const ficheros = ficherosDeTexto();
  assert.ok(ficheros.length >= 20, `solo se han encontrado ${ficheros.length} ficheros de texto`);
  assert.deepEqual(spdxQueFalla(ficheros), []);
});

test("el censo SPDX sabe fallar: sin cabecera, y con la licencia equivocada", () => {
  const fallos = spdxQueFalla([
    { rel: "x.mjs", texto: "console.log(1)\n" },
    { rel: "ensayo/x.md", texto: "<!-- SPDX-License-Identifier: MIT -->\n" },
    { rel: "y.cjs", texto: "// SPDX-License-Identifier: MIT\n" },
  ]);
  assert.deepEqual(fallos, ["x.mjs: sin cabecera SPDX en las 5 primeras líneas", "ensayo/x.md: dice MIT y le toca CC-BY-4.0"]);
});

// ---- the numbers the prose quotes are the numbers of the code ----

export function numerosQueNoCuadran(textos, reglas) {
  const fallos = [];
  for (const { fichero, patron, esperado } of reglas) {
    const hallados = [...(textos[fichero] ?? "").matchAll(new RegExp(patron.source, "g"))].map((m) => Number(m[1]));
    if (hallados.length === 0) fallos.push(`${fichero}: no cita el número (${patron})`);
    for (const n of hallados) if (n !== esperado) fallos.push(`${fichero}: dice ${n} y son ${esperado} (${patron})`);
  }
  return fallos;
}

const CITAS = [
  { fichero: "packages/ancla/README.md", patron: /(\d+) sabotages/, esperado: SABOTAJES_ANCLA.length },
  { fichero: "packages/eslint-plugin-ancla/README.md", patron: /(\d+) sabotages/, esperado: SABOTAJES_REGLA.length },
  { fichero: "CHANGELOG.md", patron: /table of (\d+) cases/, esperado: CASOS_ANCLA.length },
  { fichero: "CHANGELOG.md", patron: /(\d+) sabotages, one/, esperado: SABOTAJES_ANCLA.length },
  { fichero: "CHANGELOG.md", patron: /(\d+) sabotages with the expected/, esperado: SABOTAJES_REGLA.length },
  { fichero: "ensayo/los-dos-colores.md", patron: /con (\d+) sabotajes —uno por/, esperado: SABOTAJES_ANCLA.length },
  { fichero: "ensayo/los-dos-colores.md", patron: /con (\d+), en `packages\/eslint-plugin-ancla/, esperado: SABOTAJES_REGLA.length },
];

test("los números de casos y sabotajes que citan los textos son los del código", () => {
  const textos = Object.fromEntries([...new Set(CITAS.map((c) => c.fichero))].map((f) => [f, leer(f)]));
  assert.deepEqual(numerosQueNoCuadran(textos, CITAS), []);
});

test("el censo de números sabe fallar: un número viejo y una cita que desaparece", () => {
  const reglas = [
    { fichero: "a.md", patron: /(\d+) sabotages/, esperado: 56 },
    { fichero: "b.md", patron: /(\d+) sabotages/, esperado: 26 },
  ];
  assert.deepEqual(numerosQueNoCuadran({ "a.md": "then 53 sabotages", "b.md": "no number here" }, reglas), [
    "a.md: dice 53 y son 56 (/(\\d+) sabotages/)",
    "b.md: no cita el número (/(\\d+) sabotages/)",
  ]);
});
