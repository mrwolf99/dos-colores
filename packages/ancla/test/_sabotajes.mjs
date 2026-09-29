// SPDX-License-Identifier: MIT
// What each sabotage breaks, and EXACTLY which cases must fall, each for its
// own cause. S01–S15 are the planned ones; S16–S22 were added while writing
// the cases, so that every case has been seen falling by at least one.

const R1 = "desde: ancla ausente lanza AnclaPerdida";
const R2 = "entre: cierre antes de la apertura lanza, no da un trozo vacío";
const R3 = "entre: cierre ausente → papel:cierra";
const R3B = "entre: apertura ausente → papel:abre";
const R4 = "cerca: radio inválido → ANCLA_ARGUMENTO (\"abc\", -1, 1.5, NaN, Infinity)";
const R5 = "unica: repetida → AnclaRepetida con las dos posiciones";
const R5B = "unica: una repetición solapada también cuenta";
const R6 = "ancla \"\" → ANCLA_ARGUMENTO";
const R7 = "texto undefined → ANCLA_ARGUMENTO, no AnclaPerdida";
const R8 = "el error lleva code y name";
const R9 = "el mensaje nombra a quién y el ancla";
const R10 = "opción desconocida {unique:true} → ANCLA_ARGUMENTO";
const R11 = "opción con tipo equivocado {unica:\"sí\"} → ANCLA_ARGUMENTO";
const V1 = "desde: devuelve desde el ancla, con el ancla dentro";
const V2 = "entre: el trozo real de buscar() empieza en su apertura y contiene su throw";
const V3 = "entre no incluye el cierre";
const V4 = "cerca: la ventana contiene el ancla entera aunque el radio sea menor";
const V5 = "cerca: ancla al principio no sale por el índice negativo";
const V7 = "desde con unica: un ancla que aparece una sola vez pasa";
const I1 = "identidad ESM↔CJS: las dos puertas dan los mismos objetos";
const I2 = "la fachada ESM no tiene exportación por defecto (por eso los .d.cts y .d.mts pueden ser idénticos)";

const DESDE = 'return t.slice(buscar(t, ancla, "ancla", o));';

