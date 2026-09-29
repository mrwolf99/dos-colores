// SPDX-License-Identifier: MIT
"use strict";

// Every piece of text a check depends on is cut here. When the anchor is not
// in the text, the check cannot measure what it claims to measure, so these
// functions throw instead of returning a piece that happens to make it pass.
// A bad argument is a different failure (a mistake in the check itself) and
// throws a TypeError with its own code, so each red names its own cause.

const CLAVES = new Set(["quien", "unica"]);
const MAX_MUESTRA = 70;
const PAPELES = { ancla: "", abre: " (opening)", cierra: " (closing, searched after the opening)" };

function muestra(s) {
  const e = s.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return e.length > MAX_MUESTRA ? e.slice(0, MAX_MUESTRA) + "…" : e;
}

function lugar(quien) {
  return quien === undefined ? "" : " in " + JSON.stringify(quien);
}

function describir(v) {
  if (v === null) return "null";
  if (typeof v === "string") return "string " + JSON.stringify(muestra(v));
  if (typeof v === "number") return "number " + String(v);
  return typeof v;
}

class AnclaPerdida extends Error {
  constructor(ancla, papel, quien) {
    super(
      "AnclaPerdida: anchor not found" + lugar(quien) + PAPELES[papel] + ": «" + muestra(ancla) + "». " +
        "The check cannot measure what it claims to measure, so it stops instead of passing. " +
        "If the code changed on purpose, update the anchor; otherwise this is the failure."
    );
    this.name = "AnclaPerdida";
    this.code = "ANCLA_PERDIDA";
    this.ancla = ancla;
    this.papel = papel;
    this.quien = quien;
  }
}

class AnclaRepetida extends Error {
  constructor(ancla, primera, segunda, quien) {
    super(
      "AnclaRepetida: anchor appears more than once" + lugar(quien) + " (at " + primera + " and " + segunda + "): «" + muestra(ancla) + "». " +
        "The check asked for a unique anchor, so it cannot tell which occurrence it would be measuring."
    );
    this.name = "AnclaRepetida";
    this.code = "ANCLA_REPETIDA";
    this.ancla = ancla;
    this.posiciones = Object.freeze([primera, segunda]);
    this.quien = quien;
  }
}

function argumento(quien, detalle) {
  const e = new TypeError("ANCLA_ARGUMENTO: " + detalle + lugar(quien) + ". This is a mistake in the check, not a missing anchor.");
  e.code = "ANCLA_ARGUMENTO";
  return e;
}

function leerOpciones(opciones) {
  if (opciones === undefined) return { quien: undefined, unica: false };
  if (typeof opciones === "string") return { quien: opciones, unica: false };
  if (opciones === null || typeof opciones !== "object" || Array.isArray(opciones)) {
    throw argumento(undefined, "options must be a string (who is checking) or { quien, unica }, got " + describir(opciones));
  }
  for (const clave of Object.keys(opciones)) {
    if (!CLAVES.has(clave)) throw argumento(undefined, "unknown option " + JSON.stringify(clave) + " (known: quien, unica)");
  }
  const { quien, unica } = opciones;
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
  if (i === -1) throw new AnclaPerdida(ancla, papel, o.quien);
  if (o.unica) {
    const j = t.indexOf(ancla, i + 1);
    if (j !== -1) throw new AnclaRepetida(ancla, i, j, o.quien);
  }
  return i;
}

// From the anchor (included) to the end.
function desde(texto, ancla, opciones) {
  const o = leerOpciones(opciones);
  const t = comoTexto(texto, o);
  comprobarAncla(ancla, "ancla", o);
  return t.slice(buscar(t, ancla, "ancla", o));
}

// From the opening anchor (included) to the first closing anchor after it
// (excluded). A closing anchor that only appears before the opening one is
// missing, not an empty piece.
function entre(texto, abre, cierra, opciones) {
  const o = leerOpciones(opciones);
  const t = comoTexto(texto, o);
  comprobarAncla(abre, "abre", o);
  comprobarAncla(cierra, "cierra", o);
  const i = buscar(t, abre, "abre", o);
  const j = t.indexOf(cierra, i + abre.length);
  if (j === -1) throw new AnclaPerdida(cierra, "cierra", o.quien);
  return t.slice(i, j);
}

// A window of `radio` characters on each side of the anchor. The window always
// contains the whole anchor, and never wraps around a negative index.
function cerca(texto, ancla, radio, opciones) {
  const o = leerOpciones(opciones);
  const t = comoTexto(texto, o);
  comprobarAncla(ancla, "ancla", o);
  comprobarRadio(radio, o);
  const i = buscar(t, ancla, "ancla", o);
  return t.slice(Math.max(0, i - radio), Math.min(t.length, i + ancla.length + radio));
}

module.exports = { desde, entre, cerca, AnclaPerdida, AnclaRepetida };
