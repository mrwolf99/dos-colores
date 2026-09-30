<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# dos-colores

**ES** — Una comprobación no vale hasta que se la ha visto de los dos colores:
verde contra lo bueno de verdad, rojo contra lo roto, y el rojo cayendo por su
causa y diciéndola. Este repositorio tiene el ensayo que lo explica, una
librería y una regla de lint para el caso más barato de cometer —cortar texto
con `slice(indexOf(...))`—, y ejemplos que se pueden ejecutar.

**EN** — A check is worth nothing until it has been seen in both colours: green
against what is really good, red against what is broken, and the red failing
for its own reason and saying it. This repository holds the essay, a library
and a lint rule for the cheapest way to get it wrong — cutting text with
`slice(indexOf(...))` — and runnable examples.

| Where | What |
|---|---|
| [`ensayo/los-dos-colores.md`](ensayo/los-dos-colores.md) | el ensayo · the essay (Spanish) |
| [`ensayo/two-colors.en.md`](ensayo/two-colors.en.md) | resumen en inglés · English summary |
| [`packages/ancla`](packages/ancla/README.md) | `@mrwolf99/ancla`: `desde`, `entre`, `cerca` — cut by anchors that must be there |
| [`packages/eslint-plugin-ancla`](packages/eslint-plugin-ancla/README.md) | `ancla/no-unchecked-slice` |
| [`ejemplos/`](ejemplos/) | tres ejemplos sobre una tienda de juguete · three examples over a toy shop |
| [`scripts/limpieza.mjs`](scripts/limpieza.mjs) | busca lo que no debe publicarse · looks for what must not be published |

```sh
npm test                               # raíz y los dos paquetes · root and both packages
node ejemplos/01-ancla-perdida.mjs     # el ancla perdida · the lost anchor
node ejemplos/02-sabotaje-en-copia.mjs # sabotear en copia · sabotage in a copy
node ejemplos/03-tres-estados.mjs      # bien, mal, NO MIRADO · good, bad, not looked at
```

Nada que instalar para la raíz ni para `ancla`: Node 18 o posterior. El plugin
necesita ESLint 9 o posterior; sin él, sus pruebas dicen `PARCIAL:` en vez de
fingir un verde. Con `DOS_COLORES_SIN_SALTOS=1`, como en CI, un `PARCIAL` es
rojo.

Nothing to install for the root or `ancla`: Node 18 or later. The plugin needs
ESLint 9 or later; without it its tests print `PARCIAL:` instead of faking a
green. With `DOS_COLORES_SIN_SALTOS=1`, as in CI, a `PARCIAL` is red.

## Licencias · Licences

- Código · code: [MIT](LICENSE).
- El ensayo y la prosa de este README · the essay and this README's prose:
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
