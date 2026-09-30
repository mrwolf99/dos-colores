// SPDX-License-Identifier: MIT
"use strict";

// The cases of the rule, shared by the RuleTester run, the sabotage harness
// and the census. Every case carries a `name` so that a failure can be traced
// back to it whatever title RuleTester gives to the test.

const VALIDOS = [
  { name: "desde() y un indexOf fuera de un corte", code: "const r = desde(t, a); console.log(t.indexOf(a), r);" },
  { name: "corte sin buscador", code: "const cabeza = t.slice(0, 10); const cola = t.slice(-3);" },
  // Declared exemption: the idiom "after the last separator, or all of it".
  {
    name: "exención declarada: lastIndexOf(sep) + 1 en un corte de texto",
    code: 'const base = p.slice(p.lastIndexOf("/") + 1); const dir = p.slice(0, p.lastIndexOf("/") + 1);',
  },
  // Declared gaps: when one is implemented, its case moves to INVALIDOS.
  { name: "hueco declarado: el índice pasa por una variable", code: "const i = t.indexOf(a); const r = t.slice(i);" },
  { name: "hueco declarado: charAt(indexOf(a))", code: "const c = t.charAt(t.indexOf(a));" },
  { name: "hueco declarado: el corte llamado con call()", code: "const r = String.prototype.slice.call(t, t.indexOf(a));" },
  // Declared limits: the rule does not look inside functions or classes.
  { name: "límite declarado: el índice llega por una función", code: "const r = t.slice(calcular(() => t.indexOf(a)));" },
  { name: "límite declarado: el índice llega por una función normal", code: "const r = t.slice(calcular(function () { return t.indexOf(a); }));" },
  { name: "límite declarado: el índice llega por una clase", code: "const r = t.slice(calcular(class { static i = t.indexOf(a); }));" },
];

const error = (method, finder) => [{ messageId: "uncheckedIndex", data: { method, finder } }];

const INVALIDOS = [
  { name: "slice(indexOf(a))", code: "const r = t.slice(t.indexOf(a));", errors: error("slice", "indexOf") },
  { name: "slice(indexOf(a) + a.length)", code: "const r = t.slice(t.indexOf(a) + a.length);", errors: error("slice", "indexOf") },
  { name: "ventana ±500", code: "const r = t.slice(t.indexOf(a) - 500, t.indexOf(a) + 500);", errors: error("slice", "indexOf") },
  { name: "slice(Math.max(0, indexOf(a)))", code: "const r = t.slice(Math.max(0, t.indexOf(a)));", errors: error("slice", "indexOf") },
  { name: "substring(indexOf(a), indexOf(b))", code: "const r = t.substring(t.indexOf(a), t.indexOf(b));", errors: error("substring", "indexOf") },
  { name: "arrays: slice(findIndex(...))", code: "const r = xs.slice(xs.findIndex((x) => x > 3));", errors: error("slice", "findIndex") },
  { name: "arrays: slice(findLastIndex(...))", code: "const r = xs.slice(xs.findLastIndex((x) => x > 3));", errors: error("slice", "findLastIndex") },
  { name: "substr(lastIndexOf(a))", code: "const r = t.substr(t.lastIndexOf(a));", errors: error("substr", "lastIndexOf") },
  { name: "lastIndexOf(a) + 2 no es la exención", code: "const r = t.slice(t.lastIndexOf(a) + 2);", errors: error("slice", "lastIndexOf") },
  { name: "el buscador en el segundo argumento", code: "const r = t.slice(0, t.indexOf(fin));", errors: error("slice", "indexOf") },
  { name: "nombre entre corchetes", code: 'const r = t["slice"](t.search(re));', errors: error("slice", "search") },
  { name: "nombre como plantilla", code: "const r = t[`slice`](t.indexOf(a));", errors: error("slice", "indexOf") },
  { name: "arrays: splice(indexOf(x), 1) borra el último si falta", code: "xs.splice(xs.indexOf(x), 1);", errors: error("splice", "indexOf") },
  { name: "arrays: toSpliced(indexOf(x), 1)", code: "const r = xs.toSpliced(xs.indexOf(x), 1);", errors: error("toSpliced", "indexOf") },
  { name: "bytes: subarray(indexOf(b))", code: "const r = buf.subarray(buf.indexOf(b));", errors: error("subarray", "indexOf") },
  { name: "at(indexOf(x)) da el último si falta", code: "const r = xs.at(xs.indexOf(x));", errors: error("at", "indexOf") },
  { name: "arrays: splice(lastIndexOf(x) + 1) no tiene la exención", code: "xs.splice(xs.lastIndexOf(x) + 1);", errors: error("splice", "lastIndexOf") },
  { name: "cortes anidados: un solo aviso, el del corte de dentro", code: "const r = t.slice(u.slice(u.indexOf(a)).length);", errors: error("slice", "indexOf") },
  { name: "dos buscadores: nombra el de la izquierda", code: "const r = t.slice(t.indexOf(a) + t.lastIndexOf(b));", errors: error("slice", "indexOf") },
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
  return { RuleTester: eslint.RuleTester, Linter: eslint.Linter, version };
}

module.exports = { VALIDOS, INVALIDOS, OPCIONES_TESTER, cargarEslint };
