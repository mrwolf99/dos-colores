// SPDX-License-Identifier: MIT
"use strict";
// The table, through the CommonJS door.
const { test } = require("node:test");
const cjs = require("../ancla.cjs");
const { CASOS } = require("./_casos.cjs");

const esmListo = import("../ancla.mjs");

for (const c of CASOS) {
  test(`[cjs] ${c.nombre}`, async () => c.run(cjs, { cjs, esm: await esmListo }));
}
