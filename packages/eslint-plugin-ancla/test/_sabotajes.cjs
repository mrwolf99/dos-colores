// SPDX-License-Identifier: MIT
"use strict";

// What each sabotage breaks in the rule, and EXACTLY which cases must fall,
// each for its own cause (a RuleTester message). Every piece of the rule that
// can be broken alone has its own sabotage: each method, each finder, each
// frontier, the exemption and its limits.

const CORTES = 'new Set(["slice", "substring", "substr", "splice", "toSpliced", "subarray", "at"])';
const BUSCADORES = 'new Set(["indexOf", "lastIndexOf", "search", "findIndex", "findLastIndex"])';
const FRONTERAS = 'new Set(["FunctionExpression", "ArrowFunctionExpression", "FunctionDeclaration", "ClassExpression", "ClassDeclaration"])';
const FRONTERA = "if (FRONTERAS.has(n.type)) continue;";

const SIN_AVISO = /^Should have 1 error but had 0/;
const DOS_AVISOS = /^Should have 1 error but had 2/;
const AVISA = /^Should have no errors but had [12]/;
// RuleTester prints the expected message first and the one the rule gave
// after "does not match": this matches what the rule actually said.
const dijo = (metodo, buscador) => new RegExp(`^Hydrated message ".*" does not match "${metodo}\\(\\) takes a position computed by ${buscador}\\(\\)`);

