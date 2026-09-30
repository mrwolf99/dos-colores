// SPDX-License-Identifier: MIT
// Example 3 · three states, not two: good, bad, and NOT LOOKED AT.
//
// Five guards over the toy shop. Each one prints ONE line that a machine can
// read: "ok <name>", "no <name>: <why>" or "PARCIAL: <why>". The driver counts
// with counters, never by hand, and says what it left out.

import * as tienda from "./tienda/pedido.mjs";

const EN_CI = process.env.DOS_COLORES_SIN_SALTOS === "1";
const LECTOR = /^PARCIAL:[ \t]*(.+)$/gm;
const CLAVE_ALMACEN = undefined; // this example has no warehouse to talk to

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
  function almacen() {
    if (!CLAVE_ALMACEN) return "PARCIAL: sin clave del almacén; no se ha mirado si hay stock de lo que se vende";
    return "ok almacén";
  },
  function colaDeEnvios() {
    const eventos = []; // the log the guard would read is empty in this example
    if (eventos.length === 0) return "PARCIAL: la cola de envíos no tiene eventos que mirar; «activa» no se puede afirmar con 0 eventos";
    return "ok cola";
  },
];

console.log("Ejemplo 3 · tres estados");
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

// The trap: \s also matches the newline, so a PARCIAL without a reason
// swallows the next line and reads it as the reason.
const trampa = "PARCIAL:\nok totales\n";
const conS = /^PARCIAL:\s*(.+)$/m.exec(trampa);
const conTab = /^PARCIAL:[ \t]*(.+)$/m.exec(trampa);
console.log(`trampa del \\s*: con /^PARCIAL:\\s*(.+)$/m, un «PARCIAL:» sin motivo se come la línea siguiente → motivo leído: «${conS && conS[1]}»`);
console.log(`con /^PARCIAL:[ \\t]*(.+)$/m ${conTab === null ? "no casa" : "casa"}: un PARCIAL sin motivo es un defecto de la guarda, no un motivo`);

let veredicto;
if (mal > 0) veredicto = `ROJO (${mal} mal${EN_CI && noMirado > 0 ? `, y ${noMirado} NO MIRADO que en CI también son rojo` : ""})`;
else if (noMirado > 0) veredicto = EN_CI ? `ROJO (${noMirado} NO MIRADO: en CI un salto es rojo)` : `PARCIAL (${noMirado} NO MIRADO; esto no es un verde)`;
else veredicto = "VERDE";
console.log(`veredicto: ${veredicto}`);
console.log("(este ejemplo sale con 0 porque es una demostración; un conductor de verdad saldría con 1)");
