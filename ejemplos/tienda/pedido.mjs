// SPDX-License-Identifier: MIT
// A toy notebook shop. It is the only source the examples and the tests read,
// so that every green is seen against real code and not against a string the
// check made up for itself.

export const IMPUESTO = 0.21;
export const ENVIO_GRATIS_DESDE = 50;
export const COSTE_ENVIO = 3.9;

/** Amount of one line, before tax. Shipping is NOT part of a line. */
export function importeLinea(linea) {
  return redondear(linea.precio * linea.unidades);
}

/** Shipping for the whole order: free from the threshold up, a flat fee below it. */
export function calcularEnvio(pedido) {
  const base = sumaLineas(pedido);
  return base >= ENVIO_GRATIS_DESDE ? 0 : COSTE_ENVIO;
}

/** What the customer pays: lines plus tax, plus shipping. */
export function totalPedido(pedido) {
  return redondear(sumaLineas(pedido) * (1 + IMPUESTO) + calcularEnvio(pedido));
}

/** Subject of the confirmation e-mail. */
export function asuntoConfirmacion(pedido) {
  const n = pedido.lineas.reduce((s, l) => s + l.unidades, 0);
  return `Pedido ${pedido.numero}: ${n} ${n === 1 ? "cuaderno" : "cuadernos"}`;
}

/** Puts the confirmation in the sending queue. An order without e-mail is not queued. */
export function encolarConfirmacion(cola, pedido) {
  if (!pedido.correo) throw new Error(`pedido ${pedido.numero}: sin correo, no se encola`);
  cola.push({ para: pedido.correo, asunto: asuntoConfirmacion(pedido) });
  return cola.length;
}

function sumaLineas(pedido) {
  return pedido.lineas.reduce((s, l) => s + importeLinea(l), 0);
}

function redondear(x) {
  return Math.round(x * 100) / 100;
}
