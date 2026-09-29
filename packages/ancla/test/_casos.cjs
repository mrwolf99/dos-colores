// SPDX-License-Identifier: MIT
"use strict";

// ONE table of cases, run by cjs.test.cjs, esm.test.mjs and the sabotage
// harness alike. Each case gets `m` (the module under test) and `ctx`
// ({ cjs, esm }: both doors to the same implementation).
//
// The greens are seen against real text: this package's own source and the
// toy shop in ejemplos/. The reds check errors by `name` and `code`, never by
// class identity, so that only the identity case depends on the ESM facade.

const fs = require("node:fs");
const path = require("node:path");

const FUENTE = fs.readFileSync(path.join(__dirname, "..", "ancla.cjs"), "utf8");
const PEDIDO = fs.readFileSync(path.join(__dirname, "..", "..", "..", "ejemplos", "tienda", "pedido.mjs"), "utf8");

function cierto(condicion, porque) {
  if (!condicion) throw new Error(porque);
}

function corto(v) {
  const s = JSON.stringify(v);
  return s === undefined ? String(v) : s.length > 70 ? s.slice(0, 70) + "…" : s;
}

// Expects `fn` to throw an error whose fields equal `espera`. The message of
// the failure says which of the three things happened.
function lanza(fn, espera) {
  let devuelto;
  try {
    devuelto = fn();
  } catch (e) {
    const distintos = Object.entries(espera)
      .filter(([k, v]) => e[k] !== v)
      .map(([k, v]) => `${k}=${corto(e[k])} (esperaba ${corto(v)})`);
    if (distintos.length > 0) throw new Error(`lanzó otra cosa: ${distintos.join(", ")} · ${String(e.message).slice(0, 90)}`);
    return e;
  }
  throw new Error(`no lanzó: devolvió ${corto(devuelto)} (esperaba ${corto(espera)})`);
}

