<!-- SPDX-License-Identifier: MIT -->
# @mrwolf99/ancla

Cut text by anchors that **must** be there.

Checks that look inside source code often do `text.slice(text.indexOf(anchor))`.
When somebody renames the anchor, `indexOf` returns `-1` and the check keeps
running on the wrong piece: the last character, the whole text, or nothing at
all. A negative check ("this function does not mention X") then passes, green,
measuring nothing.

`ancla` turns the missing anchor into the failure, with a message that names
its cause. It has no dependencies and ships CommonJS, ESM and types from one
implementation.

```js
import { entre } from "@mrwolf99/ancla";

const body = entre(source, "export function lineAmount(", "\n}\n", "shop/order.mjs");
assert.ok(!body.includes("SHIPPING"));
// Renamed function? → AnclaPerdida: anchor not found in "shop/order.mjs" (opening): «export function lineAmount(». …
```

The names are Spanish: *desde* = from, *entre* = between, *cerca* = near,
*ancla* = anchor, *quien* = who, *unica* = unique.

**Not on npm yet.** Until it is, copy [`ancla.cjs`](ancla.cjs) (one file, no
dependencies) and, if you want the ESM door and the types, `ancla.mjs`,
`ancla.d.cts` and `ancla.d.mts` next to it.

## Before you use it

Reading the source text is the last resort. A test that runs the code and
looks at what it does is better than one that checks the code *says* the right
thing, and other testing guides warn against source-text tests for good
reason. `ancla` is for what has no behaviour to run in a test: configuration,
templates, legal or licence text, and structural rules ("this module does not
import that one"). When you do cut text, cut it with something that fails if
the anchor is gone.

## API

| Function | Returns |
|---|---|
| `desde(text, anchor, options?)` | from the anchor (included) to the end |
| `entre(text, open, close, options?)` | from `open` (included) to the first `close` that starts **after the whole `open`** (excluded) |
| `cerca(text, anchor, radius, options?)` | `radius` UTF-16 code units on each side; always contains the whole anchor, never wraps around a negative index, and never cuts a surrogate pair (an emoji) in half: the window is widened by one unit instead |

`options` is either a string (who is checking; it appears in the error) or a
plain object `{ quien?: string, unica?: boolean }` with own keys only. With
`unica: true` the anchor (the opening one, for `entre`) must appear exactly
once; overlapping occurrences count.

## Errors, each with its own cause

| When | Thrown | `code` | Extra fields |
|---|---|---|---|
| the anchor is not in the text | `AnclaPerdida` | `ANCLA_PERDIDA` | `ancla`, `papel` (`"ancla"`, `"abre"`, `"cierra"`), `quien` |
| `unica` and the anchor repeats | `AnclaRepetida` | `ANCLA_REPETIDA` | `ancla`, `papel` (`"ancla"`, `"abre"`), `posiciones` `[first, second]`, `quien` |
| a bad argument: text that is not a string, empty anchor, radius that is not a safe integer ≥ 0, options that are not a string or a plain object, unknown option key, option of the wrong type | `TypeError` | `ANCLA_ARGUMENTO` | — |

A bad argument is a mistake in the check, not a missing anchor, so it does not
throw `AnclaPerdida`. An unknown key such as `{ unique: true }` is rejected
instead of being ignored, and so is a `Map` or an object that inherits its
options: half-reading them would be a green that measures nothing.

Every `AnclaPerdida` message starts with the fixed, searchable prefix
`AnclaPerdida: anchor not found`. When the text itself is empty, the message
says so: an empty text usually means it was never read, which is a different
fault from a renamed anchor. The anchor is shown between «» on one line, with
control characters, the backslash and the «» escaped, and cut at 80 characters.

## What it does not do

- **No optional anchors.** "If it is there" is a different check; write it
  explicitly: `if (text.includes(anchor)) { … desde(text, anchor) … }`.
- It does not help with `split(anchor)[1]`, regular expressions, or
  `replace()` with an anchor that is gone (a sabotage that silently does not
  apply). For the last one, see `romper()` in
  [`test/_romper.mjs`](test/_romper.mjs): about thirty lines, not part of the
  published package, meant to be copied.

## How it is tested

One table of cases runs through both module doors. Then every case is seen
falling: 56 sabotages, each applied to a copy of the source, must make
**exactly** the cases they declare fall, each for its own cause, after a
control run on the untouched copy. Every check in the source has its own
sabotage wherever it can be broken alone, so a case that covers three call
sites cannot hide that only one of them is guarded. A census fails if any case
has never been seen falling. The exports map is exercised by the package name
through both conditions, and seen red with the two conditions swapped. The
types are checked through both doors with a `// @ts-expect-error` that goes red
if they degenerate to `any`, and with a type-level check that goes red if the
error classes become constructible.

What is not measured: that every *possible* change to the source makes some
case fall. Targeted sabotage is precision, not coverage.

Why all this: see the essay in this repository,
[*The two colours*](../../ensayo/two-colours.en.md).

## License

MIT
