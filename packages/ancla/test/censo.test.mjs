// SPDX-License-Identifier: MIT
// The census of the package: what has to agree, each rule seen in both colours.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { SABOTAJES } from "./_sabotajes.mjs";

const require = createRequire(import.meta.url);
const { CASOS } = require("./_casos.cjs");

const PAQUETE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG = JSON.parse(fs.readFileSync(path.join(PAQUETE, "package.json"), "utf8"));

export function diferenciasScript(reales, script) {
  const listados = script.split(/\s+/).filter((x) => x.startsWith("test/"));
  return { sinListar: reales.filter((f) => !listados.includes(f)), sinFichero: listados.filter((f) => !reales.includes(f)) };
}

export function casosSinSabotaje(casos, sabotajes) {
  const vistos = new Set(sabotajes.flatMap((s) => Object.keys(s.caen)));
  return casos.map((c) => c.nombre).filter((n) => !vistos.has(n));
}

export function sabotajesFantasma(casos, sabotajes) {
  const nombres = new Set(casos.map((c) => c.nombre));
  return sabotajes.flatMap((s) => Object.keys(s.caen).filter((n) => !nombres.has(n)).map((n) => `${s.id} → ${n}`));
}

test("scripts.test lista cada test/*.test.* y nada que no exista", () => {
  const reales = fs.readdirSync(path.join(PAQUETE, "test")).filter((f) => /\.test\.[cm]?js$/.test(f)).map((f) => `test/${f}`);
  assert.ok(reales.length >= 4, `solo hay ${reales.length} pruebas`);
  assert.deepEqual(diferenciasScript(reales, PKG.scripts.test), { sinListar: [], sinFichero: [] });
});

test("el censo de scripts sabe fallar, por los dos lados", () => {
  const d = diferenciasScript(["test/a.test.mjs", "test/nueva.test.mjs"], "node --test test/a.test.mjs test/vieja.test.mjs");
  assert.deepEqual(d, { sinListar: ["test/nueva.test.mjs"], sinFichero: ["test/vieja.test.mjs"] });
});

test("hay casos de los dos colores, con nombres únicos", () => {
  const verdes = CASOS.filter((c) => c.color === "verde").length;
  const rojos = CASOS.filter((c) => c.color === "rojo").length;
  assert.ok(verdes > 0 && rojos > 0, `verdes ${verdes} · rojos ${rojos}`);
  assert.equal(verdes + rojos, CASOS.length, "hay casos con un color que no es verde ni rojo");
  assert.equal(new Set(CASOS.map((c) => c.nombre)).size, CASOS.length, "hay nombres de caso repetidos");
});

test("cada caso lo ha visto caer al menos un sabotaje", () => {
  assert.deepEqual(casosSinSabotaje(CASOS, SABOTAJES), [], "nadie lo ha visto caer");
});

test("ningún sabotaje espera un caso que no existe, y cada uno está completo", () => {
  assert.deepEqual(sabotajesFantasma(CASOS, SABOTAJES), []);
  assert.equal(new Set(SABOTAJES.map((s) => s.id)).size, SABOTAJES.length, "hay ids de sabotaje repetidos");
  for (const s of SABOTAJES) {
    assert.ok(s.fichero && typeof s.de === "string" && typeof s.a === "string", `${s.id} está incompleto`);
    assert.ok(Object.keys(s.caen).length > 0, `${s.id} no espera que caiga nada: no demostraría nada`);
    for (const re of Object.values(s.caen)) assert.ok(re instanceof RegExp, `${s.id}: cada causa es una expresión regular`);
  }
});

test("el censo de sabotajes sabe fallar: un caso nuevo sin sabotaje y un sabotaje que espera un fantasma", () => {
  assert.deepEqual(casosSinSabotaje([...CASOS, { nombre: "caso recién escrito" }], SABOTAJES), ["caso recién escrito"]);
  const fantasma = { id: "SX", caen: { "caso que ya no existe": /x/ } };
  assert.deepEqual(sabotajesFantasma(CASOS, [...SABOTAJES, fantasma]), ["SX → caso que ya no existe"]);
});

test("ancla.d.cts y ancla.d.mts son idénticos", () => {
  const cts = fs.readFileSync(path.join(PAQUETE, "ancla.d.cts"));
  const mts = fs.readFileSync(path.join(PAQUETE, "ancla.d.mts"));
  assert.ok(cts.equals(mts), "los dos ficheros de tipos han divergido");
});

test("el LICENSE del paquete es, byte a byte, el de la raíz", () => {
  const suyo = fs.readFileSync(path.join(PAQUETE, "LICENSE"));
  const raiz = fs.readFileSync(path.join(PAQUETE, "..", "..", "LICENSE"));
  assert.ok(suyo.equals(raiz), "packages/ancla/LICENSE no es igual que LICENSE");
});

test("files, main, types y exports apuntan a ficheros que existen, y files los contiene todos", () => {
  const destinos = new Set([PKG.main, PKG.types]);
  const recorrer = (v) => (typeof v === "string" ? destinos.add(v) : Object.values(v).forEach(recorrer));
  recorrer(PKG.exports);
  for (const d of destinos) assert.ok(fs.existsSync(path.join(PAQUETE, d)), `${d} no existe`);
  for (const f of PKG.files) assert.ok(fs.existsSync(path.join(PAQUETE, f)), `files lista ${f} y no existe`);
  const publicados = new Set([...PKG.files.map((f) => `./${f}`), "./package.json"]);
  for (const d of destinos) assert.ok(publicados.has(d), `${d} no está en files: no se publicaría`);
});
