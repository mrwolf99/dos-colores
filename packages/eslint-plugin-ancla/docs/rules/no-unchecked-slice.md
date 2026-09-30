<!-- SPDX-License-Identifier: MIT -->
# ancla/no-unchecked-slice

Disallow using a position computed by `indexOf()` and friends without checking
for `-1`, when cutting text or an array.

## Why

When the anchor is missing, `indexOf()` returns `-1` and the call still runs:

| Expression | With the anchor missing |
|---|---|
| `t.slice(t.indexOf(a))` | the last character |
| `t.substring(t.indexOf(a))` | the whole text |
| `t.slice(t.indexOf(a) - 500, t.indexOf(a) + 500)` | the whole text up to 499 characters; the text without its last characters at 500–501; a piece from the middle, without its start or its end, from 502 to 999; nothing from 1,000 |
| `t.slice(t.indexOf(a) + a.length)` | an arbitrary piece |
| `t.slice(Math.max(0, t.indexOf(a)))` | the whole text |
| `xs.splice(xs.indexOf(x), 1)` | removes the **last** element |
| `xs.at(xs.indexOf(x))` | the last element |

A check that then asserts that the piece does *not* contain something passes,
green, without having measured anything.

## What it reports

A call to `slice`, `substring`, `substr`, `splice`, `toSpliced`, `subarray` or
`at` (also written `t["slice"]` or ``t[`slice`]``) where any argument contains,
directly and without going through a function, a class or another of these
calls, a call to `indexOf`, `lastIndexOf`, `search`, `findIndex` or
`findLastIndex`.

```js
t.slice(t.indexOf(a));                               // reported
t.slice(t.indexOf(a) + a.length);                    // reported
t.slice(t.indexOf(a) - 500, t.indexOf(a) + 500);     // reported
t.slice(Math.max(0, t.indexOf(a)));                  // reported
t.substring(t.indexOf(a), t.indexOf(b));             // reported
t.slice(0, t.indexOf(end));                          // reported
xs.slice(xs.findIndex((x) => x > 3));                // reported
xs.splice(xs.indexOf(x), 1);                         // reported
xs.at(xs.indexOf(x));                                // reported
t.slice(u.slice(u.indexOf(a)).length);               // reported once: the inner call
```

The message names the method and the finder (the left-most one, when there
are several), so the red says its cause.

## Declared exemption

`x.lastIndexOf(sep) + 1` as a whole argument of `slice`, `substring` or
`substr` is **not** reported:

```js
const base = p.slice(p.lastIndexOf("/") + 1); const dir = p.slice(0, p.lastIndexOf("/") + 1);
```

When the separator is missing this gives `0`, the whole text (or nothing, as
the end), which is what the idiom "after the last separator" wants. The price:
if you use `lastIndexOf(anchor) + 1` to find an anchor in a check, this rule
will not tell you. `+ 2`, other finders and the array methods are still
reported.

## What it does NOT see (yet)

These are declared, and each one is a case in the test suite that asserts it
is **not** reported today. When one is implemented, its case moves to the
invalid list.

- **The index through a variable** (next step, with the scope manager). This
  is the most common form in practice:

  ```js
  const i = t.indexOf(a); const r = t.slice(i);
  ```

- `charAt()`, which gives `""` at `-1`:

  ```js
  const c = t.charAt(t.indexOf(a));
  ```

- The method called through `call()` or `apply()`:

  ```js
  const r = String.prototype.slice.call(t, t.indexOf(a));
  ```

- **The index through a function or a class** (a limit, not a gap: the rule
  does not look inside them):

  ```js
  const r = t.slice(calcular(() => t.indexOf(a)));
  ```

  ```js
  const r = t.slice(calcular(function () { return t.indexOf(a); }));
  ```

  ```js
  const r = t.slice(calcular(class { static i = t.indexOf(a); }));
  ```

Not reported and without a test case, because the rule has no code that looks
at them at all:

- Indexing with brackets, `t[t.indexOf(a)]`, which gives `undefined` at `-1`.
- `split(a)[1]`, which is `undefined` when the anchor is missing.
- `replace()` with an anchor that is gone: the text comes back unchanged and
  without an error (a sabotage that silently does not apply).

## False positives

A guarded cut such as `t.includes(a) ? t.slice(t.indexOf(a)) : ""` **is**
reported: the rule does not follow control flow. Use `desde()` from
`@mrwolf99/ancla` there, or silence the line and write why next to it:

```js
// eslint-disable-next-line ancla/no-unchecked-slice -- the anchor is the file header, checked above
```

ESLint already warns about a disable comment that no longer silences anything
(`linterOptions.reportUnusedDisableDirectives` defaults to `"warn"`). Raise it
to `"error"` and an exception that is no longer needed turns the lint red, so
dead exceptions do not pile up. It does not stop anyone from adding a new
one: that is for the review.
