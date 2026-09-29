// SPDX-License-Identifier: MIT
// The table, through the ESM door. The identity case in the table checks that
// both doors hand out the very same functions and classes.
import { test } from "node:test";
import { createRequire } from "node:module";
import * as esm from "../ancla.mjs";

const require = createRequire(import.meta.url);
const cjs = require("../ancla.cjs");
const { CASOS } = require("./_casos.cjs");

for (const c of CASOS) {
  test(`[esm] ${c.nombre}`, () => c.run(esm, { cjs, esm }));
}
