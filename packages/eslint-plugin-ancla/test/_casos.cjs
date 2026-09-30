// SPDX-License-Identifier: MIT
"use strict";

// The cases of the rule, shared by the RuleTester run, the sabotage harness
// and the census. Every case carries a `name` so that a failure can be traced
// back to it whatever title RuleTester gives to the test.

const VALIDOS = [
  { name: "desde() y un indexOf fuera de un corte", code: "const r = desde(t, a); console.log(t.indexOf(a), r);" },
  { name: "corte sin buscador", code: "const cabeza = t.slice(0, 10); const cola = t.slice(-3);" },
  // Declared gap: when the variable form is implemented this case moves to INVALIDOS.
  { name: "hueco declarado: el índice pasa por una variable", code: "const i = t.indexOf(a); const r = t.slice(i);" },
  { name: "límite declarado: el índice llega por una función", code: "const r = t.slice(calcular(() => t.indexOf(a)));" },
];

const error = (method, finder) => [{ messageId: "uncheckedIndex", data: { method, finder } }];

const INVALIDOS = [
  { name: "slice(indexOf(a))", code: "const r = t.slice(t.indexOf(a));", errors: error("slice", "indexOf") },
  { name: "slice(indexOf(a) + a.length)", code: "const r = t.slice(t.indexOf(a) + a.length);", errors: error("slice", "indexOf") },
  { name: "ventana ±900", code: "const r = t.slice(t.indexOf(a) - 900, t.indexOf(a) + 900);", errors: error("slice", "indexOf") },
  { name: "slice(Math.max(0, indexOf(a)))", code: "const r = t.slice(Math.max(0, t.indexOf(a)));", errors: error("slice", "indexOf") },
  { name: "substring(indexOf(a), indexOf(b))", code: "const r = t.substring(t.indexOf(a), t.indexOf(b));", errors: error("substring", "indexOf") },
  { name: "arrays: slice(findIndex(...))", code: "const r = xs.slice(xs.findIndex((x) => x > 3));", errors: error("slice", "findIndex") },
  { name: "substr(lastIndexOf(a))", code: "const r = t.substr(t.lastIndexOf(a));", errors: error("substr", "lastIndexOf") },
  { name: "el buscador en el segundo argumento", code: "const r = t.slice(0, t.indexOf(fin));", errors: error("slice", "indexOf") },
  { name: "nombre entre corchetes", code: 'const r = t["slice"](t.search(re));', errors: error("slice", "search") },
];

const OPCIONES_TESTER = { languageOptions: { ecmaVersion: "latest", sourceType: "module" } };

// null when eslint is not installed (a skip, said as PARCIAL). An eslint that
// resolves but does not load is NOT a skip: that throws, and it is red.
function cargarEslint() {
  try {
    require.resolve("eslint");
  } catch (e) {
    if (e && e.code === "MODULE_NOT_FOUND") return null;
    throw e;
  }
  const eslint = require("eslint");
  const version = (eslint.ESLint && eslint.ESLint.version) || (eslint.Linter && eslint.Linter.version) || null;
  return { RuleTester: eslint.RuleTester, version };
}

module.exports = { VALIDOS, INVALIDOS, OPCIONES_TESTER, cargarEslint };
