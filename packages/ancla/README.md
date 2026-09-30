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

## API

| Function | Returns |
|---|---|
| `desde(text, anchor, options?)` | from the anchor (included) to the end |
| `entre(text, open, close, options?)` | from `open` (included) to the first `close` **after it** (excluded) |
| `cerca(text, anchor, radius, options?)` | `radius` characters on each side; always contains the whole anchor, never wraps around a negative index |

`options` is either a string (who is checking; it appears in the error) or
`{ quien?: string, unica?: boolean }`. With `unica: true` the anchor (the
opening one, for `entre`) must appear exactly once; overlapping occurrences
count.

## Errors, each with its own cause

| When | Thrown | `code` | Extra fields |
|---|---|---|---|
| the anchor is not in the text | `AnclaPerdida` | `ANCLA_PERDIDA` | `ancla`, `papel` (`"ancla"`, `"abre"`, `"cierra"`), `quien` |
| `unica` and the anchor repeats | `AnclaRepetida` | `ANCLA_REPETIDA` | `ancla`, `posiciones` `[first, second]`, `quien` |
| a bad argument: text that is not a string, empty anchor, radius that is not a safe integer ≥ 0, unknown option key | `TypeError` | `ANCLA_ARGUMENTO` | — |

A bad argument is a mistake in the check, not a missing anchor, so it does not
throw `AnclaPerdida`. An unknown key such as `{ unique: true }` is rejected
instead of being ignored: silently ignoring it would be a green that measures
nothing.

Every `AnclaPerdida` message starts with the fixed, searchable prefix
`AnclaPerdida: anchor not found`.

## What it does not do

- **No optional anchors.** "If it is there" is a different check; write it
  explicitly: `if (text.includes(anchor)) { … desde(text, anchor) … }`.
- It does not help with `split(anchor)[1]`, regular expressions, or
  `replace()` with an anchor that is gone (a sabotage that silently does not
  apply). For the last one, see the `romper()` helper in this repository.

## How it is tested

One table of cases runs through both module doors. Then every case is seen
falling: 22 sabotages, each applied to a copy of the source, must make
**exactly** the cases they declare fall, each for its own cause, after a
control run on the untouched copy. A census fails if any case has never been
seen falling. The types are checked through both doors with a
`// @ts-expect-error` that would go red if they degenerated to `any`.

Why all this: see the essay in this repository,
[*The two colours*](../../ensayo/two-colors.en.md).

## License

MIT
