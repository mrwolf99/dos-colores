<!-- SPDX-License-Identifier: MIT -->
# eslint-plugin-ancla

One rule, [`ancla/no-unchecked-slice`](docs/rules/no-unchecked-slice.md): it
reports `slice(indexOf(...))` and its relatives, a cut at a position that can
be `-1`. When the anchor disappears, the cut is still made on the wrong piece,
and the check that reads it passes without measuring anything.

The fix is either an explicit `-1` check or the functions of
[`@mrwolf99/ancla`](../ancla/README.md), which throw a red that names its cause.

```js
// eslint.config.js
const ancla = require("eslint-plugin-ancla");

module.exports = [
  ancla.configs.recommended,
  { linterOptions: { reportUnusedDisableDirectives: "error" } }, // optional: exceptions can only shrink
];
```

Requires ESLint 9 or later (flat config) and Node 18.18 or later.

## Limits

The 0.1.0 rule sees only the direct form. An index that travels through a
variable or a function is not reported yet; the rule page lists every declared
gap, and each gap is a test case that will turn red on purpose when it is
closed.

## How it is tested

`RuleTester` runs on `node:test`. Then 11 sabotages, each applied to a copy of
the rule, must make **exactly** the cases they declare fall; a census fails if
any case, valid or invalid, has never been seen falling. Without ESLint
installed the RuleTester part prints `PARCIAL:` and is a skip locally and red
in CI.

## License

MIT
