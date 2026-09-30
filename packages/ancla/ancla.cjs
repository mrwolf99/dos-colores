// SPDX-License-Identifier: MIT
"use strict";

// Cuts text by anchors that have to be there. When one is missing, these
// functions throw instead of handing back some other piece of the text: the
// check that called them would go on looking at the wrong thing and could pass.
// A mistake in the call itself (a text that is not a string, an empty anchor,
// a bad radius or option) is a different cause, so it throws a TypeError with
// its own code, and each red says which of the two happened.

const CLAVES = ["quien", "unica"];
const MAX_MUESTRA = 80;
const PAPELES = { ancla: "", abre: " (opening)", cierra: " (closing, searched after the opening)" };
const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t", "\\": "\\\\", "«": "\\u00ab", "»": "\\u00bb" };

// One line, unambiguous: control characters, line and paragraph separators,
// the backslash and the «» that delimit the anchor in the message are escaped.
// A long piece is cut by code points, so neither an escape nor a surrogate
// pair is split.
function muestra(s) {
  let out = "";
  for (const c of s) {
    let e = ESCAPES[c];
    if (e === undefined) {
      const n = c.codePointAt(0);
      e = n < 0x20 || n === 0x7f || n === 0x2028 || n === 0x2029 ? "\\u" + n.toString(16).padStart(4, "0") : c;
    }
    if (out.length + e.length > MAX_MUESTRA) return out + "…";
    out += e;
  }
  return out;
}

function cortar(s) {
  const cps = Array.from(s);
  return cps.length > MAX_MUESTRA ? cps.slice(0, MAX_MUESTRA).join("") + "…" : s;
}

function lugar(quien) {
  return quien === undefined ? "" : " in " + JSON.stringify(cortar(quien));
}

function describir(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "string") return "string " + JSON.stringify(cortar(v));
  if (typeof v === "number") return "number " + String(v);
  if (typeof v === "object") {
    const p = Object.getPrototypeOf(v);
    const nombre = p && typeof p.constructor === "function" ? p.constructor.name : "";
    return nombre && nombre !== "Object" ? "object " + nombre : "object";
  }
  return typeof v;
}

class AnclaPerdida extends Error {
  constructor(ancla, papel, quien, textoVacio) {
    super(
      "AnclaPerdida: anchor not found" + lugar(quien) + PAPELES[papel] + ": «" + muestra(ancla) + "». " +
        (textoVacio ? "The text is empty, so it was probably never read: look at how it was loaded before looking at the anchor. " : "") +
        "Going on would measure some other piece of the text and could pass without looking, so this is the failure. " +
        "If the text changed on purpose, move the anchor with it."
    );
    this.name = "AnclaPerdida";
    this.code = "ANCLA_PERDIDA";
    this.ancla = ancla;
    this.papel = papel;
    this.quien = quien;
  }
}

class AnclaRepetida extends Error {
  constructor(ancla, papel, primera, segunda, quien) {
    super(
      "AnclaRepetida: anchor appears more than once" + lugar(quien) + PAPELES[papel] + " (at " + primera + " and " + segunda + "): «" + muestra(ancla) + "». " +
        "The check asked for a unique anchor and cannot tell which occurrence it would be measuring."
    );
    this.name = "AnclaRepetida";
    this.code = "ANCLA_REPETIDA";
    this.ancla = ancla;
    this.papel = papel;
    this.posiciones = Object.freeze([primera, segunda]);
    this.quien = quien;
  }
}

function argumento(quien, detalle) {
  const e = new TypeError("ANCLA_ARGUMENTO: " + detalle + lugar(quien) + ". This is a mistake in the check, not a missing anchor.");
  e.code = "ANCLA_ARGUMENTO";
  return e;
}

