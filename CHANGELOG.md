<!-- SPDX-License-Identifier: MIT -->
# Changelog

All notable changes to this repository are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
packages follow [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-09-30

### Added

- `@mrwolf99/ancla` 0.1.0: `desde`, `entre` and `cerca` cut text by anchors
  that must be there. A missing anchor throws `AnclaPerdida` (`ANCLA_PERDIDA`,
  with `papel` and `quien`), a repeated one with `unica` throws `AnclaRepetida`
  (`ANCLA_REPETIDA`, with both positions), and a bad argument throws a
  `TypeError` with code `ANCLA_ARGUMENTO`. One CommonJS implementation, an ESM
  facade that shares its instance, and identical types for both doors.
- Its tests: one table of 21 cases run through both doors; 22 sabotages, each
  applied to a copy, that must make exactly the declared cases fall for their
  declared cause, after a control run on the untouched copy; the harness seen
  in both colours; a census that fails if any case was never seen falling.
- `eslint-plugin-ancla` 0.1.0: `ancla/no-unchecked-slice` reports `slice`,
  `substring` and `substr` whose arguments call `indexOf`, `lastIndexOf`,
  `search`, `findIndex` or `findLastIndex` directly. The variable and function
  forms are declared gaps, each kept as a valid test case. RuleTester on
  `node:test`, 11 sabotages and a census.
- The essay *Los dos colores* (Spanish, CC BY 4.0) and its English summary.
- Three runnable examples over a toy notebook shop, run by the root tests so
  that they cannot rot.
- `scripts/limpieza.mjs`: generic patterns in the repository, a private list
  that never leaves the local git directory, and a `--historia` mode for the
  history.
- CI: `ancla` on Node 18–26, the plugin on ESLint 9.39.5 (Node 18–26) and
  10.11.0 (Node 20–26), types with TypeScript 7.0.2, root tests; every job ends
  with `git diff --exit-code`, and a skip is red.