const CASOS = [
  // ---------------------------------------------------------------- greens
  {
    nombre: "desde: devuelve desde el ancla, con el ancla dentro",
    color: "verde",
    run(m) {
      const r = m.desde(FUENTE, "function entre(", "ancla.cjs");
      cierto(r.startsWith("function entre("), `no empieza por el ancla: ${corto(r.slice(0, 30))}`);
      cierto(r.includes("function cerca("), "no llega hasta cerca(): no es el resto del texto");
    },
  },
  {
    nombre: "desde con unica: un ancla que aparece una sola vez pasa",
    color: "verde",
    run(m) {
      const r = m.desde(PEDIDO, "export function calcularEnvio(", { quien: "pedido.mjs", unica: true });
      cierto(r.startsWith("export function calcularEnvio("), `no empieza por el ancla: ${corto(r.slice(0, 30))}`);
    },
  },
  {
    nombre: "entre: el trozo real de buscar() empieza en su apertura y contiene su throw",
    color: "verde",
    run(m) {
      const r = m.entre(FUENTE, "function buscar(", "function desde(", "ancla.cjs");
      cierto(r.startsWith("function buscar("), `no empieza por la apertura: ${corto(r.slice(0, 30))}`);
      cierto(r.includes("throw new AnclaPerdida"), `el trozo no contiene el throw: ${corto(r)}`);
    },
  },
  {
    nombre: "entre no incluye el cierre",
    color: "verde",
    run(m) {
      const r = m.entre(PEDIDO, "export function importeLinea(", "export function calcularEnvio(", "pedido.mjs");
      cierto(r.startsWith("export function importeLinea("), `no empieza por la apertura: ${corto(r.slice(0, 30))}`);
      cierto(!r.includes("export function calcularEnvio("), "el trozo incluye el cierre");
    },
  },
  {
    nombre: "cerca: la ventana contiene el ancla entera aunque el radio sea menor",
    color: "verde",
    run(m) {
      const a = "function importeLinea(";
      const cero = m.cerca(PEDIDO, a, 0, "pedido.mjs");
      cierto(cero === a, `con radio 0 la ventana no es el ancla: ${corto(cero)}`);
      const tres = m.cerca(PEDIDO, a, 3, "pedido.mjs");
      cierto(tres.includes(a) && tres.length === a.length + 6, `con radio 3 la ventana corta el ancla: ${corto(tres)}`);
    },
  },
  {
    nombre: "cerca: ancla al principio no sale por el índice negativo",
    color: "verde",
    run(m) {
      // Radius longer than the anchor, so that only the negative start decides.
      const r = m.cerca(FUENTE, "// SPDX-License-Identifier", 30, "ancla.cjs");
      cierto(r.startsWith("// SPDX-License-Identifier"), `la ventana no empieza en el principio del texto: ${corto(r)}`);
    },
  },
  {
    nombre: "identidad ESM↔CJS: las dos puertas dan los mismos objetos",
    color: "verde",
    run(m, ctx) {
      const nombres = ["desde", "entre", "cerca", "AnclaPerdida", "AnclaRepetida"];
      const distintos = nombres.filter((n) => ctx.esm[n] === undefined || ctx.esm[n] !== ctx.cjs[n]);
      cierto(distintos.length === 0, `la fachada ESM no reexporta lo mismo que el CJS: ${distintos.join(", ")}`);
      // Thrown through entre() with a missing opening: no sabotage of desde()
      // or of the window may decide this case.
      const e = lanza(() => ctx.esm.entre(PEDIDO, "no está en el pedido", "}"), { name: "AnclaPerdida" });
      cierto(e instanceof ctx.cjs.AnclaPerdida && e instanceof ctx.esm.AnclaPerdida, "el error no es instancia de la misma clase por las dos vías");
    },
  },
  {
    nombre: "la fachada ESM no tiene exportación por defecto (por eso los .d.cts y .d.mts pueden ser idénticos)",
    color: "verde",
    run(m, ctx) {
      cierto(!("default" in ctx.esm), "la fachada ESM exporta un default que los tipos no declaran");
    },
  },
  // ------------------------------------------------------------------ reds
  {
    nombre: "desde: ancla ausente lanza AnclaPerdida",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "function importeDeLinea(", "pedido.mjs"), { name: "AnclaPerdida", papel: "ancla" });
    },
  },
  {
    nombre: "entre: cierre antes de la apertura lanza, no da un trozo vacío",
    color: "rojo",
    run(m) {
      lanza(() => m.entre(PEDIDO, "export function calcularEnvio(", "export function importeLinea(", "pedido.mjs"), {
        name: "AnclaPerdida",
        papel: "cierra",
      });
    },
  },
  {
    nombre: "entre: cierre ausente → papel:cierra",
    color: "rojo",
    run(m) {
      lanza(() => m.entre(PEDIDO, "export function importeLinea(", "esto no está en el pedido", "pedido.mjs"), {
        name: "AnclaPerdida",
        papel: "cierra",
      });
    },
  },
  {
    nombre: "entre: apertura ausente → papel:abre",
    color: "rojo",
    run(m) {
      lanza(() => m.entre(PEDIDO, "export function importeDeLinea(", "}", "pedido.mjs"), { name: "AnclaPerdida", papel: "abre" });
    },
  },
  {
    nombre: "cerca: radio inválido → ANCLA_ARGUMENTO (\"abc\", -1, 1.5, NaN, Infinity)",
    color: "rojo",
    run(m) {
      for (const radio of ["abc", -1, 1.5, NaN, Infinity]) {
        lanza(() => m.cerca(PEDIDO, "importeLinea(", radio, "pedido.mjs"), { code: "ANCLA_ARGUMENTO", name: "TypeError" });
      }
    },
  },
  {
    nombre: "unica: repetida → AnclaRepetida con las dos posiciones",
    color: "rojo",
    run(m) {
      const a = "importeLinea(";
      const i = PEDIDO.indexOf(a);
      const j = PEDIDO.indexOf(a, i + 1);
      cierto(i !== -1 && j !== -1, "el pedido ya no tiene dos apariciones: el caso no mediría nada");
      const e = lanza(() => m.cerca(PEDIDO, a, 0, { quien: "pedido.mjs", unica: true }), { name: "AnclaRepetida" });
      cierto(Array.isArray(e.posiciones) && e.posiciones[0] === i && e.posiciones[1] === j, `posiciones ${corto(e.posiciones)} y eran [${i},${j}]`);
    },
  },
  {
    nombre: "unica: una repetición solapada también cuenta",
    color: "rojo",
    run(m) {
      const e = lanza(() => m.cerca("xaaa", "aa", 0, { unica: true }), { name: "AnclaRepetida" });
      cierto(e.posiciones[0] === 1 && e.posiciones[1] === 2, `posiciones ${corto(e.posiciones)} y eran [1,2]`);
    },
  },
  {
    nombre: "ancla \"\" → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "", "pedido.mjs"), { code: "ANCLA_ARGUMENTO", name: "TypeError" });
    },
  },
  {
    nombre: "texto undefined → ANCLA_ARGUMENTO, no AnclaPerdida",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(undefined, "function importeLinea(", "pedido.mjs"), { code: "ANCLA_ARGUMENTO", name: "TypeError" });
    },
  },
  {
    nombre: "el error lleva code y name",
    color: "rojo",
    run(m) {
      lanza(() => m.cerca(PEDIDO, "esto no está en el pedido", 5), { name: "AnclaPerdida", code: "ANCLA_PERDIDA" });
      lanza(() => m.cerca(PEDIDO, "importeLinea(", 5, { unica: true }), { name: "AnclaRepetida", code: "ANCLA_REPETIDA" });
      lanza(() => m.desde(PEDIDO, 42), { name: "TypeError", code: "ANCLA_ARGUMENTO" });
    },
  },
  {
    nombre: "el mensaje nombra a quién y el ancla",
    color: "rojo",
    run(m) {
      const e = lanza(() => m.entre(PEDIDO, "function importeDeLinea(", "\n}\n", "tienda/pedido.mjs"), { name: "AnclaPerdida" });
      cierto(e.message.startsWith("AnclaPerdida: anchor not found"), `el mensaje no empieza por el prefijo fijo: ${corto(e.message)}`);
      cierto(e.message.includes('in "tienda/pedido.mjs"'), `el mensaje no dice quién: ${corto(e.message)}`);
      cierto(e.message.includes("«function importeDeLinea(»"), `el mensaje no dice qué ancla: ${corto(e.message)}`);
    },
  },
  {
    nombre: "opción desconocida {unique:true} → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "export function importeLinea(", { unique: true }), { code: "ANCLA_ARGUMENTO", name: "TypeError" });
    },
  },
  {
    nombre: "opción con tipo equivocado {unica:\"sí\"} → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "export function importeLinea(", { unica: "sí" }), { code: "ANCLA_ARGUMENTO", name: "TypeError" });
    },
  },
];

// Runs the whole table and returns what fell, with its message.
async function correrTabla(m, ctx) {
  const fallos = [];
  for (const c of CASOS) {
    try {
      await c.run(m, ctx);
    } catch (e) {
      fallos.push({ nombre: c.nombre, mensaje: String(e && e.message) });
    }
  }
  return fallos;
}

module.exports = { CASOS, correrTabla, lanza, FUENTE, PEDIDO };