export const SABOTAJES = [
  { id: "S01", que: "desde sin comprobar el −1", fichero: "ancla.cjs", de: DESDE, a: "return t.slice(t.indexOf(ancla));", caen: { [R1]: /^no lanzó/ } },
  {
    id: "S02",
    que: "desde devuelve \"\" en vez de lanzar (el «arreglo» que silencia)",
    fichero: "ancla.cjs",
    de: DESDE,
    a: 'const i = t.indexOf(ancla);\n  return i === -1 ? "" : t.slice(i);',
    caen: { [R1]: /^no lanzó: devolvió ""/ },
  },
  {
    id: "S03",
    que: "entre busca el cierre desde 0",
    fichero: "ancla.cjs",
    de: "const j = t.indexOf(cierra, i + abre.length);",
    a: "const j = t.indexOf(cierra);",
    caen: { [R2]: /^no lanzó: devolvió ""/ },
  },
  {
    id: "S04",
    que: "entre sin comprobar el cierre",
    fichero: "ancla.cjs",
    de: 'if (j === -1) throw new AnclaPerdida(cierra, "cierra", o.quien);',
    a: "void 0; // closing check removed",
    caen: { [R2]: /^no lanzó/, [R3]: /^no lanzó/ },
  },
  { id: "S05", que: "cerca sin max(0, …)", fichero: "ancla.cjs", de: "t.slice(Math.max(0, i - radio), ", a: "t.slice(i - radio, ", caen: { [V5]: /no empieza en el principio del texto/ } },
  { id: "S06", que: "cerca convierte el radio inválido en 0", fichero: "ancla.cjs", de: "comprobarRadio(radio, o);", a: "radio = parseInt(radio) || 0;", caen: { [R4]: /^no lanzó/ } },
  {
    id: "S07",
    que: "la ventana acaba en i+r",
    fichero: "ancla.cjs",
    de: "Math.min(t.length, i + ancla.length + radio)",
    a: "Math.min(t.length, i + radio)",
    caen: { [V4]: /con radio 0 la ventana no es el ancla/ },
  },
  { id: "S08", que: "unica ignorada", fichero: "ancla.cjs", de: "if (o.unica) {", a: "if (false) {", caen: { [R5]: /^no lanzó/, [R5B]: /^no lanzó/, [R8]: /^no lanzó/ } },
  {
    id: "S09",
    que: "ancla vacía admitida",
    fichero: "ancla.cjs",
    de: 'if (typeof ancla !== "string" || ancla === "") {',
    a: 'if (typeof ancla !== "string") {',
    caen: { [R6]: /^no lanzó/ },
  },
  {
    id: "S10",
    que: "texto que no es cadena convertido a \"\"",
    fichero: "ancla.cjs",
    de: 'if (typeof texto !== "string") throw argumento(o.quien, "the text must be a string, got " + describir(texto));',
    a: 'if (typeof texto !== "string") return "";',
    caen: { [R7]: /^lanzó otra cosa: .*name="AnclaPerdida"/ },
  },
  { id: "S11", que: "code cambiado", fichero: "ancla.cjs", de: 'this.code = "ANCLA_PERDIDA";', a: 'this.code = "ANCLA_NO_ENCONTRADA";', caen: { [R8]: /code="ANCLA_NO_ENCONTRADA"/ } },
  {
    id: "S12",
    que: "el mensaje pierde quien",
    fichero: "ancla.cjs",
    de: 'return quien === undefined ? "" : " in " + JSON.stringify(quien);',
    a: 'return "";',
    caen: { [R9]: /el mensaje no dice quién/ },
  },
  {
    id: "S13",
    que: "desde lanza siempre (el lado verde)",
    fichero: "ancla.cjs",
    de: DESDE,
    a: 'throw new AnclaPerdida(ancla, "ancla", o.quien);',
    caen: { [V1]: /^AnclaPerdida: anchor not found/, [V7]: /^AnclaPerdida: anchor not found/ },
  },
  { id: "S14", que: "entre incluye el cierre", fichero: "ancla.cjs", de: "return t.slice(i, j);", a: "return t.slice(i, j + cierra.length);", caen: { [V3]: /el trozo incluye el cierre/ } },
  {
    id: "S15",
    que: "la fachada ESM deja de reexportar AnclaPerdida",
    fichero: "ancla.mjs",
    de: "export const { desde, entre, cerca, AnclaPerdida, AnclaRepetida } = m;",
    a: "export const { desde, entre, cerca, AnclaRepetida } = m;",
    caen: { [I1]: /no reexporta lo mismo que el CJS: AnclaPerdida$/ },
  },
  {
    id: "S16",
    que: "las claves de opciones desconocidas se ignoran",
    fichero: "ancla.cjs",
    de: 'if (!CLAVES.has(clave)) throw argumento(undefined, "unknown option " + JSON.stringify(clave) + " (known: quien, unica)");',
    a: "void clave;",
    caen: { [R10]: /^no lanzó/ },
  },
  {
    id: "S17",
    que: "el tipo de unica no se comprueba",
    fichero: "ancla.cjs",
    de: 'if (unica !== undefined && typeof unica !== "boolean") throw argumento(quien, "options.unica must be a boolean, got " + describir(unica));',
    a: "void unica;",
    caen: { [R11]: /^no lanzó/ },
  },
  {
    id: "S18",
    que: "unica busca la segunda desde i (se encuentra a sí misma)",
    fichero: "ancla.cjs",
    de: "const j = t.indexOf(ancla, i + 1);",
    a: "const j = t.indexOf(ancla, i);",
    caen: { [V7]: /^AnclaRepetida: anchor appears more than once/, [R5]: /^posiciones .* y eran/, [R5B]: /^posiciones \[1,1\] y eran \[1,2\]/ },
  },
  {
    id: "S19",
    que: "unica busca la segunda desde i+len (no ve las solapadas)",
    fichero: "ancla.cjs",
    de: "const j = t.indexOf(ancla, i + 1);",
    a: "const j = t.indexOf(ancla, i + ancla.length);",
    caen: { [R5B]: /^no lanzó/ },
  },
  {
    id: "S20",
    que: "entre dice papel ancla para la apertura",
    fichero: "ancla.cjs",
    de: 'const i = buscar(t, abre, "abre", o);',
    a: 'const i = buscar(t, abre, "ancla", o);',
    caen: { [R3B]: /papel="ancla" \(esperaba "abre"\)/ },
  },
  {
    id: "S21",
    que: "entre empieza después de la apertura",
    fichero: "ancla.cjs",
    de: "return t.slice(i, j);",
    a: "return t.slice(i + abre.length, j);",
    caen: { [V2]: /no empieza por la apertura/, [V3]: /no empieza por la apertura/ },
  },
  {
    id: "S22",
    que: "la fachada ESM añade una exportación por defecto",
    fichero: "ancla.mjs",
    de: "export const { desde, entre, cerca, AnclaPerdida, AnclaRepetida } = m;",
    a: "export const { desde, entre, cerca, AnclaPerdida, AnclaRepetida } = m;\nexport default m;",
    caen: { [I2]: /exporta un default que los tipos no declaran/ },
  },
];
