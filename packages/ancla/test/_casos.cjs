// SPDX-License-Identifier: MIT
"use strict";

// ONE table of cases, run by cjs.test.cjs, esm.test.mjs and the sabotage
// harness alike. Each case gets `m` (the module under test) and `ctx`
// ({ cjs, esm }: both doors to the same implementation).
//
// The greens are seen against real text: the toy shop in ejemplos/ and, for
// the header, this package's own source. The reds check errors by `name`,
// `code` and fields, never by class identity, so that only the identity case
// depends on the ESM facade. A case that checks several calls prefixes each
// failure with the call, so that its red says which one fell.

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

// Runs one of several checks of a case and prefixes its failure.
function paso(etiqueta, fn) {
  try {
    return fn();
  } catch (e) {
    throw new Error(`${etiqueta}: ${e.message}`);
  }
}

const ARGUMENTO = { name: "TypeError", code: "ANCLA_ARGUMENTO" };

const CASOS = [
  // ---------------------------------------------------------------- greens
  {
    nombre: "desde: devuelve desde el ancla, con el ancla dentro",
    color: "verde",
    run(m) {
      const r = m.desde(PEDIDO, "export function totalPedido(", "pedido.mjs");
      cierto(r.startsWith("export function totalPedido("), `no empieza por el ancla: ${corto(r.slice(0, 30))}`);
      cierto(r.includes("function redondear("), "no llega hasta redondear(): no es el resto del texto");
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
    nombre: "entre: el trozo real de calcularEnvio() empieza en su apertura y contiene su umbral",
    color: "verde",
    run(m) {
      const r = m.entre(PEDIDO, "export function calcularEnvio(", "export function totalPedido(", "pedido.mjs");
      cierto(r.startsWith("export function calcularEnvio("), `no empieza por la apertura: ${corto(r.slice(0, 30))}`);
      cierto(r.includes("ENVIO_GRATIS_DESDE"), `el trozo no contiene el umbral: ${corto(r)}`);
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
    nombre: "cerca: la ventana no parte un carácter en dos (un emoji en el borde)",
    color: "verde",
    run(m) {
      const t = "a😀X😀b";
      const uno = m.cerca(t, "X", 1);
      cierto(uno === "😀X😀", `con radio 1 la ventana parte el emoji: ${corto(uno)}`);
      const cero = m.cerca(t, "X", 0);
      cierto(cero === "X", `con radio 0 la ventana no es el ancla: ${corto(cero)}`);
    },
  },
  {
    nombre: "opciones en texto: quien no activa unica",
    color: "verde",
    run(m) {
      const a = "importeLinea(";
      cierto(PEDIDO.indexOf(a) !== PEDIDO.lastIndexOf(a), "el pedido ya no repite el ancla: el caso no mediría nada");
      const r = m.cerca(PEDIDO, a, 0, "pedido.mjs");
      cierto(r === a, `no devolvió el ancla: ${corto(r)}`);
    },
  },
  {
    nombre: "opciones: un objeto sin prototipo también vale",
    color: "verde",
    run(m) {
      const o = Object.assign(Object.create(null), { quien: "pedido.mjs", unica: true });
      const r = m.desde(PEDIDO, "export function totalPedido(", o);
      cierto(r.startsWith("export function totalPedido("), `no empieza por el ancla: ${corto(r.slice(0, 30))}`);
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
    nombre: "desde: ancla ausente lanza AnclaPerdida con ancla, papel y quien",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "function importeDeLinea(", "pedido.mjs"), {
        name: "AnclaPerdida",
        papel: "ancla",
        ancla: "function importeDeLinea(",
        quien: "pedido.mjs",
      });
    },
  },
  {
    nombre: "texto vacío: AnclaPerdida que dice que el texto está vacío",
    color: "rojo",
    run(m) {
      const e = lanza(() => m.desde("", "export function", "pedido.mjs"), { name: "AnclaPerdida", code: "ANCLA_PERDIDA" });
      cierto(/The text is empty/.test(e.message), `el mensaje no dice que el texto está vacío: ${corto(e.message)}`);
      const f = lanza(() => m.desde(PEDIDO, "no está en el pedido"), { name: "AnclaPerdida" });
      cierto(!/The text is empty/.test(f.message), "con texto, el mensaje dice que el texto está vacío");
    },
  },
  {
    nombre: "entre: cierre antes de la apertura lanza, no da un trozo vacío",
    color: "rojo",
    run(m) {
      const e = lanza(() => m.entre(PEDIDO, "export function calcularEnvio(", "export function importeLinea(", "pedido.mjs"), {
        name: "AnclaPerdida",
        papel: "cierra",
      });
      cierto(e.message.includes("(closing, searched after the opening)"), `el mensaje no dice que el cierre se buscó tras la apertura: ${corto(e.message)}`);
    },
  },
  {
    nombre: "entre: un cierre que solo aparece dentro de la apertura no cuenta",
    color: "rojo",
    run(m) {
      const abre = "export function importeLinea(";
      const cierra = "function importeLinea(";
      cierto(PEDIDO.indexOf(cierra) === PEDIDO.lastIndexOf(cierra), "el pedido ya no tiene el cierre una sola vez: el caso no mediría nada");
      lanza(() => m.entre(PEDIDO, abre, cierra, "pedido.mjs"), { name: "AnclaPerdida", papel: "cierra" });
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
    nombre: "cerca: radio inválido → ANCLA_ARGUMENTO (\"abc\", -1, 1.5, NaN, Infinity, 2**53)",
    color: "rojo",
    run(m) {
      for (const radio of ["abc", -1, 1.5, NaN, Infinity, 2 ** 53]) {
        paso(`radio ${corto(radio)}`, () => lanza(() => m.cerca(PEDIDO, "importeLinea(", radio, "pedido.mjs"), ARGUMENTO));
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
      const e = lanza(() => m.cerca(PEDIDO, a, 0, { quien: "pedido.mjs", unica: true }), {
        name: "AnclaRepetida",
        ancla: a,
        papel: "ancla",
        quien: "pedido.mjs",
      });
      cierto(Array.isArray(e.posiciones) && e.posiciones[0] === i && e.posiciones[1] === j, `posiciones ${corto(e.posiciones)} y eran [${i},${j}]`);
      cierto(Object.isFrozen(e.posiciones), "las posiciones se pueden cambiar después de lanzar");
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
    nombre: "desde con unica: repetida → AnclaRepetida",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "importeLinea(", { quien: "pedido.mjs", unica: true }), { name: "AnclaRepetida", papel: "ancla" });
    },
  },
  {
    nombre: "entre con unica: apertura repetida → AnclaRepetida que dice (opening)",
    color: "rojo",
    run(m) {
      const e = lanza(() => m.entre(PEDIDO, "importeLinea(", "\n}\n", { quien: "pedido.mjs", unica: true }), {
        name: "AnclaRepetida",
        papel: "abre",
      });
      cierto(e.message.includes("(opening)"), `el mensaje no dice qué ancla se repite: ${corto(e.message)}`);
    },
  },
  {
    nombre: "desde: ancla \"\" → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "", "pedido.mjs"), ARGUMENTO);
    },
  },
  {
    nombre: "entre: apertura \"\" → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.entre(PEDIDO, "", "\n}\n", "pedido.mjs"), ARGUMENTO);
    },
  },
  {
    nombre: "entre: cierre \"\" → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.entre(PEDIDO, "export function importeLinea(", "", "pedido.mjs"), ARGUMENTO);
    },
  },
  {
    nombre: "cerca: ancla \"\" → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.cerca(PEDIDO, "", 3, "pedido.mjs"), ARGUMENTO);
    },
  },
  {
    nombre: "desde: texto undefined → ANCLA_ARGUMENTO que dice qué llegó, no AnclaPerdida",
    color: "rojo",
    run(m) {
      const e = lanza(() => m.desde(undefined, "function importeLinea(", "pedido.mjs"), ARGUMENTO);
      cierto(e.message.includes("got undefined"), `el mensaje no dice qué llegó: ${corto(e.message)}`);
    },
  },
  {
    nombre: "entre: texto que no es cadena → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.entre(undefined, "export function importeLinea(", "\n}\n", "pedido.mjs"), ARGUMENTO);
    },
  },
  {
    nombre: "cerca: texto que no es cadena → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.cerca(undefined, "importeLinea(", 3, "pedido.mjs"), ARGUMENTO);
    },
  },
  {
    nombre: "el error lleva code y name",
    color: "rojo",
    run(m) {
      paso("AnclaPerdida", () => lanza(() => m.cerca(PEDIDO, "esto no está en el pedido", 5), { name: "AnclaPerdida", code: "ANCLA_PERDIDA" }));
      paso("AnclaRepetida", () => lanza(() => m.cerca(PEDIDO, "importeLinea(", 5, { unica: true }), { name: "AnclaRepetida", code: "ANCLA_REPETIDA" }));
      const e = paso("argumento", () => lanza(() => m.desde(PEDIDO, 42), ARGUMENTO));
      cierto(e.message.includes("got number 42"), `argumento: el mensaje no dice qué llegó: ${corto(e.message)}`);
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
    nombre: "el ancla se muestra en una sola línea, escapada y recortada",
    color: "rojo",
    run(m) {
      const e = lanza(() => m.desde(PEDIDO, "\n}\t»\nno está", "pedido.mjs"), { name: "AnclaPerdida" });
      cierto(!/[\n\t]/.test(e.message), `el mensaje lleva saltos o tabuladores sin escapar: ${corto(e.message)}`);
      cierto(e.message.includes("«\\n}\\t\\u00bb\\nno está»"), `el ancla no sale escapada entre «»: ${corto(e.message)}`);
      const largo = "no está en el pedido ".repeat(20);
      const f = lanza(() => m.desde(PEDIDO, largo, "x".repeat(500)), { name: "AnclaPerdida" });
      cierto(f.message.includes("…»"), `un ancla larga no sale recortada: ${corto(f.message)}`);
      cierto(f.message.length < 500, `un quien de 500 caracteres no sale recortado: el mensaje mide ${f.message.length}`);
    },
  },
  {
    nombre: "opción desconocida {unique:true} → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "export function importeLinea(", { unique: true }), ARGUMENTO);
    },
  },
  {
    nombre: "opción con tipo equivocado {unica:\"sí\"} → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "export function importeLinea(", { unica: "sí" }), ARGUMENTO);
    },
  },
  {
    nombre: "opción quien que no es texto {quien:42} → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      lanza(() => m.desde(PEDIDO, "export function importeLinea(", { quien: 42 }), ARGUMENTO);
    },
  },
  {
    nombre: "opciones que no son un objeto simple (Map, Date, array, número, heredadas) → ANCLA_ARGUMENTO",
    color: "rojo",
    run(m) {
      const raras = {
        Map: new Map([["unica", true]]),
        Date: new Date(0),
        array: [],
        número: 3,
        heredadas: Object.create({ unica: true }),
      };
      for (const [etiqueta, o] of Object.entries(raras)) {
        paso(etiqueta, () => lanza(() => m.desde(PEDIDO, "export function importeLinea(", o), ARGUMENTO));
      }
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
