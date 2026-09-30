// SPDX-License-Identifier: MIT
// What each sabotage breaks, and EXACTLY which cases must fall, each for its
// own cause. Every check in the source has its own sabotage where it can be
// broken alone (the anchor of desde, of entre's opening, of cerca…), so that a
// case that checks several call sites cannot hide that only one of them is
// guarded. The census in censo.test.mjs fails if a case has none.

const V1 = "desde: devuelve desde el ancla, con el ancla dentro";
const V7 = "desde con unica: un ancla que aparece una sola vez pasa";
const V2 = "entre: el trozo real de calcularEnvio() empieza en su apertura y contiene su umbral";
const V3 = "entre no incluye el cierre";
const V4 = "cerca: la ventana contiene el ancla entera aunque el radio sea menor";
const V5 = "cerca: ancla al principio no sale por el índice negativo";
const V9 = "cerca: la ventana no parte un carácter en dos (un emoji en el borde)";
const V8 = "opciones en texto: quien no activa unica";
const VNULL = "opciones: un objeto sin prototipo también vale";
const I1 = "identidad ESM↔CJS: las dos puertas dan los mismos objetos";
const I2 = "la fachada ESM no tiene exportación por defecto (por eso los .d.cts y .d.mts pueden ser idénticos)";
const R1 = "desde: ancla ausente lanza AnclaPerdida con ancla, papel y quien";
const RVACIO = "texto vacío: AnclaPerdida que dice que el texto está vacío";
const R2 = "entre: cierre antes de la apertura lanza, no da un trozo vacío";
const RDENTRO = "entre: un cierre que solo aparece dentro de la apertura no cuenta";
const R3 = "entre: cierre ausente → papel:cierra";
const R3B = "entre: apertura ausente → papel:abre";
const R4 = "cerca: radio inválido → ANCLA_ARGUMENTO (\"abc\", -1, 1.5, NaN, Infinity, 2**53)";
const R5 = "unica: repetida → AnclaRepetida con las dos posiciones";
const R5B = "unica: una repetición solapada también cuenta";
const R5D = "desde con unica: repetida → AnclaRepetida";
const R5E = "entre con unica: apertura repetida → AnclaRepetida que dice (opening)";
const R6D = "desde: ancla \"\" → ANCLA_ARGUMENTO";
const R6A = "entre: apertura \"\" → ANCLA_ARGUMENTO";
const R6C = "entre: cierre \"\" → ANCLA_ARGUMENTO";
const R6K = "cerca: ancla \"\" → ANCLA_ARGUMENTO";
const R7D = "desde: texto undefined → ANCLA_ARGUMENTO que dice qué llegó, no AnclaPerdida";
const R7E = "entre: texto que no es cadena → ANCLA_ARGUMENTO";
const R7K = "cerca: texto que no es cadena → ANCLA_ARGUMENTO";
const R8 = "el error lleva code y name";
const R9 = "el mensaje nombra a quién y el ancla";
const R9B = "el ancla se muestra en una sola línea, escapada y recortada";
const R10 = "opción desconocida {unique:true} → ANCLA_ARGUMENTO";
const R11 = "opción con tipo equivocado {unica:\"sí\"} → ANCLA_ARGUMENTO";
const R12 = "opción quien que no es texto {quien:42} → ANCLA_ARGUMENTO";
const R13 = "opciones que no son un objeto simple (Map, Date, array, número, heredadas) → ANCLA_ARGUMENTO";

const DESDE = 'return t.slice(buscar(t, ancla, "ancla", o));';
const CIERRE = "const j = t.indexOf(cierra, i + abre.length);";
const SEGUNDA = "const j = t.indexOf(ancla, i + 1);";
const TROZO = "return t.slice(i, j);";
const FACHADA = "export const { desde, entre, cerca, AnclaPerdida, AnclaRepetida } = m;";

