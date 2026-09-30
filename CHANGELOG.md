<!-- SPDX-License-Identifier: MIT -->
# Changelog

All notable changes to this repository are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
packages follow [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-09-30

Not published yet: this entry describes the first release as it stands.

### Added

- `@mrwolf99/ancla` 0.1.0: `desde`, `entre` and `cerca` cut text by anchors
  that must be there. A missing anchor throws `AnclaPerdida` (`ANCLA_PERDIDA`,
  with `ancla`, `papel` and `quien`; the message says when the text itself is
  empty), a repeated one with `unica` throws `AnclaRepetida` (`ANCLA_REPETIDA`,
  with `ancla`, `papel`, both positions and `quien`), and a bad argument throws
  a `TypeError` with code `ANCLA_ARGUMENTO`. Options are a string or a plain
  object with own keys only. `cerca` never cuts a surrogate pair in half. The
  anchor is shown escaped, on one line, and cut at 80 characters. One CommonJS
  implementation, an ESM facade that shares its instance, and identical types
  for both doors.
- Its tests: one table of 36 cases run through both doors; 56 sabotages, one
  for every check in the source that can be broken alone, each applied to a
  copy and required to make exactly the declared cases fall for their declared
  cause, after a control run on the untouched copy; the harness seen in both
  colours; a census that fails if any case was never seen falling; the exports
  map exercised by the package name, and seen red with its conditions swapped;
  types through both doors, seen red when they degenerate to `any`, lose a
  field or make the error classes constructible.
- `eslint-plugin-ancla` 0.1.0: `ancla/no-unchecked-slice` reports `slice`,
  `substring`, `substr`, `splice`, `toSpliced`, `subarray` and `at` whose
  arguments call `indexOf`, `lastIndexOf`, `search`, `findIndex` or
  `findLastIndex` directly, once per call and naming the left-most finder.
  `x.slice(x.lastIndexOf(sep) + 1)` is exempt on purpose. The variable form,
  `charAt`, `call()` and the index through a function or a class are declared
  gaps or limits, each kept as a valid test case. RuleTester on `node:test`
  (ESLint 9 and 10), 26 sabotages with the expected RuleTester message of each
  case, a census, and the promise about unused disable directives checked with
  the real `Linter`.
- The essay *Los dos colores* (Spanish, CC BY 4.0) and its English summary.
- Three runnable examples over a toy notebook shop, run by the root tests so
  that they cannot rot; the runner fingerprints `ejemplos/` before and after
  each one, from outside the example.
- `scripts/limpieza.mjs`: generic patterns in the repository, a private list
  that never leaves the local git directory, and a `--historia` mode for the
  history, merges included.
- CI: `ancla` on Node 18–26, the plugin on ESLint 9.39.5 (Node 18–26) and
  10.11.0 (Node 20–26), types with TypeScript 7.0.2, root tests; every job ends
  with `git diff --exit-code`, and a skip is red.
