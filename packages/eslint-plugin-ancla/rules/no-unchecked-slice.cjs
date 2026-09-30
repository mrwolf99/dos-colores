// SPDX-License-Identifier: MIT
"use strict";

// Reports slice/substring/substr calls whose arguments compute the position
// with a finder (indexOf, lastIndexOf, search, findIndex, findLastIndex)
// directly: when the finder returns -1 the cut is still made, on the wrong
// piece, and the check that reads it can pass without measuring anything.
//
// Only the direct form is seen. An index that travels through a variable or a
// function is NOT reported yet: see docs/rules/no-unchecked-slice.md.

const CORTES = new Set(["slice", "substring", "substr"]);
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

// First finder call inside `raiz`, without entering functions or classes.
function buscador(raiz, claves) {
  const pila = [raiz];
  while (pila.length > 0) {
    const n = pila.pop();
    if (FRONTERAS.has(n.type)) continue;
    if (n.type === "CallExpression") {
      const f = nombre(n.callee);
      if (f !== null && BUSCADORES.has(f)) return f;
    }
    for (const k of claves(n)) {
      const v = n[k];
      if (Array.isArray(v)) {
        for (const x of v) if (x && typeof x.type === "string") pila.push(x);
      } else if (v && typeof v.type === "string") {
        pila.push(v);
      }
    }
  }
  return null;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow cutting text at a position computed by indexOf() and friends without checking for -1",
      recommended: true,
    },
    schema: [],
    messages: {
      uncheckedIndex:
        "{{method}}() cuts at a position computed by {{finder}}(); if it returns -1 the cut is made on the wrong piece and the check passes without measuring. Use desde/entre/cerca from @mrwolf99/ancla, or check for -1 first.",
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