const SABOTAJES = [
  { id: "L01", que: "quitar substring de los cortes", de: CORTES, a: CORTES.replace('"substring", ', ""), caen: { "substring(indexOf(a), indexOf(b))": SIN_AVISO } },
  { id: "L02", que: "quitar substr de los cortes", de: CORTES, a: CORTES.replace('"substr", ', ""), caen: { "substr(lastIndexOf(a))": SIN_AVISO } },
  {
    id: "L03",
    que: "quitar splice de los cortes",
    de: CORTES,
    a: CORTES.replace('"splice", ', ""),
    caen: { "arrays: splice(indexOf(x), 1) borra el último si falta": SIN_AVISO, "arrays: splice(lastIndexOf(x) + 1) no tiene la exención": SIN_AVISO },
  },
  { id: "L04", que: "quitar toSpliced de los cortes", de: CORTES, a: CORTES.replace('"toSpliced", ', ""), caen: { "arrays: toSpliced(indexOf(x), 1)": SIN_AVISO } },
  { id: "L05", que: "quitar subarray de los cortes", de: CORTES, a: CORTES.replace('"subarray", ', ""), caen: { "bytes: subarray(indexOf(b))": SIN_AVISO } },
  { id: "L06", que: "quitar at de los cortes", de: CORTES, a: CORTES.replace(', "at"', ""), caen: { "at(indexOf(x)) da el último si falta": SIN_AVISO } },
  {
    id: "L07",
    que: "quitar lastIndexOf de los buscadores",
    de: BUSCADORES,
    a: BUSCADORES.replace('"lastIndexOf", ', ""),
    caen: {
      "substr(lastIndexOf(a))": SIN_AVISO,
      "lastIndexOf(a) + 2 no es la exención": SIN_AVISO,
      "arrays: splice(lastIndexOf(x) + 1) no tiene la exención": SIN_AVISO,
    },
  },
  { id: "L08", que: "quitar findIndex de los buscadores", de: BUSCADORES, a: BUSCADORES.replace('"findIndex", ', ""), caen: { "arrays: slice(findIndex(...))": SIN_AVISO } },
  { id: "L09", que: "quitar findLastIndex de los buscadores", de: BUSCADORES, a: BUSCADORES.replace(', "findLastIndex"', ""), caen: { "arrays: slice(findLastIndex(...))": SIN_AVISO } },
  { id: "L10", que: "quitar search de los buscadores", de: BUSCADORES, a: BUSCADORES.replace('"search", ', ""), caen: { "nombre entre corchetes": SIN_AVISO } },
  {
    id: "L11",
    que: "quitar indexOf de los buscadores",
    de: BUSCADORES,
    a: BUSCADORES.replace('"indexOf", ', ""),
    caen: {
      "slice(indexOf(a))": SIN_AVISO,
      "slice(indexOf(a) + a.length)": SIN_AVISO,
      "ventana ±500": SIN_AVISO,
      "slice(Math.max(0, indexOf(a)))": SIN_AVISO,
      "substring(indexOf(a), indexOf(b))": SIN_AVISO,
      "el buscador en el segundo argumento": SIN_AVISO,
      "nombre como plantilla": SIN_AVISO,
      "arrays: splice(indexOf(x), 1) borra el último si falta": SIN_AVISO,
      "arrays: toSpliced(indexOf(x), 1)": SIN_AVISO,
      "bytes: subarray(indexOf(b))": SIN_AVISO,
      "at(indexOf(x)) da el último si falta": SIN_AVISO,
      "cortes anidados: un solo aviso, el del corte de dentro": SIN_AVISO,
      "dos buscadores: nombra el de la izquierda": dijo("slice", "lastIndexOf"),
    },
  },
  {
    id: "L12",
    que: "mirar solo el primer argumento",
    de: "for (const arg of node.arguments) {",
    a: "for (const arg of node.arguments.slice(0, 1)) {",
    caen: { "el buscador en el segundo argumento": SIN_AVISO },
  },
  {
    id: "L13",
    que: "no bajar por las BinaryExpression",
    de: FRONTERA,
    a: 'if (FRONTERAS.has(n.type) || n.type === "BinaryExpression") continue;',
    caen: {
      "slice(indexOf(a) + a.length)": SIN_AVISO,
      "ventana ±500": SIN_AVISO,
      "lastIndexOf(a) + 2 no es la exención": SIN_AVISO,
      "arrays: splice(lastIndexOf(x) + 1) no tiene la exención": SIN_AVISO,
      "dos buscadores: nombra el de la izquierda": SIN_AVISO,
    },
  },
  {
    id: "L14",
    que: "equivocar data.method",
    de: "data: { method: metodo, finder: f }",
    a: 'data: { method: "slice", finder: f }',
    caen: {
      "substring(indexOf(a), indexOf(b))": dijo("slice", "indexOf"),
      "substr(lastIndexOf(a))": dijo("slice", "lastIndexOf"),
      "arrays: splice(indexOf(x), 1) borra el último si falta": dijo("slice", "indexOf"),
      "arrays: toSpliced(indexOf(x), 1)": dijo("slice", "indexOf"),
      "bytes: subarray(indexOf(b))": dijo("slice", "indexOf"),
      "at(indexOf(x)) da el último si falta": dijo("slice", "indexOf"),
      "arrays: splice(lastIndexOf(x) + 1) no tiene la exención": dijo("slice", "lastIndexOf"),
    },
  },
  {
    id: "L15",
    que: "no leer los nombres entre corchetes",
    de: 'if (p.type === "Literal" && typeof p.value === "string") return p.value;',
    a: "void 0;",
    caen: { "nombre entre corchetes": SIN_AVISO },
  },
  {
    id: "L16",
    que: "no leer los nombres como plantilla",
    de: 'if (p.type === "TemplateLiteral" && p.expressions.length === 0) return p.quasis[0].value.cooked;',
    a: "void 0;",
    caen: { "nombre como plantilla": SIN_AVISO },
  },
  {
    id: "L17",
    que: "reportar todo corte, tenga buscador o no",
    de: "if (f !== null) {",
    a: "if (true) {",
    caen: {
      "corte sin buscador": AVISA,
      "exención declarada: lastIndexOf(sep) + 1 en un corte de texto": AVISA,
      "hueco declarado: el índice pasa por una variable": AVISA,
      "límite declarado: el índice llega por una función": AVISA,
      "límite declarado: el índice llega por una función normal": AVISA,
      "límite declarado: el índice llega por una clase": AVISA,
      "el buscador en el segundo argumento": dijo("slice", "null"),
      "cortes anidados: un solo aviso, el del corte de dentro": DOS_AVISOS,
    },
  },
  {
    id: "L18",
    que: "no mirar si el método es un corte",
    de: "if (metodo === null || !CORTES.has(metodo)) return;",
    a: "if (metodo === null) return;",
    caen: {
      "desde() y un indexOf fuera de un corte": AVISA,
      "hueco declarado: charAt(indexOf(a))": AVISA,
      "hueco declarado: el corte llamado con call()": AVISA,
      "slice(Math.max(0, indexOf(a)))": DOS_AVISOS,
    },
  },
  {
    id: "L19",
    que: "entrar en las funciones y las clases",
    de: FRONTERA,
    a: "void 0;",
    caen: {
      "límite declarado: el índice llega por una función": AVISA,
      "límite declarado: el índice llega por una función normal": AVISA,
      "límite declarado: el índice llega por una clase": AVISA,
    },
  },
  { id: "L20", que: "entrar en las funciones normales", de: FRONTERAS, a: FRONTERAS.replace('"FunctionExpression", ', ""), caen: { "límite declarado: el índice llega por una función normal": AVISA } },
  { id: "L21", que: "entrar en las clases", de: FRONTERAS, a: FRONTERAS.replace('"ClassExpression", ', ""), caen: { "límite declarado: el índice llega por una clase": AVISA } },
  {
    id: "L22",
    que: "quitar la exención de lastIndexOf + 1",
    de: "if (CORTES_DE_TEXTO.has(metodo) && esTrasElUltimo(arg)) continue;",
    a: "void 0;",
    caen: { "exención declarada: lastIndexOf(sep) + 1 en un corte de texto": AVISA },
  },
  {
    id: "L23",
    que: "la exención vale para cualquier suma",
    de: "arg.right.value === 1 &&",
    a: 'typeof arg.right.value === "number" &&',
    caen: { "lastIndexOf(a) + 2 no es la exención": SIN_AVISO },
  },
  {
    id: "L24",
    que: "la exención vale para cualquier método",
    de: "if (CORTES_DE_TEXTO.has(metodo) && esTrasElUltimo(arg)) continue;",
    a: "if (esTrasElUltimo(arg)) continue;",
    caen: { "arrays: splice(lastIndexOf(x) + 1) no tiene la exención": SIN_AVISO },
  },
  {
    id: "L25",
    que: "entrar en los cortes anidados",
    de: "if (f !== null && CORTES.has(f)) continue;",
    a: "void 0;",
    caen: { "cortes anidados: un solo aviso, el del corte de dentro": DOS_AVISOS },
  },
  {
    id: "L26",
    que: "buscar de derecha a izquierda",
    de: "for (let i = hijos.length - 1; i >= 0; i--) pila.push(hijos[i]);",
    a: "for (const h of hijos) pila.push(h);",
    caen: { "dos buscadores: nombra el de la izquierda": dijo("slice", "lastIndexOf") },
  },
];

module.exports = { SABOTAJES };