// A string (who is checking) or a plain object with own keys only. A Map, a
// Date or an object that inherits its options would be read wrongly, so they
// are refused instead of half-read.
function leerOpciones(opciones) {
  if (opciones === undefined) return { quien: undefined, unica: false };
  if (typeof opciones === "string") return { quien: opciones, unica: false };
  const proto = opciones !== null && typeof opciones === "object" ? Object.getPrototypeOf(opciones) : undefined;
  if (Array.isArray(opciones) || (proto !== Object.prototype && proto !== null)) {
    throw argumento(undefined, "options must be a string (who is checking) or a plain object { quien, unica }, got " + describir(opciones));
  }
  for (const clave of Reflect.ownKeys(opciones)) {
    if (!CLAVES.includes(clave)) throw argumento(undefined, "unknown option " + JSON.stringify(String(clave)) + " (known: quien, unica)");
  }
  const quien = Object.prototype.hasOwnProperty.call(opciones, "quien") ? opciones.quien : undefined;
  const unica = Object.prototype.hasOwnProperty.call(opciones, "unica") ? opciones.unica : undefined;
  if (quien !== undefined && typeof quien !== "string") throw argumento(undefined, "options.quien must be a string, got " + describir(quien));
  if (unica !== undefined && typeof unica !== "boolean") throw argumento(quien, "options.unica must be a boolean, got " + describir(unica));
  return { quien, unica: unica === true };
}

function comoTexto(texto, o) {
  if (typeof texto !== "string") throw argumento(o.quien, "the text must be a string, got " + describir(texto));
  return texto;
}

function comprobarAncla(ancla, papel, o) {
  if (typeof ancla !== "string" || ancla === "") {
    const cual = papel === "ancla" ? "anchor" : papel === "abre" ? "opening anchor" : "closing anchor";
    throw argumento(o.quien, "the " + cual + " must be a non-empty string, got " + describir(ancla));
  }
}

function comprobarRadio(radio, o) {
  if (!Number.isSafeInteger(radio) || radio < 0) throw argumento(o.quien, "the radius must be a safe integer >= 0, got " + describir(radio));
}

function buscar(t, ancla, papel, o) {
  const i = t.indexOf(ancla);
  if (i === -1) throw new AnclaPerdida(ancla, papel, o.quien, t === "");
  if (o.unica) {
    const j = t.indexOf(ancla, i + 1);
    if (j !== -1) throw new AnclaRepetida(ancla, papel, i, j, o.quien);
  }
  return i;
}

const esAlta = (c) => c >= 0xd800 && c <= 0xdbff;
const esBaja = (c) => c >= 0xdc00 && c <= 0xdfff;

// From the anchor (included) to the end.
function desde(texto, ancla, opciones) {
  const o = leerOpciones(opciones);
  const t = comoTexto(texto, o);
  comprobarAncla(ancla, "ancla", o);
  return t.slice(buscar(t, ancla, "ancla", o));
}

// From the opening anchor (included) to the first closing anchor that starts
// after the whole opening (excluded). A closing anchor that only appears before
// the opening, or overlapping it, is missing, not an empty piece.
function entre(texto, abre, cierra, opciones) {
  const o = leerOpciones(opciones);
  const t = comoTexto(texto, o);
  comprobarAncla(abre, "abre", o);
  comprobarAncla(cierra, "cierra", o);
  const i = buscar(t, abre, "abre", o);
  const j = t.indexOf(cierra, i + abre.length);
  if (j === -1) throw new AnclaPerdida(cierra, "cierra", o.quien, false);
  return t.slice(i, j);
}

// `radio` UTF-16 code units on each side of the anchor. The window always
// contains the whole anchor, never wraps around a negative index, and is
// widened by one unit at an edge that would split a surrogate pair.
function cerca(texto, ancla, radio, opciones) {
  const o = leerOpciones(opciones);
  const t = comoTexto(texto, o);
  comprobarAncla(ancla, "ancla", o);
  comprobarRadio(radio, o);
  const i = buscar(t, ancla, "ancla", o);
  let a = Math.max(0, i - radio);
  let b = Math.min(t.length, i + ancla.length + radio);
  if (a > 0 && esBaja(t.charCodeAt(a)) && esAlta(t.charCodeAt(a - 1))) a--;
  if (b < t.length && esBaja(t.charCodeAt(b)) && esAlta(t.charCodeAt(b - 1))) b++;
  return t.slice(a, b);
}

module.exports = { desde, entre, cerca, AnclaPerdida, AnclaRepetida };
