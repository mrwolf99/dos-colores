<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# The two colours

*A summary in English of [Los dos colores](los-dos-colores.md). Samy Haggag · 2026 · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)*

## The rule

> **A check only deserves trust once it has been seen in both colours: green on code that is really good, red on code that is broken, and in that red failing for the fault it claims to watch and naming it.**

Green is not a statement; it is the absence of red. As long as the code is
fine, a broken check and a sound one print the same thing. The difference only
shows the day the code breaks, and on that day the broken check is still green.
Nobody sees the cost of a lying green: it turns up weeks later as a bug "the
tests did not catch". A lying red costs as much the other way: the second time
a suite goes red for something that is not a defect, people learn to wave it
through.

## Three results, not two

Good, bad, and **not looked at**. A check that needs a key that is not there, a
service that does not answer or a sample that was cut short has not said
"good". Test formats know this (TAP's `# SKIP` directive, Mocha's
`--forbid-pending`), but summaries lose it. Say it in one fixed line that a
machine can count — here `PARCIAL: <reason>` — and read it with
`^PARCIAL:[ \t]*(\S.*)$`: not with `\s*`, which swallows the newline and reads
the next line as the reason, and not with `(.+)`, which accepts a reason made
of spaces. Counts come from counters, never from a string typed by hand. In CI
a skip is red; locally it is a third colour.

## Nineteen ways a check lies

The Spanish text catalogues them in four families. Each comes with its symptom,
a case from a toy notebook shop, the guard that closes it and the question
that catches it:

- **Greens that measure nothing:** the lost anchor (`slice(indexOf(...))` after
  a rename), the empty truth (`every` over an empty list, and five relatives),
  the frozen copy, looking where the fact does not live, the reassuring number,
  measuring less than promised, and two colours that do not distinguish — or
  two routes that give the same answer, so nobody knows which one answered.
- **Reds that lie:** red for another reason, the check that can never be green,
  the `||` with only one live branch, the guessed error message.
- **Greys read as green:** the skip said in prose, the undeclared cap or
  sample, the hand-written scoreboard.
- **Sabotages and endorsements that lie:** the sabotage that silently does not
  apply (`replace` with a pattern that is gone returns the text unchanged), the
  safety net that lives inside the sabotaging script, the stale endorsement,
  the cut that compiles but lost part of what it moved, the half-read line.

## The code in this repository

- **`@mrwolf99/ancla`** ([`packages/ancla`](../packages/ancla/README.md)):
  `desde` (from), `entre` (between) and `cerca` (near) cut text by anchors that
  must be there. A missing anchor throws `AnclaPerdida` with a message that
  names who was looking and for what, instead of returning the wrong piece.
- **`eslint-plugin-ancla`** ([`packages/eslint-plugin-ancla`](../packages/eslint-plugin-ancla/README.md)):
  the rule `ancla/no-unchecked-slice` reports the direct forms of
  `slice(indexOf(...))` and its relatives. The form through a variable is a
  declared gap.
- **`romper()`** ([`packages/ancla/test/_romper.mjs`](../packages/ancla/test/_romper.mjs)):
  about thirty lines that replace text by position and refuse when the text is
  not there exactly once or when nothing would change. It is how every sabotage
  in the repository is applied.

None of them is on npm yet; until they are, copy the files.

A word on the name: Canedo (2026) calls *oracle anchoring* an oracle that takes
its expected value from the very system it judges, and so cannot fail. The
"anchor" here is something else: a fixed piece of text that has to be there,
whose absence is the failure.

## How to sabotage

In a copy, never in place. `romper()` refuses if the text is not there exactly
once or if nothing would change. A control run on the untouched copy must pass
first. Demand the **exact** set of checks that fall and the cause of each.
Break the parts one at a time. Keep the safety net outside the sabotaging
script (`git diff --exit-code` in CI; the example runner fingerprints the
examples before and after each run). And keep a census: every check has at
least one sabotage that has seen it fall.

## Neighbours

Seeing the red for the expected reason is old advice. Mark Seemann's
red-green-refactor checklist (2019) and Derick Bailey's "red for the right
reason" (2010) ask for it; the TDD skill of *superpowers* asks to verify the
red and to name the production change that should break each test, and an open
pull request extends it to refactors of existing code; *goodfellow* replays new
tests against the base branch and flags a red that did not come from an
assertion (`WRONG_REASON`), asks for a deliberate break per rule on a saved
copy, and adds diff-scoped mutation testing. Kent Beck's Test Desiderata call
a test *Specific* when the cause of a failure is obvious. Mutation testing
counts kills; Stryker keeps timeouts and runtime errors apart and can record
which tests killed a mutant, and Major classifies each kill as assertion,
exception or timeout. Du, Palepu and Jones (ISSTA 2023) found that a
substantial share of kills are crashes rather than failed assertions. Both
*superpowers* and *goodfellow* discourage tests that grep source text, rightly:
`ancla` is for when there is no behaviour to run.

What this adds, as far as I have looked, is narrow: demanding the exact set of
checks each sabotage must make fall, and the cause of each, with a harness
that enforces it; checking that the sabotage actually applied; the catalogue;
and, for the cheapest mistake, a library and a lint rule. It does not generate
mutants or produce a score.

## When it does not pay

When the behaviour can be tested instead; throwaway prototypes; what the
compiler already guarantees; very large suites, where mutation testing is the
better tool and targeted sabotage is kept for the guards that protect money,
other people's data or anything irreversible; and external systems that cannot
be copied, where the honest answer is `PARCIAL`.

## Start tomorrow

1. Pick the three guards it would hurt most to see lying.
2. Sabotage each in a copy; check that the text changed, that exactly what you
   expected falls, and that it says why.
3. Replace `slice(indexOf(...))` with `desde`, `entre` or `cerca`. The lint
   rule finds the direct form; the form through a variable you still have to
   find by hand.
4. Print `PARCIAL:` wherever something is skipped, and count it apart.
5. Write the reason next to every exception, and raise
   `reportUnusedDisableDirectives` to `"error"` so that an exception nobody
   needs any more turns the lint red.
