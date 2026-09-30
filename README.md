<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# dos-colores

**ES** — Una comprobación solo merece confianza cuando se la ha visto de los
dos colores: en verde sobre código que está bien de verdad, en rojo sobre
código roto, y en ese rojo cayendo por el fallo que dice vigilar y nombrándolo.
Este repositorio tiene el ensayo que lo explica, una librería y una regla de
lint para el caso más barato de cometer —cortar texto con
`slice(indexOf(...))`—, y ejemplos que se pueden ejecutar.

**EN** — A check only deserves trust once it has been seen in both colours:
green on code that is really good, red on code that is broken, and in that red
failing for the fault it claims to watch and naming it. This repository holds
the essay, a library and a lint rule for the cheapest way to get it wrong —
cutting text with `slice(indexOf(...))` — and runnable examples.

| Where | What |
|---|---|
| [`ensayo/los-dos-colores.md`](ensayo/los-dos-colores.md) | el ensayo · the essay (Spanish) |
| [`ensayo/two-colours.en.md`](ensayo/two-colours.en.md) | resumen en inglés · English summary |
| [`packages/ancla`](packages/ancla/README.md) | `@mrwolf99/ancla`: `desde`, `entre`, `cerca` — cut by anchors that must be there |
| [`packages/eslint-plugin-ancla`](packages/eslint-plugin-ancla/README.md) | `ancla/no-unchecked-slice` |
| [`ejemplos/`](ejemplos/) | tres ejemplos sobre una tienda de juguete · three examples over a toy shop |
| [`scripts/limpieza.mjs`](scripts/limpieza.mjs) | busca lo que no debe publicarse · looks for what must not be published |

```sh
npm test                               # raíz y los dos paquetes · root and both packages
node ejemplos/01-ancla-perdida.mjs     # el ancla perdida · the lost anchor
node ejemplos/02-sabotaje-en-copia.mjs # sabotear en copia · sabotage in a copy
node ejemplos/03-tres-estados.mjs      # bien, mal, NO MIRADO · good, bad, not looked at (sale con 1 · exits 1)
```

Nada que instalar para la raíz ni para `ancla`: Node 18 o posterior. El plugin
necesita ESLint 9 o posterior; sin él, sus pruebas dicen `PARCIAL:` en vez de
fingir un verde. Con `DOS_COLORES_SIN_SALTOS=1`, como en CI, un `PARCIAL` es
rojo, salvo una excepción escrita con su motivo junto a ella: la lista privada
de la limpieza, que no viaja con el repositorio.

Ninguno de los dos paquetes está todavía en npm. La 0.1.0 está preparada, y
[`PUBLICAR.md`](PUBLICAR.md) cuenta cómo sale. Cuando esté, se instalan con
`npm install --save-dev @mrwolf99/ancla` y
`npm install --save-dev eslint eslint-plugin-ancla`; hasta entonces, se copian
los ficheros.

Nothing to install for the root or `ancla`: Node 18 or later. The plugin needs
ESLint 9 or later; without it its tests print `PARCIAL:` instead of faking a
green. With `DOS_COLORES_SIN_SALTOS=1`, as in CI, a `PARCIAL` is red, except for
one exemption written down next to it with its reason: the private list of the
cleanup, which never travels with the repository.

Neither package is on npm yet. 0.1.0 is ready, and
[`PUBLICAR.md`](PUBLICAR.md) (in Spanish) tells how it goes out. Once it is
there, install them with `npm install --save-dev @mrwolf99/ancla` and
`npm install --save-dev eslint eslint-plugin-ancla`; until then, copy the
files.

## Licencias · Licences

- Código · code: [MIT](LICENSE).
- El ensayo y la prosa de este README · the essay and this README's prose:
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
