// SPDX-License-Identifier: MIT
// Every sabotage is applied to a COPY, in this same process, and must make
// EXACTLY the cases it declares fall, each for its own cause. The harness is
// itself seen in both colours at the end of the file.

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { romper } from "./_romper.mjs";
import { SABOTAJES } from "./_sabotajes.mjs";

const require = createRequire(import.meta.url);
const { correrTabla } = require("./_casos.cjs");

const PAQUETE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FICHEROS = ["ancla.cjs", "ancla.mjs"];
const huella = () => Object.fromEntries(FICHEROS.map((f) => [f, crypto.createHash("sha256").update(fs.readFileSync(path.join(PAQUETE, f))).digest("hex")]));
const ANTES = huella();
const FUENTES = Object.fromEntries(FICHEROS.map((f) => [f, fs.readFileSync(path.join(PAQUETE, f), "utf8")]));

// Copies both files to a fresh directory, breaks one of them, loads the copy
// through the ESM facade (which loads the CJS copy) and runs the whole table.
async function aplicar(sab) {
  if (sab && !FICHEROS.includes(sab.fichero)) throw new Error(`el sabotaje «${sab.id}» apunta a ${sab.fichero}, que no se copia: no se aplicaría`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ancla-sabotaje-"));
  try {
    for (const f of FICHEROS) {
      const texto = sab && sab.fichero === f ? romper(FUENTES[f], sab.de, sab.a, sab.id) : FUENTES[f];
      fs.writeFileSync(path.join(dir, f), texto);
    }
    let esm;
    let cjs;
    try {
      esm = await import(pathToFileURL(path.join(dir, "ancla.mjs")).href);
      cjs = createRequire(path.join(dir, "cargar.cjs"))("./ancla.cjs");
    } catch (e) {
      return { carga: e };
    }
    return { fallos: await correrTabla(esm, { esm, cjs }) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Empty list: what fell is exactly what was declared, each for its cause.
function comparar(fallos, caen) {
  const cayeron = fallos.map((f) => f.nombre).sort();
  const esperados = Object.keys(caen).sort();
  const problemas = [];
  if (cayeron.join("\n") !== esperados.join("\n")) {
    problemas.push(`cayó: [${cayeron.join(" | ")}] · se esperaba: [${esperados.join(" | ")}]`);
  }
  for (const f of fallos) {
    if (caen[f.nombre] && !caen[f.nombre].test(f.mensaje)) problemas.push(`«${f.nombre}» cayó por otra causa: ${f.mensaje}`);
  }
  return problemas;
}

test("control: la copia sin tocar pasa entera (copiar y cargar no es lo que falla)", async () => {
  const r = await aplicar(null);
  assert.equal(r.carga, undefined, `la copia sin tocar no carga: ${r.carga && r.carga.message}`);
  assert.deepEqual(r.fallos, []);
});

for (const s of SABOTAJES) {
  test(`${s.id}: ${s.que}`, async () => {
    const r = await aplicar(s);
    if (r.carga) assert.fail(`el sabotaje ${s.id} rompe la carga, no la prueba (rojo ajeno): ${r.carga.message}`);
    const p = comparar(r.fallos, s.caen);
    assert.deepEqual(p, [], p.join("\n"));
  });
}

// ---- the harness, in both colours ----

const S14 = SABOTAJES.find((s) => s.id === "S14");

test("arnés: un sabotaje cuya ancla no está sale rojo, no «no cae»", async () => {
  await assert.rejects(aplicar({ ...S14, id: "S-fantasma", de: "esto no está en el fuente" }), /«S-fantasma» no encuentra qué romper/);
});

test("arnés: un sabotaje que no cambia nada sale rojo", async () => {
  await assert.rejects(aplicar({ ...S14, id: "S-igual", a: S14.de }), /«S-igual» no cambia nada/);
});

test("arnés: un sabotaje ambiguo sale rojo", async () => {
  await assert.rejects(aplicar({ ...S14, id: "S-ambiguo", de: "return t.slice(" }), /«S-ambiguo» es ambiguo: .* aparece 3 veces/);
});

test("arnés: un sabotaje contra un fichero que no se copia sale rojo", async () => {
  await assert.rejects(aplicar({ ...S14, id: "S-otro", fichero: "otro.cjs" }), /no se copia: no se aplicaría/);
});

test("arnés: un caen equivocado sale rojo y nombra lo que cayó y lo que se esperaba", async () => {
  const r = await aplicar(S14);
  const p = comparar(r.fallos, { "cerca: la ventana contiene el ancla entera aunque el radio sea menor": /./ });
  assert.equal(p.length, 1, p.join("\n"));
  assert.match(p[0], /^cayó: \[entre no incluye el cierre\] · se esperaba: \[cerca: la ventana contiene el ancla entera/);
});

test("arnés: el caso correcto cayendo por otra causa también sale rojo", async () => {
  const r = await aplicar(S14);
  const p = comparar(r.fallos, { "entre no incluye el cierre": /una causa que no es la suya/ });
  assert.deepEqual(p, ["«entre no incluye el cierre» cayó por otra causa: el trozo incluye el cierre"]);
});

test("arnés: un sabotaje que rompe la carga se ve como rojo ajeno, no como caza", async () => {
  const r = await aplicar({ ...S14, id: "S-carga", de: "function desde(", a: "function desde((" });
  assert.ok(r.carga instanceof SyntaxError, `se esperaba un SyntaxError al cargar y salió ${r.carga}`);
  assert.equal(r.fallos, undefined, "con la carga rota no se ha corrido ninguna prueba");
});

test("el original sigue intacto: sha256 de antes y de después", () => {
  assert.deepEqual(huella(), ANTES);
});
