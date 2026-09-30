// SPDX-License-Identifier: MIT
"use strict";
// RuleTester on top of node:test. Without eslint installed this says PARCIAL
// (a skip locally, red in CI); the checks that do not need eslint always run.

const { test, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parcial } = require("../../../test/_parcial.cjs");
const plugin = require("../index.cjs");
const regla = require("../rules/no-unchecked-slice.cjs");
const { VALIDOS, INVALIDOS, OPCIONES_TESTER, cargarEslint } = require("./_casos.cjs");

const eslint = cargarEslint();
const ESPERADO = process.env.DOS_COLORES_ESLINT_ESPERADO;

if (eslint === null) {
  test("RuleTester sobre no-unchecked-slice", (t) =>
    parcial(t, "eslint no instalado: el verde y el rojo de la regla con RuleTester no se han mirado aquí (quedan para CI)"));
} else {
  test("la versión de eslint cargada es la que pide la matriz", (t) => {
    if (!ESPERADO) return parcial(t, `sin DOS_COLORES_ESLINT_ESPERADO: no se ha comprobado qué eslint se ha cargado (es el ${eslint.version})`);
    assert.equal(eslint.version, ESPERADO, `la matriz pide eslint ${ESPERADO} y se ha cargado ${eslint.version}: esta pasada no mide lo que dice`);
  });
  // What the README promises about exceptions, seen in both colours with the
  // real Linter: an exception that silences a real report is quiet, and one
  // that no longer silences anything is an error.
  test("con reportUnusedDisableDirectives: \"error\", la excepción que sobra sale en rojo y la que hace falta no", () => {
    const linter = new eslint.Linter({ configType: "flat" });
    const config = [plugin.configs.recommended, { linterOptions: { reportUnusedDisableDirectives: "error" } }];
    const excepcion = "// eslint-disable-next-line ancla/no-unchecked-slice -- the anchor is the file header, checked above\n";
    const hace = linter.verify(excepcion + "const r = t.slice(t.indexOf(a));\n", config);
    assert.deepEqual(hace.map((m) => m.message), []);
    const sobra = linter.verify(excepcion + "const r = desde(t, a);\n", config);
    assert.equal(sobra.length, 1, JSON.stringify(sobra));
    assert.equal(sobra[0].severity, 2);
    assert.match(sobra[0].message, /Unused eslint-disable directive/);
  });
  eslint.RuleTester.describe = describe;
  eslint.RuleTester.it = it;
  eslint.RuleTester.itOnly = it.only;
  new eslint.RuleTester(OPCIONES_TESTER).run("no-unchecked-slice", regla, { valid: VALIDOS, invalid: INVALIDOS });
}

test("el plugin expone la regla y una configuración recomendada plana que la activa", () => {
  assert.equal(plugin.rules["no-unchecked-slice"], regla);
  assert.equal(plugin.meta.name, "eslint-plugin-ancla");
  const rec = plugin.configs.recommended;
  assert.equal(rec.plugins.ancla, plugin);
  assert.deepEqual(rec.rules, { "ancla/no-unchecked-slice": "error" });
});

test("el mensaje nombra el método y el buscador, para que el rojo diga su causa", () => {
  const m = regla.meta.messages.uncheckedIndex;
  assert.match(m, /\{\{method\}\}/);
  assert.match(m, /\{\{finder\}\}/);
  assert.equal(regla.meta.type, "problem");
  assert.deepEqual(regla.meta.schema, []);
});
