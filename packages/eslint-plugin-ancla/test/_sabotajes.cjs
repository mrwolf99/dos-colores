// SPDX-License-Identifier: MIT
"use strict";

// What each sabotage breaks in the rule, and EXACTLY which cases must fall.
// L01–L05 are the planned ones; L06–L11 were added so that every case, valid
// and invalid, has been seen falling by at least one.

const CORTES = 'new Set(["slice", "substring", "substr"])';
const BUSCADORES = 'new Set(["indexOf", "lastIndexOf", "search", "findIndex", "findLastIndex"])';
const FRONTERA = "if (FRONTERAS.has(n.type)) continue;";

const SABOTAJES = [
  { id: "L01", que: "quitar substring de los cortes", de: CORTES, a: 'new Set(["slice", "substr"])', caen: ["substring(indexOf(a), indexOf(b))"] },
  {
    id: "L02",
    que: "quitar lastIndexOf de los buscadores",
    de: BUSCADORES,
    a: 'new Set(["indexOf", "search", "findIndex", "findLastIndex"])',
    caen: ["substr(lastIndexOf(a))"],
  },
  {
    id: "L03",
    que: "mirar solo el primer argumento",
    de: "for (const arg of node.arguments) {",
    a: "for (const arg of node.arguments.slice(0, 1)) {",
    caen: ["el buscador en el segundo argumento"],
  },
  {
    id: "L04",
    que: "no bajar por las BinaryExpression",
    de: FRONTERA,
    a: 'if (FRONTERAS.has(n.type) || n.type === "BinaryExpression") continue;',
    caen: ["slice(indexOf(a) + a.length)", "ventana ±900"],
  },
  {
    id: "L05",
    que: "equivocar data.method",
    de: "data: { method: metodo, finder: f }",
    a: 'data: { method: "slice", finder: f }',
    caen: ["substring(indexOf(a), indexOf(b))", "substr(lastIndexOf(a))"],
  },
  {
    id: "L06",
    que: "quitar indexOf de los buscadores",
    de: BUSCADORES,
    a: 'new Set(["lastIndexOf", "search", "findIndex", "findLastIndex"])',
    caen: [
      "slice(indexOf(a))",
      "slice(indexOf(a) + a.length)",
      "ventana ±900",
      "slice(Math.max(0, indexOf(a)))",
      "substring(indexOf(a), indexOf(b))",
      "el buscador en el segundo argumento",
    ],
  },
  {
    id: "L07",
    que: "quitar findIndex de los buscadores",
    de: BUSCADORES,
    a: 'new Set(["indexOf", "lastIndexOf", "search", "findLastIndex"])',
    caen: ["arrays: slice(findIndex(...))"],
  },
  {
    id: "L08",
    que: "no leer los nombres entre corchetes",
    de: 'if (p.type === "Literal" && typeof p.value === "string") return p.value;',
    a: "void 0;",
    caen: ["nombre entre corchetes"],
  },
  {
    id: "L09",
    que: "reportar todo corte, tenga buscador o no",
    de: "if (f !== null) {",
    a: "if (true) {",
    caen: ["corte sin buscador", "hueco declarado: el índice pasa por una variable", "límite declarado: el índice llega por una función", "el buscador en el segundo argumento"],
  },
  {
    id: "L10",
    que: "no mirar si el método es un corte",
    de: "if (metodo === null || !CORTES.has(metodo)) return;",
    a: "if (metodo === null) return;",
    caen: ["desde() y un indexOf fuera de un corte", "slice(Math.max(0, indexOf(a)))"],
  },
  { id: "L11", que: "entrar en las funciones", de: FRONTERA, a: "void 0;", caen: ["límite declarado: el índice llega por una función"] },
];

module.exports = { SABOTAJES };
