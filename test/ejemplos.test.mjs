// SPDX-License-Identifier: MIT
// Runs every example so that none of them rots: exit code and key lines. It
// is also the net OUTSIDE the examples: it takes the fingerprint of ejemplos/
// before and after each run, because an example that sabotages cannot be the
// one that says the original is intact.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(RAIZ, "ejemplos");

const EVENTOS_BIEN = [
  { tipo: "encolado", pedido: 1 },
  { tipo: "encolado", pedido: 2 },
  { tipo: "enviado", pedido: 1 },
  { tipo: "enviado", pedido: 2 },
];
const EVENTOS_MAL = [
  { tipo: "encolado", pedido: 1 },
  { tipo: "encolado", pedido: 2 },
  { tipo: "enviado", pedido: 1 },
];

// One entry per example; an example without an entry is red, and so is an
// entry without its example. `registro`, when present, is written to a
// temporary file and passed as TIENDA_REGISTRO.
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
        /^original: no se ha abierto para escribir; que siga igual lo comprueba quien lanza este guion, no el guion$/m,
      ],
    },
  ],
  "03-tres-estados.mjs": [
    {
      env: {},
      codigo: 1,
      lineas: [
        /^modo: local \(un salto es PARCIAL\)$/m,
        /^PARCIAL: sin registro de la cola de envíos/m,
        /^recuento: 2 bien · 1 mal · 1 NO MIRADO \(de 4 guardas\)$/m,
        /^trampa del \\s\*: .*«ok totales»$/m,
        /^trampa del \(\.\+\): .*motivo leído: « »$/m,
        /no casa ninguna de las dos/,
        /^veredicto: ROJO \(1 mal\)$/m,
      ],
    },
    {
      env: { DOS_COLORES_SIN_SALTOS: "1" },
      codigo: 1,
      lineas: [/^modo: CI \(DOS_COLORES_SIN_SALTOS=1: un salto es ROJO\)$/m, /^veredicto: ROJO \(1 mal, y 1 NO MIRADO que en CI también son rojo\)$/m],
    },
    {
      etiqueta: "registro bueno",
      env: {},
      registro: EVENTOS_BIEN,
      codigo: 1,
      lineas: [/^ok registro de envíos$/m, /^recuento: 3 bien · 1 mal · 0 NO MIRADO \(de 4 guardas\)$/m],
    },
    {
      etiqueta: "registro con un correo perdido",
      env: {},
      registro: EVENTOS_MAL,
      codigo: 1,
      lineas: [/^no registro de envíos: 1 correos encolados no salieron \(pedidos 2\)$/m, /^recuento: 2 bien · 2 mal · 0 NO MIRADO \(de 4 guardas\)$/m],
    },
    {
      etiqueta: "registro vacío",
      env: {},
      registro: [],
      codigo: 1,
      lineas: [/^PARCIAL: el registro de envíos está vacío/m, /^recuento: 2 bien · 1 mal · 1 NO MIRADO \(de 4 guardas\)$/m],
    },
  ],
};

export function problemas(salida, codigo, esperado) {
  const p = [];
  if (codigo !== esperado.codigo) p.push(`salió con ${codigo} y se esperaba ${esperado.codigo}`);
  for (const re of esperado.lineas) if (!re.test(salida)) p.push(`falta la línea ${re}`);
  return p;
}

export function huellaDeCarpeta(dir) {
  const h = {};
  const pila = [dir];
  while (pila.length) {
    const d = pila.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) pila.push(p);
      else h[path.relative(dir, p).split(path.sep).join("/")] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
    }
  }
  return h;
}

export function cambiados(antes, despues) {
  const todos = [...new Set([...Object.keys(antes), ...Object.keys(despues)])].sort();
  return todos.flatMap((f) => (!(f in despues) ? [`${f} (borrado)`] : !(f in antes) ? [`${f} (nuevo)`] : antes[f] !== despues[f] ? [`${f} (cambió)`] : []));
}

function entornoLimpio(extra) {
  const env = { ...process.env };
  delete env.DOS_COLORES_SIN_SALTOS;
  delete env.TIENDA_REGISTRO;
  return { ...env, ...extra };
}

test("población: cada ejemplo tiene lo que se espera de él, y al revés", () => {
  const reales = fs.readdirSync(DIR).filter((f) => f.endsWith(".mjs")).sort();
  assert.ok(reales.length >= 3, `solo hay ${reales.length} ejemplos`);
  assert.deepEqual(reales, Object.keys(ESPERADO).sort());
});

for (const [fichero, pasadas] of Object.entries(ESPERADO)) {
  for (const esperado of pasadas) {
    const extra = esperado.etiqueta ?? (Object.keys(esperado.env).length ? JSON.stringify(esperado.env) : "");
    test(`${fichero}${extra ? " con " + extra : ""}`, () => {
      const tmp = esperado.registro ? fs.mkdtempSync(path.join(os.tmpdir(), "tienda-registro-")) : null;
      try {
        const env = { ...esperado.env };
        if (tmp) {
          env.TIENDA_REGISTRO = path.join(tmp, "registro.json");
          fs.writeFileSync(env.TIENDA_REGISTRO, JSON.stringify(esperado.registro));
        }
        const antes = huellaDeCarpeta(DIR);
        const r = spawnSync(process.execPath, [path.join(DIR, fichero)], { cwd: RAIZ, encoding: "utf8", env: entornoLimpio(env) });
        const salida = r.stdout + r.stderr;
        const p = problemas(salida, r.status, esperado);
        const tocados = cambiados(antes, huellaDeCarpeta(DIR));
        if (tocados.length > 0) p.unshift(`el ejemplo ha tocado ejemplos/: ${tocados.join(", ")}`);
        // The cause first; the output of the example after it, for context.
        assert.deepEqual(p, [], `${p.join("\n")}\n--- salida de ${fichero} ---\n${salida}`);
      } finally {
        if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  }
}

test("el conductor de ejemplos sabe fallar: código y líneas", () => {
  const esperado = { codigo: 0, lineas: [/^hola$/m, /^adiós$/m] };
  assert.deepEqual(problemas("hola\n", 1, esperado), ["salió con 1 y se esperaba 0", "falta la línea /^adiós$/m"]);
  assert.deepEqual(problemas("hola\nadiós\n", 0, esperado), []);
});

test("la red de fuera sabe fallar: un fichero cambiado, uno nuevo y uno borrado se ven, cada uno con su nombre", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "red-ejemplos-"));
  try {
    fs.mkdirSync(path.join(dir, "tienda"));
    fs.writeFileSync(path.join(dir, "tienda", "pedido.mjs"), "export const A = 1;\n");
    fs.writeFileSync(path.join(dir, "viejo.mjs"), "x\n");
    const antes = huellaDeCarpeta(dir);
    assert.deepEqual(cambiados(antes, huellaDeCarpeta(dir)), [], "sin tocar nada no debe haber cambios");
    fs.writeFileSync(path.join(dir, "tienda", "pedido.mjs"), "export const A = 2;\n");
    fs.writeFileSync(path.join(dir, "nuevo.mjs"), "y\n");
    fs.rmSync(path.join(dir, "viejo.mjs"));
    assert.deepEqual(cambiados(antes, huellaDeCarpeta(dir)), ["nuevo.mjs (nuevo)", "tienda/pedido.mjs (cambió)", "viejo.mjs (borrado)"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
