// SPDX-License-Identifier: MIT
// Example 1 · the lost anchor.
//
// A guard says «a line of the order does not add shipping». It cuts the body
// of importeLinea() out of the source with indexOf and checks that the piece
// does not mention the shipping cost. Then someone renames the function.

import fs from "node:fs";
import { entre } from "../packages/ancla/ancla.mjs";
import { romper } from "../packages/ancla/test/_romper.mjs";

const HOY = fs.readFileSync(new URL("./tienda/pedido.mjs", import.meta.url), "utf8");
const ANCLA = "export function importeLinea(";

function guardaIngenua(src) {
  const i = src.indexOf(ANCLA);
  const trozo = src.slice(i, src.indexOf("\n}\n", i));
  return { verde: !trozo.includes("ENVIO"), trozo };
}

function guardaConAncla(src) {
  const trozo = entre(src, ANCLA, "\n}\n", "tienda/pedido.mjs");
  return { verde: !trozo.includes("ENVIO"), trozo };
}

const color = (r) => (r.verde ? "VERDE" : "ROJO");

// In memory only: the file on disk is never touched.
const CON_FALLO = romper(
  HOY,
  "return redondear(linea.precio * linea.unidades);",
  "return redondear(linea.precio * linea.unidades + COSTE_ENVIO);",
  "la línea suma el envío",
);
const RENOMBRADA = romper(CON_FALLO, "export function importeLinea(linea)", "export function importeDeLinea(linea)", "renombrar");

console.log("Ejemplo 1 · el ancla perdida");
console.log('guarda: «importeLinea no suma el envío», cortada con src.slice(i, src.indexOf("\\n}\\n", i))');
console.log("");

const a = guardaIngenua(HOY);
console.log(`1. fuente de hoy: ${color(a)} · el trozo mide ${a.trozo.length} caracteres`);

const b = guardaIngenua(CON_FALLO);
console.log(`2. con el fallo metido (la línea suma COSTE_ENVIO): ${color(b)} · la guarda lo ve`);

const c = guardaIngenua(RENOMBRADA);
console.log(`3. renombrada a importeDeLinea y con el fallo: ${color(c)} · el trozo mide ${c.trozo.length} caracteres  <- un verde que no mide`);

try {
  guardaConAncla(RENOMBRADA);
  console.log("4. la misma guarda con entre(): VERDE (esto no debería pasar)");
} catch (e) {
  console.log("4. la misma guarda con entre(): ROJO por su causa");
  console.log(`   ${e.message}`);
}

const d = guardaConAncla(HOY);
console.log(`5. y entre() sobre el fuente de hoy: ${color(d)} · el ancla no le quita el verde bueno`);
