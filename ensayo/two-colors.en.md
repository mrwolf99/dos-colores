<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# The two colours

*A summary in English of [Los dos colores](los-dos-colores.md). Samy Haggag · 2026 · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)*

## The rule

> **A check is worth nothing until it has been seen in both colours: green against what is really good, red against what is really broken, and the red failing for its own reason and saying it.**

Green is not a statement; it is the absence of red. A broken check and a sound
one print the same thing for as long as the code is fine. The difference only
shows the day the code breaks, and on that day the broken check is still green.
Nobody sees the cost of a lying green: it turns up weeks later as a bug "the
tests did not catch". A lying red is just as expensive in the other direction:
the second time a suite goes red for something that is not a defect, people
learn to ignore it.

## Three states, not two

Good, bad, and **not looked at**. A check that needs a key that is not there, a
service that does not answer or a sample that was cut short has not said
"good". Say it in one fixed line that a machine can count — here
`PARCIAL: <reason>` — and read it with `^PARCIAL:[ \t]*(.+)$`, not with `\s*`,
which swallows the newline and reads the next line as the reason. Counts come
from counters, never from a string typed by hand. In CI a skip is red; locally
it is a third colour.

## Nineteen ways a check lies

The Spanish text catalogues them in four families, each with a case from a toy
notebook shop, the guard that closes it and the question that catches it:

- **Greens that measure nothing:** the lost anchor (`slice(indexOf(...))` after
  a rename), the empty truth (`every` over an empty list, and five relatives),
  the frozen copy, looking where the fact does not live, the reassuring number,
  measuring less than promised, and two colours that do not distinguish.
- **Reds that lie:** red for another reason, the check that can never be green,
  the `||` with only one live branch, the guessed error message.
- **Greys read as green:** the skip said in prose, the undeclared cap or
  sample, the hand-written scoreboard.
- **Sabotages and endorsements that lie:** the sabotage that silently does not
  apply (`replace` with an anchor that is gone returns the text unchanged), the
  sabotage whose safety net lives inside the same script, the stale
  endorsement, the cut that compiles but lost 116 lines, the half-read line.

## How to sabotage

In a copy, never in place. `romper()` refuses if the anchor is not there
exactly once or if nothing would change. A control run on the untouched copy
must pass first. Demand the **exact** set of checks that fall and the cause of
each. Break the parts one at a time. Keep the safety net outside the script
(`git diff --exit-code`). And keep a census: every check has at least one
sabotage that has seen it fall.

## Neighbours

Seeing the red for the expected reason is old advice: Mark Seemann's
red-green-refactor checklist (2019), Derick Bailey's "red for the right reason"
(2010), the TDD skill of *superpowers*, and *goodfellow*'s `WRONG_REASON`
verdict (2026) all ask for it. Kent Beck's Test Desiderata call a test
*Specific* when the cause of a failure is obvious. Mutation testing counts
kills, and Major separates kills by assertion, exception and timeout; Du,
Palepu and Jones (ISSTA 2023) showed how much of a kill can be a crash. What
this method adds is carrying that demand to any guard, including those over
existing code; asking *which* check falls, not just that one does; breaking
parts one at a time; seeing the green against real code; and checking that the
sabotage applied. It does not generate mutants or produce a score.

## When it does not pay

Throwaway prototypes; what the compiler already guarantees; very large suites,
where mutation testing is the better tool and targeted sabotage is kept for the
guards that protect money, other people's data or anything irreversible; and
external systems that cannot be copied, where the honest answer is `PARCIAL`.

## Start tomorrow

1. Pick the three guards it would hurt most to see lying.
2. Sabotage each in a copy; check the text changed and that it falls alone, saying why.
3. Replace `slice(indexOf(...))` with `desde`, `entre` or `cerca`, or turn on the lint rule.
4. Print `PARCIAL:` wherever something is skipped, and count it apart.
5. Write the reason next to every exception, and make the unneeded exception red.
