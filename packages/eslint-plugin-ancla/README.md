<!-- SPDX-License-Identifier: MIT -->
# eslint-plugin-ancla

One rule, [`ancla/no-unchecked-slice`](docs/rules/no-unchecked-slice.md): it
reports `slice(indexOf(...))` and its relatives (`substring`, `substr`,
`splice`, `toSpliced`, `subarray`, `at`), a position that can be `-1`. When the
anchor disappears, the call still runs on the wrong piece, and the check that
reads it passes without measuring anything.

The fix is either an explicit `-1` check or the functions of
[`@mrwolf99/ancla`](../ancla/README.md), which throw a red that names its cause.

```js
// eslint.config.js
const ancla = require("eslint-plugin-ancla");

module.exports = [
  ancla.configs.recommended,
  // optional: an exception that no longer silences anything is an error, not a warning
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
];
```

Requires ESLint 9 or later (flat config). Node: whatever your ESLint needs
(ESLint 9 runs on Node 18.18 or later; ESLint 10 on Node 20.19, 22.13, or 24
and later).

```sh
npm install --save-dev eslint eslint-plugin-ancla
```

Or copy `index.cjs`, `package.json` and `rules/` into your project and load the
plugin from there.

## Limits

The rule sees only the direct form. An index that travels through a variable
or a function is not reported yet, and neither are `charAt()` nor bracket
indexing; the rule page lists every declared gap, and each gap that the rule
could see is a test case that will turn red on purpose when it is closed. One
idiom is exempt on purpose: `x.slice(x.lastIndexOf(sep) + 1)`.

## How it is tested

`RuleTester` runs on `node:test`, on ESLint 9 and 10. Then 26 sabotages, each
applied to a copy of the rule, must make **exactly** the cases they declare
fall, each for its own cause (the RuleTester message); a census fails if any
case, valid or invalid, has never been seen falling. The promise about unused
exceptions is checked with the real `Linter`. Without ESLint installed the
parts that need it print `PARCIAL:` and are a skip locally and red in CI.

## License

MIT
