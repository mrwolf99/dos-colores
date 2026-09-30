// SPDX-License-Identifier: MIT
// Example 2 · sabotage in a copy, never in place.
//
// Three checks guard the shipping rules of the toy shop. To see them red we
// break the shop in a temporary COPY and load the copy. Before that, a control:
// the untouched copy must pass, or copying and loading is what fails.
//
// This script never writes to the original, and it does not check that it is
// intact either: a script that checks itself would say "intact" only if it
// got to the end. Whoever launches it does that (test/ejemplos.test.mjs takes
// the fingerprint of ejemplos/ before and after, and CI ends with
// git diff --exit-code).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { romper } from "../packages/ancla/test/_romper.mjs";

const ORIGEN = new URL("./tienda/pedido.mjs", import.meta.url);
const TEXTO = fs.readFileSync(ORIGEN, "utf8");

const pedido = (importe) => ({ numero: 1, correo: "cliente@tienda.test", lineas: [{ precio: importe, unidades: 1 }] });

function igual(salio, esperaba) {
  if (salio !== esperaba) throw new Error(`esperaba ${esperaba}, salió ${salio}`);
}

const COMPROBACIONES = [
  { nombre: "envío por debajo del umbral", run: (t) => igual(t.calcularEnvio(pedido(40)), 3.9) },
  { nombre: "envío gratis desde el umbral", run: (t) => igual(t.calcularEnvio(pedido(50)), 0) },
  { nombre: "el total lleva el impuesto", run: (t) => igual(t.totalPedido(pedido(60)), 72.6) },
];

async function cargarCopia(texto) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tienda-sabotaje-"));
  try {
    const f = path.join(dir, "pedido.mjs");
    fs.writeFileSync(f, texto);
    return await import(pathToFileURL(f).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function correr(texto) {
  const tienda = await cargarCopia(texto);
  const fallos = [];
  for (const c of COMPROBACIONES) {
    try {
      c.run(tienda);
    } catch (e) {
      fallos.push(`«${c.nombre}»: ${e.message}`);
    }
  }
  return fallos;
}

console.log("Ejemplo 2 · sabotear en copia, nunca en sitio");
console.log("");

const control = await correr(TEXTO);
console.log(`control (copia sin tocar): ${control.length === 0 ? "VERDE" : "ROJO"} · caen ${control.length} de ${COMPROBACIONES.length}`);

const gratis = romper(TEXTO, "return base >= ENVIO_GRATIS_DESDE ? 0 : COSTE_ENVIO;", "return 0;", "envío siempre gratis");
const caen = await correr(gratis);
const exacto = caen.length === 1 && caen[0].startsWith("«envío por debajo del umbral»");
console.log(`sabotaje «envío siempre gratis»: ${caen.length > 0 ? "ROJO" : "VERDE"} · cae ${exacto ? "exactamente " : ""}${caen.join(" y ")}`);

// A sabotage written for a version where calcularEnvio() also took the zone.
const VIEJA = "export function calcularEnvio(pedido, zona) {";
const conReplace = TEXTO.replace(VIEJA, "export function calcularEnvio(pedido, zona) {\n  return 0;");
const sano = await correr(conReplace);
if (conReplace === TEXTO && sano.length === 0) {
  console.log("ancla vieja con replace(): el texto no cambió · la guarda sale VERDE sobre código sano y no demuestra nada");
}
try {
  romper(TEXTO, VIEJA, "export function calcularEnvio(pedido, zona) {\n  return 0;", "ancla-vieja");
  console.log("ancla vieja con romper(): se aplicó (esto no debería pasar)");
} catch (e) {
  console.log(`ancla vieja con romper(): se niega · ${e.message}`);
}

console.log("original: no se ha abierto para escribir; que siga igual lo comprueba quien lanza este guion, no el guion");
