// SPDX-License-Identifier: MIT
// The PARCIAL line and its reader, seen in both colours.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parcial, leerParciales } = require("./_parcial.cjs");

test("el lector cuenta un PARCIAL con motivo, al principio de la línea", () => {
  assert.deepEqual(leerParciales("ok a\nPARCIAL: sin clave\nok b\n"), ["sin clave"]);
  assert.deepEqual(leerParciales("PARCIAL:\tsin red\r\n"), ["sin red"]);
});

test("el lector no se deja engañar: sin motivo, motivo en blanco, sangrado o variantes", () => {
  const trampas = ["PARCIAL:\nok totales\n", "PARCIAL: \n", "PARCIAL:\t\n", "  PARCIAL: sangrado\n", "[parcial] algo\n", "PARCIAL — algo\n"];
  for (const t of trampas) assert.deepEqual(leerParciales(t), [], `leyó un motivo en ${JSON.stringify(t)}`);
});

test("parcial() exige el motivo en palabras, y la exención su porqué", () => {
  const t = { skip() {} };
  assert.throws(() => parcial(t, "  "), /needs the reason in words/);
  assert.throws(() => parcial(t, "sin clave", { exento: " " }), /exemption needs its reason/);
});
