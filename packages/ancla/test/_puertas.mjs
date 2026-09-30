// SPDX-License-Identifier: MIT
// Resolves the package BY ITS NAME through both conditions of its exports map
// (self-reference, as a user would) and prints what each door handed out, as
// one line of JSON. censo.test.mjs runs it as a child process, from the
// package itself and from a copy whose map has been broken on purpose.

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const NOMBRE = "@mrwolf99/ancla";
const r = {};

let cjs = null;
try {
  cjs = require("../ancla.cjs");
} catch (e) {
  r.cjs = String(e.code || e.name);
}

try {
  const ns = await import(NOMBRE);
  r.import = { conDefault: "default" in ns, mismaFuncion: cjs !== null && ns.desde === cjs.desde };
} catch (e) {
  r.import = { error: String(e.code || e.name) };
}

try {
  const m = require(NOMBRE);
  r.require = { esElCjs: cjs !== null && m === cjs };
} catch (e) {
  r.require = { error: String(e.code || e.name) };
}

console.log(JSON.stringify(r));
