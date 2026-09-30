<!-- SPDX-License-Identifier: MIT -->
# ancla/no-unchecked-slice

Disallow cutting text (or an array) at a position computed by `indexOf()` and
friends without checking for `-1`.

## Why

When the anchor is missing, `indexOf()` returns `-1` and the cut is still made:

| Expression | With the anchor missing |
|---|---|
| `t.slice(t.indexOf(a))` | the last character |
| `t.substring(t.indexOf(a))` | the whole text |
| `t.slice(t.indexOf(a) - 900, t.indexOf(a) + 900)` | the whole text if it is short, nothing if it is long |
| `t.slice(t.indexOf(a) + a.length)` | an arbitrary piece |
| `t.slice(Math.max(0, t.indexOf(a)))` | the whole text |

A check that then asserts that the piece does *not* contain something passes,
green, without having measured anything.

## What it reports

A call to `slice`, `substring` or `substr` (also written `t["slice"]` or
``t[`slice`]``) where any argument contains, directly and without going
through a function, a call to `indexOf`, `lastIndexOf`, `search`,
`findIndex` or `findLastIndex`.

```js
t.slice(t.indexOf(a));                               // reported
t.slice(t.indexOf(a) + a.length);                    // reported
t.slice(t.indexOf(a) - 900, t.indexOf(a) + 900);     // reported
t.slice(Math.max(0, t.indexOf(a)));                  // reported
t.substring(t.indexOf(a), t.indexOf(b));             // reported
t.slice(0, t.indexOf(end));                          // reported
xs.slice(xs.findIndex((x) => x > 3));                // reported
```

The message names the method and the finder, so the red says its cause.

## What it does NOT see (yet)

These are declared, and each one is a case in the test suite that asserts it
is **not** reported today. When one is implemented, its case moves to the
invalid list.

- **The index through a variable** (next step, with the scope manager):

  ```js
  const i = t.indexOf(a); const r = t.slice(i);
  ```

- **The index through a function**:

  ```js
  const r = t.slice(calcular(() => t.indexOf(a)));
  ```

- `split(a)[1]`, which is `undefined` when the anchor is missing.
- `replace()` with an anchor that is gone: the text comes back unchanged and
  without an error (a sabotage that silently does not apply).
- A guarded cut such as `t.includes(a) ? t.slice(t.indexOf(a)) : ""` **is**
  reported: the rule does not follow control flow. Use `desde()` from
  `@mrwolf99/ancla` there, or silence it with a reason (below).

## False positives

Silence the line and write why next to it:

```js
// eslint-disable-next-line ancla/no-unchecked-slice -- the anchor is the file header, checked above
```

Turn on `linterOptions.reportUnusedDisableDirectives` so that an exception
that is no longer needed shows up: the list of exceptions can then only shrink.
