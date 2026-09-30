// SPDX-License-Identifier: MIT
"use strict";

// Reports calls that take a position (slice, substring, substr, splice,
// toSpliced, subarray, at) when one of their arguments computes it with a
// finder (indexOf, lastIndexOf, search, findIndex, findLastIndex) directly:
// when the finder returns -1 the call still runs, on the wrong piece, and a
// check that reads the result can pass without measuring anything.
//
// Only the direct form is seen. An index that travels through a variable or a
// function is NOT reported yet: see docs/rules/no-unchecked-slice.md.

const CORTES = new Set(["slice", "substring", "substr", "splice", "toSpliced", "subarray", "at"]);
const CORTES_DE_TEXTO = new Set(["slice", "substring", "substr"]);
const BUSCADORES = new Set(["indexOf", "lastIndexOf", "search", "findIndex", "findLastIndex"]);
const FRONTERAS = new Set(["FunctionExpression", "ArrowFunctionExpression", "FunctionDeclaration", "ClassExpression", "ClassDeclaration"]);

// Name of the called method: t.slice(...), t["slice"](...), t[`slice`](...).
function nombre(callee) {
  if (!callee || callee.type !== "MemberExpression") return null;
  const p = callee.property;
  if (!callee.computed) return p.type === "Identifier" ? p.name : null;
  if (p.type === "Literal" && typeof p.value === "string") return p.value;
  if (p.type === "TemplateLiteral" && p.expressions.length === 0) return p.quasis[0].value.cooked;
  return null;
}

// `x.lastIndexOf(sep) + 1` as a whole argument of a text cut: when the
// separator is missing it gives 0, the whole text, which is what the idiom
// "everything after the last separator" wants. Declared in the docs.
function esTrasElUltimo(arg) {
  return (
    arg.type === "BinaryExpression" &&
    arg.operator === "+" &&
    arg.right.type === "Literal" &&
    arg.right.value === 1 &&
    arg.left.type === "CallExpression" &&
    nombre(arg.left.callee) === "lastIndexOf"
  );
}

// First finder call inside `raiz`, left to right, without entering functions,
// classes or another cut (that one gets its own report).
function buscador(raiz, claves) {
  const pila = [raiz];
  while (pila.length > 0) {
    const n = pila.pop();
    if (FRONTERAS.has(n.type)) continue;
    if (n.type === "CallExpression") {
      const f = nombre(n.callee);
      if (f !== null && BUSCADORES.has(f)) return f;
      if (f !== null && CORTES.has(f)) continue;
    }
    const hijos = [];
    for (const k of claves(n)) {
      const v = n[k];
      if (Array.isArray(v)) {
        for (const x of v) if (x && typeof x.type === "string") hijos.push(x);
      } else if (v && typeof v.type === "string") {
        hijos.push(v);
      }
    }
    for (let i = hijos.length - 1; i >= 0; i--) pila.push(hijos[i]);
  }
  return null;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow using a position computed by indexOf() and friends without checking for -1",
      recommended: true,
    },
    schema: [],
    messages: {
      uncheckedIndex:
        "{{method}}() takes a position computed by {{finder}}(); if that returns -1 the call still runs, on the wrong piece, and a check that reads it can pass without measuring. Use desde/entre/cerca from @mrwolf99/ancla, or check for -1 first.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const keys = sourceCode.visitorKeys || {};
    const claves = (n) => keys[n.type] || Object.keys(n).filter((k) => k !== "parent");
    return {
      CallExpression(node) {
        const metodo = nombre(node.callee);
        if (metodo === null || !CORTES.has(metodo)) return;
        for (const arg of node.arguments) {
          if (CORTES_DE_TEXTO.has(metodo) && esTrasElUltimo(arg)) continue;
          const f = buscador(arg, claves);
          if (f !== null) {
            context.report({ node, messageId: "uncheckedIndex", data: { method: metodo, finder: f } });
            return;
          }
        }
      },
    };
  },
};
