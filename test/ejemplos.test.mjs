// SPDX-License-Identifier: MIT
// Runs every example so that none of them rots: exit code and key lines.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(RAIZ, "ejemplos");

// One entry per example; an example without an entry is red, and so is an
// entry without its example.
const ESPERADO = {
  "01-ancla-perdida.mjs": [
    {
      env: {},
      codigo: 0,
      lineas: [
        /^1\. fuente de hoy: VERDE · el trozo mide [1-9]\d* caracteres$/m,
        /^2\. con el fallo metido .*: ROJO · la guarda lo ve$/m,
        /^3\. renombrada .* y con el fallo: VERDE · el trozo mide 0 caracteres/m,
        /^4\. la misma guarda con entre\(\): ROJO por su causa$/m,
        /AnclaPerdida: anchor not found in "tienda\/pedido\.mjs" \(opening\): «export function importeLinea\(»/,
        /^5\. y entre\(\) sobre el fuente de hoy: VERDE · el ancla no le quita el verde bueno$/m,
      ],
    },
  ],
  "02-sabotaje-en-copia.mjs": [
    {
      env: {},
      codigo: 0,
      lineas: [
        /^control \(copia sin tocar\): VERDE · caen 0 de 3$/m,
        /^sabotaje «envío siempre gratis»: ROJO · cae exactamente «envío por debajo del umbral»: esperaba 3\.9, salió 0$/m,
        /^ancla vieja con replace\(\): el texto no cambió · la guarda sale VERDE sobre código sano y no demuestra nada$/m,
        /^ancla vieja con romper\(\): se niega · el sabotaje «ancla-vieja» no encuentra qué romper/m,
        /^original intacto: sha256 igual antes y después$/m,
      ],
    },
  ],
  "03-tres-estados.mjs": [
    {
      env: {},
      codigo: 0,
      lineas: [
        /^modo: local \(un salto es PARCIAL\)$/m,
        /^PARCIAL: sin clave del almacén/m,
        /^recuento: 2 bien · 1 mal · 2 NO MIRADO \(de 5 guardas\)$/m,
        /^trampa del \\s\*: .*«ok totales»/m,
        /^veredicto: ROJO \(1 mal\)/m,
      ],
    },
    {
      env: { DOS_COLORES_SIN_SALTOS: "1" },
      codigo: 0,
      lineas: [/^modo: CI \(DOS_COLORES_SIN_SALTOS=1: un salto es ROJO\)$/m, /^veredicto: ROJO \(1 mal, y 2 NO MIRADO que en CI también son rojo\)$/m],
    },
  ],
};

export function problemas(salida, codigo, esperado) {
  const p = [];
  if (codigo !== esperado.codigo) p.push(`salió con ${codigo} y se esperaba ${esperado.codigo}`);
  for (const re of esperado.lineas) if (!re.test(salida)) p.push(`falta la línea ${re}`);
  return p;
}

function entornoLimpio(extra) {
  const env = { ...process.env };
  delete env.DOS_COLORES_SIN_SALTOS;
  return { ...env, ...extra };
}

test("población: cada ejemplo tiene lo que se espera de él, y al revés", () => {
  const reales = fs.readdirSync(DIR).filter((f) => f.endsWith(".mjs")).sort();
  assert.ok(reales.length >= 3, `solo hay ${reales.length} ejemplos`);
  assert.deepEqual(reales, Object.keys(ESPERADO).sort());
});

for (const [fichero, pasadas] of Object.entries(ESPERADO)) {
  for (const esperado of pasadas) {
    const nombre = `${fichero}${Object.keys(esperado.env).length ? " con " + JSON.stringify(esperado.env) : ""}`;
    test(nombre, () => {
      const r = spawnSync(process.execPath, [path.join(DIR, fichero)], { cwd: RAIZ, encoding: "utf8", env: entornoLimpio(esperado.env) });
      const salida = r.stdout + r.stderr;
      const p = problemas(salida, r.status, esperado);
      // The cause first; the output of the example after it, for context.
      assert.deepEqual(p, [], `${p.join("\n")}\n--- salida de ${fichero} ---\n${salida}`);
    });
  }
}

test("el conductor de ejemplos sabe fallar: código y líneas", () => {
  const esperado = { codigo: 0, lineas: [/^hola$/m, /^adiós$/m] };
  assert.deepEqual(problemas("hola\n", 1, esperado), ["salió con 1 y se esperaba 0", "falta la línea /^adiós$/m"]);
  assert.deepEqual(problemas("hola\nadiós\n", 0, esperado), []);
});
