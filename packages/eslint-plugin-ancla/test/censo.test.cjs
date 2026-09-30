// SPDX-License-Identifier: MIT
"use strict";
// Census of the plugin. None of this needs eslint, so it always runs.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { VALIDOS, INVALIDOS } = require("./_casos.cjs");
const { SABOTAJES } = require("./_sabotajes.cjs");

const PAQUETE = path.join(__dirname, "..");
const PKG = JSON.parse(fs.readFileSync(path.join(PAQUETE, "package.json"), "utf8"));
const FUENTE = fs.readFileSync(path.join(PAQUETE, "rules", "no-unchecked-slice.cjs"), "utf8");
const DOCS = fs.readFileSync(path.join(PAQUETE, "docs", "rules", "no-unchecked-slice.md"), "utf8");
const ROMPER = pathToFileURL(path.join(PAQUETE, "..", "ancla", "test", "_romper.mjs")).href;
const CASOS = [...VALIDOS, ...INVALIDOS];

function diferenciasScript(reales, script) {
  const listados = script.split(/\s+/).filter((x) => x.startsWith("test/"));
  return { sinListar: reales.filter((f) => !listados.includes(f)), sinFichero: listados.filter((f) => !reales.includes(f)) };
}

function casosSinSabotaje(casos, sabotajes) {
  const vistos = new Set(sabotajes.flatMap((s) => Object.keys(s.caen)));
  return casos.map((c) => c.name).filter((n) => !vistos.has(n));
}

function sabotajesFantasma(casos, sabotajes) {
  const nombres = new Set(casos.map((c) => c.name));
  return sabotajes.flatMap((s) => Object.keys(s.caen).filter((n) => !nombres.has(n)).map((n) => `${s.id} → ${n}`));
}

test("scripts.test lista cada test/*.test.* y nada que no exista", () => {
  const reales = fs.readdirSync(path.join(PAQUETE, "test")).filter((f) => /\.test\.[cm]?js$/.test(f)).map((f) => `test/${f}`);
  assert.deepEqual(diferenciasScript(reales, PKG.scripts.test), { sinListar: [], sinFichero: [] });
});

test("hay casos de los dos colores, cada uno con nombre, y los nombres no se repiten", () => {
  assert.ok(VALIDOS.length > 0 && INVALIDOS.length > 0);
  for (const c of CASOS) assert.ok(typeof c.name === "string" && c.name !== "", `caso sin nombre: ${c.code}`);
  assert.equal(new Set(CASOS.map((c) => c.name)).size, CASOS.length, "hay nombres repetidos");
  assert.equal(new Set(CASOS.map((c) => c.code)).size, CASOS.length, "hay código repetido");
});

test("cada caso, válido o inválido, lo ha visto caer al menos un sabotaje", () => {
  assert.deepEqual(casosSinSabotaje(CASOS, SABOTAJES), [], "nadie lo ha visto caer");
  assert.deepEqual(sabotajesFantasma(CASOS, SABOTAJES), []);
});

test("el censo de sabotajes sabe fallar", () => {
  assert.deepEqual(casosSinSabotaje([...CASOS, { name: "caso nuevo" }], SABOTAJES), ["caso nuevo"]);
  assert.deepEqual(sabotajesFantasma(CASOS, [...SABOTAJES, { id: "LX", caen: { "caso borrado": /x/ } }]), ["LX → caso borrado"]);
});

test("cada sabotaje se aplica: su ancla está una sola vez en la regla y el texto cambia", async () => {
  const { romper } = await import(ROMPER);
  for (const s of SABOTAJES) {
    const roto = romper(FUENTE, s.de, s.a, s.id);
    assert.notEqual(roto, FUENTE, `${s.id} no cambió el texto`);
    assert.ok(Object.keys(s.caen).length > 0, `${s.id} no espera que caiga nada`);
    for (const re of Object.values(s.caen)) assert.ok(re instanceof RegExp, `${s.id}: cada causa es una expresión regular`);
  }
  assert.equal(new Set(SABOTAJES.map((s) => s.id)).size, SABOTAJES.length, "ids repetidos");
});

test("los huecos, límites y exenciones declarados están escritos en docs, con el mismo código que su caso", () => {
  const declarados = VALIDOS.filter((c) => /declarad[oa]/.test(c.name));
  assert.ok(declarados.length >= 6, `solo hay ${declarados.length} casos declarados`);
  for (const c of declarados) assert.ok(DOCS.includes(c.code), `docs no enseña el caso «${c.name}»: ${c.code}`);
});

test("el LICENSE del paquete es, byte a byte, el de la raíz", () => {
  const suyo = fs.readFileSync(path.join(PAQUETE, "LICENSE"));
  const raiz = fs.readFileSync(path.join(PAQUETE, "..", "..", "LICENSE"));
  assert.ok(suyo.equals(raiz));
});

test("main, exports y files apuntan a ficheros que existen", () => {
  const destinos = [PKG.main, ...Object.values(PKG.exports)];
  for (const d of [...destinos, ...PKG.files]) assert.ok(fs.existsSync(path.join(PAQUETE, d)), `${d} no existe`);
  assert.equal(PKG.devDependencies.eslint, "9.39.5", "la versión de desarrollo de eslint va exacta");
});
