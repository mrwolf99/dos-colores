// SPDX-License-Identifier: MIT
// Example 3 · three results, not two: good, bad, and NOT LOOKED AT.
//
// Four guards over the toy shop. Each one prints ONE line that a machine can
// read: "ok <name>", "no <name>: <why>" or "PARCIAL: <why>". The driver counts
// with counters, never by hand, says what it left out, and exits with 1 when
// something is bad (and, in CI, when something was not looked at).
//
// The guard of the sending log needs a log to read. Without one it says
// PARCIAL; given one (TIENDA_REGISTRO=<file.json>) it goes green or red like
// any other guard, so its PARCIAL is not a verdict decided in advance.

import fs from "node:fs";
import * as tienda from "./tienda/pedido.mjs";

const EN_CI = process.env.DOS_COLORES_SIN_SALTOS === "1";
const LECTOR = /^PARCIAL:[ \t]*(\S.*)$/gm;

const pedido = (numero, ...lineas) => ({ numero, correo: "cliente@tienda.test", lineas });

const GUARDAS = [
  function totales() {
    const t = tienda.totalPedido(pedido(1, { precio: 40, unidades: 1 }));
    return t === 52.3 ? "ok totales" : `no totales: esperaba 52.3, salió ${t}`;
  },
  function asuntos() {
    const cola = [];
    tienda.encolarConfirmacion(cola, pedido(1, { precio: 5, unidades: 1 }));
    tienda.encolarConfirmacion(cola, pedido(2, { precio: 5, unidades: 3 }));
    // every() over an empty queue is true: demand the population first.
    if (cola.length < 2) return `PARCIAL: solo hay ${cola.length} correos en la cola; «asuntos distintos» no se puede afirmar`;
    return new Set(cola.map((c) => c.asunto)).size === cola.length ? "ok asuntos" : "no asuntos: hay dos correos con el mismo asunto";
  },
  function pedidoVacio() {
    const t = tienda.totalPedido(pedido(3));
    return t === 0 ? "ok pedido vacío" : `no pedido vacío: cobra ${t} de envío por un pedido sin nada`;
  },
  function registroDeEnvios() {
    const ruta = process.env.TIENDA_REGISTRO;
    if (!ruta) return "PARCIAL: sin registro de la cola de envíos (TIENDA_REGISTRO); «cada correo encolado salió» no se ha mirado";
    const eventos = JSON.parse(fs.readFileSync(ruta, "utf8"));
    if (!Array.isArray(eventos) || eventos.length === 0) {
      return "PARCIAL: el registro de envíos está vacío; con 0 eventos «cada correo salió» no se puede afirmar";
    }
    const encolados = eventos.filter((e) => e.tipo === "encolado").map((e) => e.pedido);
    const salidos = new Set(eventos.filter((e) => e.tipo === "enviado").map((e) => e.pedido));
    const perdidos = encolados.filter((n) => !salidos.has(n));
    return perdidos.length === 0 ? "ok registro de envíos" : `no registro de envíos: ${perdidos.length} correos encolados no salieron (pedidos ${perdidos.join(", ")})`;
  },
];

console.log("Ejemplo 3 · tres resultados");
console.log(EN_CI ? "modo: CI (DOS_COLORES_SIN_SALTOS=1: un salto es ROJO)" : "modo: local (un salto es PARCIAL)");
console.log("");

const salida = GUARDAS.map((g) => g()).join("\n");
console.log(salida);
console.log("");

const bien = (salida.match(/^ok /gm) || []).length;
const mal = (salida.match(/^no /gm) || []).length;
const noMirado = [...salida.matchAll(LECTOR)].length;
const cuadra = bien + mal + noMirado === GUARDAS.length;
console.log(`recuento: ${bien} bien · ${mal} mal · ${noMirado} NO MIRADO (de ${GUARDAS.length} guardas)${cuadra ? "" : " · EL RECUENTO NO CUADRA"}`);

// Two traps of the reader. \s also matches the newline, so a PARCIAL without a
// reason swallows the next line and reads it as the reason; and (.+) accepts
// a reason made only of spaces.
const trampa = "PARCIAL:\nok totales\n";
const conS = /^PARCIAL:\s*(.+)$/m.exec(trampa);
const conTab = /^PARCIAL:[ \t]*(\S.*)$/m.exec(trampa);
console.log(`trampa del \\s*: con /^PARCIAL:\\s*(.+)$/m, un «PARCIAL:» sin motivo se come la línea siguiente → motivo leído: «${conS && conS[1]}»`);
const blanco = "PARCIAL: \n";
const conPunto = /^PARCIAL:[ \t]*(.+)$/m.exec(blanco);
const conNoBlanco = /^PARCIAL:[ \t]*(\S.*)$/m.exec(blanco);
console.log(`trampa del (.+): con /^PARCIAL:[ \\t]*(.+)$/m, un motivo hecho de espacios cuenta → motivo leído: «${conPunto && conPunto[1]}»`);
console.log(
  `con /^PARCIAL:[ \\t]*(\\S.*)$/m ${conTab === null && conNoBlanco === null ? "no casa ninguna de las dos" : "casa alguna"}: un PARCIAL sin motivo es un defecto de la guarda, no un motivo`,
);

let veredicto;
if (mal > 0) veredicto = `ROJO (${mal} mal${EN_CI && noMirado > 0 ? `, y ${noMirado} NO MIRADO que en CI también son rojo` : ""})`;
else if (noMirado > 0) veredicto = EN_CI ? `ROJO (${noMirado} NO MIRADO: en CI un salto es rojo)` : `PARCIAL (${noMirado} NO MIRADO; esto no es un verde)`;
else veredicto = "VERDE";
console.log(`veredicto: ${veredicto}`);
process.exitCode = veredicto.startsWith("ROJO") || !cuadra ? 1 : 0;
