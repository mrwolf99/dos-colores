// SPDX-License-Identifier: MIT
"use strict";
// Every sabotage is applied to a COPY of the rule, in this same process, and
// run through a subclass of RuleTester whose `it` captures failures (the
// class itself is never touched). Each sabotage must make EXACTLY the cases it
// declares fall, each for its own cause. That the original is left as it was
// is checked from outside this script (git diff --exit-code in CI); the check
// at the bottom is only an early warning.

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
  const fallos = [];
  class Capturador extends eslint.RuleTester {}
  Capturador.describe = (_nombre, fn) => fn();
  Capturador.it = (titulo, fn) => {
    try {
      fn();
    } catch (e) {
      fallos.push({ nombre: casoDe(titulo), mensaje: String(e && e.message) });
    }
  };
  Capturador.itOnly = Capturador.it;
  new Capturador(OPCIONES_TESTER).run("no-unchecked-slice", regla, { valid: VALIDOS, invalid: INVALIDOS });
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

// Empty list: what fell is exactly what was declared, each for its cause.
function comparar(fallos, caen) {
  const cayeron = [...new Set(fallos.map((f) => f.nombre))].sort();
  const esperados = Object.keys(caen).sort();
  const problemas = [];
  if (cayeron.join("\n") !== esperados.join("\n")) problemas.push(`cayó: [${cayeron.join(" | ")}] · se esperaba: [${esperados.join(" | ")}]`);
  for (const f of fallos) {
    if (caen[f.nombre] && !caen[f.nombre].test(f.mensaje)) problemas.push(`«${f.nombre}» cayó por otra causa: ${f.mensaje.split("\n")[0]}`);
  }
  return problemas;
}

if (eslint === null) {
  test("sabotajes de la regla", (t) =>
    parcial(t, `eslint no instalado: los ${SABOTAJES.length} sabotajes de la regla no se han visto caer aquí (quedan para CI)`));
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

  // ---- the harness, in both colours ----

  const L01 = SABOTAJES.find((s) => s.id === "L01");

  test("arnés: un caen equivocado sale rojo y nombra lo que cayó y lo que se esperaba", async () => {
    const r = await aplicar(L01);
    const p = comparar(r.fallos, { "slice(indexOf(a))": /./ });
    assert.deepEqual(p, ["cayó: [substring(indexOf(a), indexOf(b))] · se esperaba: [slice(indexOf(a))]"]);
  });

  test("arnés: el caso correcto cayendo por otra causa también sale rojo", async () => {
    const r = await aplicar(L01);
    const p = comparar(r.fallos, { "substring(indexOf(a), indexOf(b))": /una causa que no es la suya/ });
    assert.equal(p.length, 1, p.join("\n"));
    assert.match(p[0], /^«substring\(indexOf\(a\), indexOf\(b\)\)» cayó por otra causa: Should have 1 error but had 0/);
  });

  test("arnés: un sabotaje cuya ancla no está sale rojo, no «no cae»", async () => {
    await assert.rejects(aplicar({ ...L01, id: "L-fantasma", de: "esto no está en la regla" }), /«L-fantasma» no encuentra qué romper/);
  });

  test("arnés: un sabotaje que no cambia nada sale rojo", async () => {
    await assert.rejects(aplicar({ ...L01, id: "L-igual", a: L01.de }), /«L-igual» no cambia nada/);
  });

  test("arnés: un sabotaje que rompe la carga se ve como rojo ajeno, no como caza", async () => {
    const r = await aplicar({ ...L01, id: "L-carga", de: "function nombre(callee) {", a: "function nombre(callee) {{" });
    assert.ok(r.carga instanceof SyntaxError, `se esperaba un SyntaxError al cargar y salió ${r.carga}`);
    assert.equal(r.fallos, undefined, "con la carga rota no se ha corrido ninguna prueba");
  });

  test("arnés: el RuleTester de eslint queda como estaba (el capturador es una subclase)", () => {
    const antes = eslint.RuleTester.it;
    correr(require(REGLA));
    assert.equal(eslint.RuleTester.it, antes);
  });
}

test("aviso temprano (la red de verdad es git diff --exit-code en CI): la regla no ha cambiado mientras corría este fichero", () => {
  assert.equal(huella(), ANTES);
});
