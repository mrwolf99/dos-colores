// SPDX-License-Identifier: MIT
"use strict";

const pkg = require("./package.json");
const noUncheckedSlice = require("./rules/no-unchecked-slice.cjs");

const plugin = {
  meta: { name: pkg.name, version: pkg.version },
  rules: { "no-unchecked-slice": noUncheckedSlice },
  configs: {},
};

// Flat config. It does not touch linterOptions: making unused
// `eslint-disable` comments an error is the user's call (see the README).
plugin.configs.recommended = {
  plugins: { ancla: plugin },
  rules: { "ancla/no-unchecked-slice": "error" },
};

module.exports = plugin;
