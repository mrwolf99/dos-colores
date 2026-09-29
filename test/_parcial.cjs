// SPDX-License-Identifier: MIT
"use strict";

// The third colour. A check that could not look prints ONE line with a fixed
// format, at the start of the line, so a machine can count it:
//
//   PARCIAL: <reason>
//
// Locally that is a skip, and the runner counts it apart from passes and
// failures. With DOS_COLORES_SIN_SALTOS=1 (set in CI) a skip is red, unless
// the caller writes down why this particular skip is exempt.

const LECTOR = /^PARCIAL:[ \t]*(.+)$/gm; // not \s*: it would swallow the next line

function parcial(t, motivo, opciones) {
  if (typeof motivo !== "string" || motivo.trim() === "") {
    throw new TypeError("parcial() needs the reason in words");
  }
  const exento = opciones && opciones.exento;
  if (exento !== undefined && (typeof exento !== "string" || exento.trim() === "")) {
    throw new TypeError("an exemption needs its reason written next to it");
  }
  const linea = "PARCIAL: " + motivo + (exento ? " (exento de DOS_COLORES_SIN_SALTOS: " + exento + ")" : "");
  process.stdout.write(linea + "\n");
  if (process.env.DOS_COLORES_SIN_SALTOS === "1" && !exento) {
    throw new Error(linea + " — con DOS_COLORES_SIN_SALTOS=1 un salto es rojo");
  }
  t.skip(linea);
}

function leerParciales(salida) {
  return [...String(salida).matchAll(LECTOR)].map((m) => m[1]);
}

module.exports = { parcial, leerParciales, LECTOR };
