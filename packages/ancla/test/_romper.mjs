// SPDX-License-Identifier: MIT
// The sabotage helper, independent of the library it is used to test (so the
// check is not circular). It refuses instead of silently doing nothing:
//
//   - `de` must appear exactly once (counting overlaps);
//   - `a` must differ from `de`.
//
// The replacement is done by position, not with String.prototype.replace,
// whose `$&`, `$1`… patterns in `a` could leave the text as it was.

function recorte(s) {
  const e = s.replace(/\n/g, "\\n");
  return e.length > 60 ? e.slice(0, 60) + "…" : e;
}

export function contar(texto, de) {
  let n = 0;
  for (let i = texto.indexOf(de); i !== -1; i = texto.indexOf(de, i + 1)) n++;
  return n;
}

export function romper(texto, de, a, id = "sin nombre") {
  if (typeof texto !== "string") throw new TypeError(`el sabotaje «${id}» no tiene texto que romper`);
  if (typeof de !== "string" || de === "") throw new TypeError(`el sabotaje «${id}» no dice qué romper (de vacío)`);
  if (typeof a !== "string") throw new TypeError(`el sabotaje «${id}» no dice por qué cambiarlo (a no es texto)`);
  if (a === de) throw new Error(`el sabotaje «${id}» no cambia nada: a es igual que de`);
  const n = contar(texto, de);
  if (n === 0) throw new Error(`el sabotaje «${id}» no encuentra qué romper: «${recorte(de)}» no está en el texto`);
  if (n > 1) throw new Error(`el sabotaje «${id}» es ambiguo: «${recorte(de)}» aparece ${n} veces`);
  const i = texto.indexOf(de);
  return texto.slice(0, i) + a + texto.slice(i + de.length);
}
