// SPDX-License-Identifier: MIT
"use strict";
// Every sabotage is applied to a COPY of the rule, in this same process, and
// RuleTester.it is swapped for one that captures failures. Each sabotage must
// make EXACTLY the cases it declares fall.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { parcial } = require("../../../test/_parcial.cjs");
const { VALIDOS, INVALIDOS, OPCIONES_TESTER, cargarEslint } = require("./_casos.cjs");
const { SABOTAJES } = require("./_sabotajes.cjs");

const REGLA = path.join(__dirname, "..", "rules", "no-unchecked-slice.cjs");
const ROMPER = pathToFileURL(path.join(__dirname, "..", "..", "ancla", "test", "_romper.mjs")).href;
const huella = () => crypto.createHash("sha256").update(fs.readFileSync(REGLA)).digest("hex");
const ANTES = huella();
const FUENTE = fs.readFileSync(REGLA, "utf8");
const CASOS = [...VALIDOS, ...INVALIDOS];
const eslint = cargarEslint();

function casoDe(titulo) {
  const c = CASOS.find((x) => x.name === titulo || x.code === titulo);
  return c ? c.name : `(título que no es de ningún caso) ${titulo}`;
}

function correr(regla) {
  const { RuleTester } = eslint;
  const antes = { describe: RuleTester.describe, it: RuleTester.it, itOnly: RuleTester.itOnly };
  const fallos = [];
  RuleTester.describe = (_nombre, fn) => fn();
  RuleTester.it = (titulo, fn) => {
    try {
      fn();
    } catch (e) {
      fallos.push({ nombre: casoDe(titulo), mensaje: String(e && e.message) });
    }
  };
  RuleTester.itOnly = RuleTester.it;
  try {
    new RuleTester(OPCIONES_TESTER).run("no-unchecked-slice", regla, { valid: VALIDOS, invalid: INVALIDOS });
  } finally {
    Object.assign(RuleTester, antes);
  }
  return fallos;
}

async function aplicar(sab) {
  const { romper } = await import(ROMPER);
  const texto = sab ? romper(FUENTE, sab.de, sab.a, sab.id) : FUENTE;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "regla-sabotaje-"));
  try {
    const f = path.join(dir, "no-unchecked-slice.cjs");
    fs.writeFileSync(f, texto);
    let regla;
    try {
      regla = require(f);
    } catch (e) {
      return { carga: e };
    }
    return { fallos: correr(regla) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function comparar(fallos, caen) {
  const cayeron = [...new Set(fallos.map((f) => f.nombre))].sort();
  const esperados = [...caen].sort();
  return cayeron.join("\n") === esperados.join("\n") ? [] : [`cayó: [${cayeron.join(" | ")}] · se esperaba: [${esperados.join(" | ")}]`];
}

if (eslint === null) {
  test("sabotajes de la regla", (t) => parcial(t, "eslint no instalado: los 11 sabotajes de la regla no se han visto caer aquí (quedan para CI)"));
} else {
  test("control: la copia sin tocar pasa entera", async () => {
    const r = await aplicar(null);
    assert.equal(r.carga, undefined, `la copia sin tocar no carga: ${r.carga && r.carga.message}`);
    assert.deepEqual(r.fallos, []);
  });

  for (const s of SABOTAJES) {
    test(`${s.id}: ${s.que}`, async () => {
      const r = await aplicar(s);
      if (r.carga) assert.fail(`el sabotaje ${s.id} rompe la carga, no la prueba (rojo ajeno): ${r.carga.message}`);
      const p = comparar(r.fallos, s.caen);
      assert.deepEqual(p, [], `${p.join("\n")}\n${r.fallos.map((f) => `  ${f.nombre}: ${f.mensaje.split("\n")[0]}`).join("\n")}`);
    });
  }

  test("arnés: un caen equivocado sale rojo y nombra lo que cayó y lo que se esperaba", async () => {
    const r = await aplicar(SABOTAJES.find((s) => s.id === "L01"));
    const p = comparar(r.fallos, ["slice(indexOf(a))"]);
    assert.deepEqual(p, ["cayó: [substring(indexOf(a), indexOf(b))] · se esperaba: [slice(indexOf(a))]"]);
  });
}

test("el original sigue intacto: sha256 de antes y de después", () => {
  assert.equal(huella(), ANTES);
});