export const SABOTAJES = [
  // ---- desde
  {
    id: "S01",
    que: "desde sin comprobar el −1",
    fichero: "ancla.cjs",
    de: DESDE,
    a: "return t.slice(t.indexOf(ancla));",
    caen: { [R1]: /^no lanzó/, [RVACIO]: /^no lanzó/, [R5D]: /^no lanzó/, [R9B]: /^no lanzó/ },
  },
  {
    id: "S02",
    que: "desde devuelve \"\" en vez de lanzar (el «arreglo» que silencia)",
    fichero: "ancla.cjs",
    de: DESDE,
    a: 'const i = t.indexOf(ancla);\n  return i === -1 ? "" : t.slice(i);',
    caen: { [R1]: /^no lanzó: devolvió ""/, [RVACIO]: /^no lanzó: devolvió ""/, [R5D]: /^no lanzó: devolvió "importeLinea/, [R9B]: /^no lanzó: devolvió ""/ },
  },
  {
    id: "S03",
    que: "desde lanza siempre (el lado verde)",
    fichero: "ancla.cjs",
    de: DESDE,
    a: 'throw new AnclaPerdida(ancla, "ancla", o.quien, false);',
    caen: {
      [V1]: /^AnclaPerdida: anchor not found/,
      [V7]: /^AnclaPerdida: anchor not found/,
      [VNULL]: /^AnclaPerdida: anchor not found/,
      [RVACIO]: /^el mensaje no dice que el texto está vacío/,
      [R5D]: /^lanzó otra cosa: name="AnclaPerdida"/,
    },
  },
  {
    id: "S04",
    que: "desde no valida el ancla",
    fichero: "ancla.cjs",
    de: 'const t = comoTexto(texto, o);\n  comprobarAncla(ancla, "ancla", o);\n  return t.slice(',
    a: "const t = comoTexto(texto, o);\n  return t.slice(",
    // Without the check, 42 reaches the search and then the message, which cannot
    // show a number: a native TypeError without code, not the named one.
    caen: { [R6D]: /^no lanzó/, [R8]: /^argumento: lanzó otra cosa: code=undefined .*· s is not iterable/ },
  },
  {
    id: "S54",
    que: "desde ignora unica",
    fichero: "ancla.cjs",
    de: DESDE,
    a: 'return t.slice(buscar(t, ancla, "ancla", { quien: o.quien, unica: false }));',
    caen: { [R5D]: /^no lanzó/ },
  },
  {
    id: "S56",
    que: "desde devuelve \"\" cuando el texto está vacío",
    fichero: "ancla.cjs",
    de: DESDE,
    a: 'if (t === "") return "";\n  return t.slice(buscar(t, ancla, "ancla", o));',
    caen: { [RVACIO]: /^no lanzó: devolvió ""/ },
  },
  {
    id: "S05",
    que: "desde no valida el texto",
    fichero: "ancla.cjs",
    de: 'const t = comoTexto(texto, o);\n  comprobarAncla(ancla, "ancla", o);\n  return t.slice(',
    a: 'const t = texto;\n  comprobarAncla(ancla, "ancla", o);\n  return t.slice(',
    caen: { [R7D]: /^lanzó otra cosa: code=undefined/ },
  },
  // ---- entre
  {
    id: "S06",
    que: "entre busca el cierre desde 0",
    fichero: "ancla.cjs",
    de: CIERRE,
    a: "const j = t.indexOf(cierra);",
    caen: { [R2]: /^no lanzó: devolvió ""/, [RDENTRO]: /^no lanzó: devolvió "export "/ },
  },
  {
    id: "S07",
    que: "entre busca el cierre desde i+1 (acepta un cierre dentro de la apertura)",
    fichero: "ancla.cjs",
    de: CIERRE,
    a: "const j = t.indexOf(cierra, i + 1);",
    caen: { [RDENTRO]: /^no lanzó: devolvió "export "/ },
  },
  {
    id: "S08",
    que: "entre sin comprobar el cierre",
    fichero: "ancla.cjs",
    de: 'if (j === -1) throw new AnclaPerdida(cierra, "cierra", o.quien, false);',
    a: "void 0; // closing check removed",
    caen: { [R2]: /^no lanzó/, [R3]: /^no lanzó/, [RDENTRO]: /^no lanzó/ },
  },
  { id: "S09", que: "entre incluye el cierre", fichero: "ancla.cjs", de: TROZO, a: "return t.slice(i, j + cierra.length);", caen: { [V3]: /^el trozo incluye el cierre/ } },
  {
    id: "S10",
    que: "entre empieza después de la apertura",
    fichero: "ancla.cjs",
    de: TROZO,
    a: "return t.slice(i + abre.length, j);",
    caen: { [V2]: /^no empieza por la apertura/, [V3]: /^no empieza por la apertura/ },
  },
  {
    id: "S11",
    que: "entre dice papel ancla para la apertura",
    fichero: "ancla.cjs",
    de: 'const i = buscar(t, abre, "abre", o);',
    a: 'const i = buscar(t, abre, "ancla", o);',
    caen: { [R3B]: /papel="ancla" \(esperaba "abre"\)/, [R5E]: /papel="ancla" \(esperaba "abre"\)/ },
  },
  {
    id: "S12",
    que: "entre ignora unica en la apertura",
    fichero: "ancla.cjs",
    de: 'const i = buscar(t, abre, "abre", o);',
    a: 'const i = buscar(t, abre, "abre", { quien: o.quien, unica: false });',
    caen: { [R5E]: /^no lanzó/ },
  },
  { id: "S13", que: "entre no valida la apertura", fichero: "ancla.cjs", de: 'comprobarAncla(abre, "abre", o);', a: "void 0;", caen: { [R6A]: /^no lanzó/ } },
  { id: "S14", que: "entre no valida el cierre", fichero: "ancla.cjs", de: 'comprobarAncla(cierra, "cierra", o);', a: "void 0;", caen: { [R6C]: /^no lanzó/ } },
  {
    id: "S15",
    que: "entre no valida el texto",
    fichero: "ancla.cjs",
    de: 'const t = comoTexto(texto, o);\n  comprobarAncla(abre, "abre", o);',
    a: 'const t = texto;\n  comprobarAncla(abre, "abre", o);',
    caen: { [R7E]: /^lanzó otra cosa: code=undefined/ },
  },
  // ---- cerca
  { id: "S16", que: "cerca sin max(0, …)", fichero: "ancla.cjs", de: "let a = Math.max(0, i - radio);", a: "let a = i - radio;", caen: { [V5]: /^la ventana no empieza en el principio del texto/ } },
  {
    id: "S17",
    que: "la ventana acaba en i+r",
    fichero: "ancla.cjs",
    de: "let b = Math.min(t.length, i + ancla.length + radio);",
    a: "let b = Math.min(t.length, i + radio);",
    caen: { [V4]: /^con radio 0 la ventana no es el ancla/, [V9]: /^con radio 1 la ventana parte el emoji/, [V8]: /^no devolvió el ancla/ },
  },
  {
    id: "S18",
    que: "la ventana parte un emoji por el principio",
    fichero: "ancla.cjs",
    de: "if (a > 0 && esBaja(t.charCodeAt(a)) && esAlta(t.charCodeAt(a - 1))) a--;",
    a: "void 0;",
    caen: { [V9]: /^con radio 1 la ventana parte el emoji/ },
  },
  {
    id: "S19",
    que: "la ventana parte un emoji por el final",
    fichero: "ancla.cjs",
    de: "if (b < t.length && esBaja(t.charCodeAt(b)) && esAlta(t.charCodeAt(b - 1))) b++;",
    a: "void 0;",
    caen: { [V9]: /^con radio 1 la ventana parte el emoji/ },
  },
  { id: "S20", que: "cerca convierte el radio inválido en 0", fichero: "ancla.cjs", de: "comprobarRadio(radio, o);", a: "radio = parseInt(radio) || 0;", caen: { [R4]: /^radio "abc": no lanzó/ } },
  {
    id: "S21",
    que: "el radio admite enteros que no son seguros",
    fichero: "ancla.cjs",
    de: "Number.isSafeInteger(radio)",
    a: "Number.isInteger(radio)",
    caen: { [R4]: /^radio 9007199254740992: no lanzó/ },
  },
  {
    id: "S22",
    que: "cerca no valida el ancla",
    fichero: "ancla.cjs",
    de: 'comprobarAncla(ancla, "ancla", o);\n  comprobarRadio(radio, o);',
    a: "comprobarRadio(radio, o);",
    caen: { [R6K]: /^no lanzó/ },
  },
  {
    id: "S55",
    que: "cerca ignora unica",
    fichero: "ancla.cjs",
    de: 'const i = buscar(t, ancla, "ancla", o);\n  let a',
    a: 'const i = buscar(t, ancla, "ancla", { quien: o.quien, unica: false });\n  let a',
    caen: { [R5]: /^no lanzó/, [R5B]: /^no lanzó/, [R8]: /^AnclaRepetida: no lanzó/ },
  },
  {
    id: "S23",
    que: "cerca no valida el texto",
    fichero: "ancla.cjs",
    de: 'const t = comoTexto(texto, o);\n  comprobarAncla(ancla, "ancla", o);\n  comprobarRadio(radio, o);',
    a: 'const t = texto;\n  comprobarAncla(ancla, "ancla", o);\n  comprobarRadio(radio, o);',
    caen: { [R7K]: /^lanzó otra cosa: code=undefined/ },
  },
  // ---- shared checks
  {
    id: "S24",
    que: "ancla vacía admitida en las tres funciones",
    fichero: "ancla.cjs",
    de: 'if (typeof ancla !== "string" || ancla === "") {',
    a: 'if (typeof ancla !== "string") {',
    caen: { [R6D]: /^no lanzó/, [R6A]: /^no lanzó/, [R6C]: /^no lanzó/, [R6K]: /^no lanzó/ },
  },
  {
    id: "S25",
    que: "texto que no es cadena convertido a \"\"",
    fichero: "ancla.cjs",
    de: 'if (typeof texto !== "string") throw argumento(o.quien, "the text must be a string, got " + describir(texto));',
    a: 'if (typeof texto !== "string") return "";',
    caen: { [R7D]: /^lanzó otra cosa: .*name="AnclaPerdida"/, [R7E]: /^lanzó otra cosa: .*name="AnclaPerdida"/, [R7K]: /^lanzó otra cosa: .*name="AnclaPerdida"/ },
  },
  {
    id: "S26",
    que: "unica ignorada",
    fichero: "ancla.cjs",
    de: "if (o.unica) {",
    a: "if (false) {",
    caen: { [R5]: /^no lanzó/, [R5B]: /^no lanzó/, [R5D]: /^no lanzó/, [R5E]: /^no lanzó/, [R8]: /^AnclaRepetida: no lanzó/ },
  },
  {
    id: "S27",
    que: "unica busca la segunda desde i (se encuentra a sí misma)",
    fichero: "ancla.cjs",
    de: SEGUNDA,
    a: "const j = t.indexOf(ancla, i);",
    caen: {
      [V7]: /^AnclaRepetida: anchor appears more than once/,
      [VNULL]: /^AnclaRepetida: anchor appears more than once/,
      [R5]: /^posiciones .* y eran/,
      [R5B]: /^posiciones \[1,1\] y eran \[1,2\]/,
    },
  },
  { id: "S28", que: "unica busca la segunda desde i+len (no ve las solapadas)", fichero: "ancla.cjs", de: SEGUNDA, a: "const j = t.indexOf(ancla, i + ancla.length);", caen: { [R5B]: /^no lanzó/ } },
  {
    id: "S29",
    que: "el aviso de texto vacío no sale nunca",
    fichero: "ancla.cjs",
    de: 'throw new AnclaPerdida(ancla, papel, o.quien, t === "");',
    a: "throw new AnclaPerdida(ancla, papel, o.quien, false);",
    caen: { [RVACIO]: /^el mensaje no dice que el texto está vacío/ },
  },
  {
    id: "S30",
    que: "el aviso de texto vacío sale siempre",
    fichero: "ancla.cjs",
    de: 'throw new AnclaPerdida(ancla, papel, o.quien, t === "");',
    a: "throw new AnclaPerdida(ancla, papel, o.quien, true);",
    caen: { [RVACIO]: /^con texto, el mensaje dice que el texto está vacío/ },
  },
  // ---- errors: fields and message
  { id: "S31", que: "code cambiado", fichero: "ancla.cjs", de: 'this.code = "ANCLA_PERDIDA";', a: 'this.code = "ANCLA_NO_ENCONTRADA";', caen: { [R8]: /^AnclaPerdida: lanzó otra cosa: code="ANCLA_NO_ENCONTRADA"/, [RVACIO]: /code="ANCLA_NO_ENCONTRADA"/ } },
  {
    id: "S32",
    que: "AnclaPerdida pierde quien",
    fichero: "ancla.cjs",
    de: "this.papel = papel;\n    this.quien = quien;",
    a: "this.papel = papel;\n    this.quien = undefined;",
    caen: { [R1]: /quien=undefined \(esperaba "pedido.mjs"\)/ },
  },
  {
    id: "S33",
    que: "AnclaPerdida pierde ancla",
    fichero: "ancla.cjs",
    de: 'this.code = "ANCLA_PERDIDA";\n    this.ancla = ancla;',
    a: 'this.code = "ANCLA_PERDIDA";\n    this.ancla = undefined;',
    caen: { [R1]: /ancla=undefined \(esperaba "function importeDeLinea\("\)/ },
  },
  {
    id: "S34",
    que: "AnclaRepetida pierde ancla",
    fichero: "ancla.cjs",
    de: 'this.code = "ANCLA_REPETIDA";\n    this.ancla = ancla;',
    a: 'this.code = "ANCLA_REPETIDA";\n    this.ancla = undefined;',
    caen: { [R5]: /ancla=undefined \(esperaba "importeLinea\("\)/ },
  },
  {
    id: "S35",
    que: "AnclaRepetida pierde quien",
    fichero: "ancla.cjs",
    de: "this.posiciones = Object.freeze([primera, segunda]);\n    this.quien = quien;",
    a: "this.posiciones = Object.freeze([primera, segunda]);\n    this.quien = undefined;",
    caen: { [R5]: /quien=undefined \(esperaba "pedido.mjs"\)/ },
  },
  {
    id: "S36",
    que: "AnclaRepetida dice siempre papel ancla",
    fichero: "ancla.cjs",
    de: "this.papel = papel;\n    this.posiciones",
    a: 'this.papel = "ancla";\n    this.posiciones',
    caen: { [R5E]: /papel="ancla" \(esperaba "abre"\)/ },
  },
  { id: "S37", que: "las posiciones sin congelar", fichero: "ancla.cjs", de: "Object.freeze([primera, segunda])", a: "[primera, segunda]", caen: { [R5]: /^las posiciones se pueden cambiar/ } },
  {
    id: "S38",
    que: "AnclaRepetida no dice qué ancla de entre se repite",
    fichero: "ancla.cjs",
    de: 'lugar(quien) + PAPELES[papel] + " (at "',
    a: 'lugar(quien) + " (at "',
    caen: { [R5E]: /^el mensaje no dice qué ancla se repite/ },
  },
  {
    id: "S39",
    que: "el mensaje no dice que el cierre se busca tras la apertura",
    fichero: "ancla.cjs",
    de: 'cierra: " (closing, searched after the opening)"',
    a: 'cierra: ""',
    caen: { [R2]: /^el mensaje no dice que el cierre se buscó tras la apertura/ },
  },
  { id: "S40", que: "el mensaje pierde quien", fichero: "ancla.cjs", de: 'return quien === undefined ? "" : " in " + JSON.stringify(cortar(quien));', a: 'return "";', caen: { [R9]: /^el mensaje no dice quién/ } },
  { id: "S41", que: "quien sin recortar", fichero: "ancla.cjs", de: "JSON.stringify(cortar(quien))", a: "JSON.stringify(quien)", caen: { [R9B]: /^un quien de 500 caracteres no sale recortado/ } },
  { id: "S42", que: "el ancla sin escapar", fichero: "ancla.cjs", de: "let e = ESCAPES[c];", a: "let e = c;", caen: { [R9B]: /^el mensaje lleva saltos o tabuladores sin escapar/ } },
  { id: "S43", que: "el ancla sin recortar", fichero: "ancla.cjs", de: 'if (out.length + e.length > MAX_MUESTRA) return out + "…";', a: "void 0;", caen: { [R9B]: /^un ancla larga no sale recortada/ } },
  {
    id: "S44",
    que: "describir no dice el número",
    fichero: "ancla.cjs",
    de: 'if (typeof v === "number") return "number " + String(v);',
    a: 'if (typeof v === "number") return "number";',
    caen: { [R8]: /^argumento: el mensaje no dice qué llegó/ },
  },
  { id: "S45", que: "describir no dice el tipo", fichero: "ancla.cjs", de: "  return typeof v;\n}", a: '  return "value";\n}', caen: { [R7D]: /^el mensaje no dice qué llegó/ } },
  // ---- options
  {
    id: "S46",
    que: "las claves de opciones desconocidas se ignoran",
    fichero: "ancla.cjs",
    de: 'if (!CLAVES.includes(clave)) throw argumento(undefined, "unknown option " + JSON.stringify(String(clave)) + " (known: quien, unica)");',
    a: "void clave;",
    caen: { [R10]: /^no lanzó/ },
  },
  {
    id: "S47",
    que: "el tipo de unica no se comprueba",
    fichero: "ancla.cjs",
    de: 'if (unica !== undefined && typeof unica !== "boolean") throw argumento(quien, "options.unica must be a boolean, got " + describir(unica));',
    a: "void unica;",
    caen: { [R11]: /^no lanzó/ },
  },
  {
    id: "S48",
    que: "el tipo de quien no se comprueba",
    fichero: "ancla.cjs",
    de: 'if (quien !== undefined && typeof quien !== "string") throw argumento(undefined, "options.quien must be a string, got " + describir(quien));',
    a: "void quien;",
    caen: { [R12]: /^no lanzó/ },
  },
  {
    id: "S49",
    que: "opciones de cualquier tipo de objeto",
    fichero: "ancla.cjs",
    de: "if (Array.isArray(opciones) || (proto !== Object.prototype && proto !== null)) {",
    a: "if (opciones === null) {",
    caen: { [R13]: /^Map: no lanzó/ },
  },
  {
    id: "S50",
    que: "opciones en texto activan unica",
    fichero: "ancla.cjs",
    de: 'if (typeof opciones === "string") return { quien: opciones, unica: false };',
    a: 'if (typeof opciones === "string") return { quien: opciones, unica: true };',
    caen: { [V8]: /^AnclaRepetida: anchor appears more than once/ },
  },
  {
    id: "S51",
    que: "los objetos sin prototipo se rechazan",
    fichero: "ancla.cjs",
    de: "(proto !== Object.prototype && proto !== null)",
    a: "proto !== Object.prototype",
    caen: { [VNULL]: /^ANCLA_ARGUMENTO: options must be/ },
  },
  // ---- the ESM facade
  {
    id: "S52",
    que: "la fachada ESM deja de reexportar AnclaPerdida",
    fichero: "ancla.mjs",
    de: FACHADA,
    a: "export const { desde, entre, cerca, AnclaRepetida } = m;",
    caen: { [I1]: /no reexporta lo mismo que el CJS: AnclaPerdida$/ },
  },
  {
    id: "S53",
    que: "la fachada ESM añade una exportación por defecto",
    fichero: "ancla.mjs",
    de: FACHADA,
    a: FACHADA + "\nexport default m;",
    caen: { [I2]: /exporta un default que los tipos no declaran/ },
  },
];
