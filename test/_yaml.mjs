// SPDX-License-Identifier: MIT
// A reader for the YAML of the workflows in .github/workflows, and nothing
// more. The repository installs nothing, so there is no YAML library; instead
// of a lenient reader that could read something else than GitHub reads, this
// one knows a small subset and REFUSES everything outside it, naming the line
// and the construct. A refusal is a red with its cause, never a guess.
//
// Accepted: block mappings and sequences (spaces only), `- key: value` items,
// plain scalars, "double" and 'single' quoted scalars, one-line flow
// collections ([a, b], { a: b }, {}, []), comments, and empty values (null).
// Every scalar stays a string ("18", "false"): the checks compare text.
// Refused: tabs in indentation, anchors, aliases, tags, block scalars (| >),
// documents (---), complex keys (?), multi-line plain or flow values,
// duplicate keys, and a plain value that contains ": ".

export class YamlFuera extends Error {
  constructor(linea, causa) {
    super(`YAML fuera del subconjunto, línea ${linea}: ${causa}`);
    this.linea = linea;
    this.causa = causa;
  }
}

const CLAVE = /^([A-Za-z0-9_][A-Za-z0-9_.\/-]*|"[^"\\]*"|'[^']*'):(?=[ ]|$)/;

function tokenizar(texto) {
  const lineas = texto.replace(/\r\n?/g, "\n").split("\n");
  const salida = [];
  lineas.forEach((l, i) => {
    const n = i + 1;
    const sangria = /^[ \t]*/.exec(l)[0];
    if (sangria.includes("\t")) throw new YamlFuera(n, "tabulador en la sangría");
    const contenido = l.slice(sangria.length);
    if (contenido === "" || contenido.startsWith("#")) return;
    if (/^(?:---|\.\.\.)(?:\s|$)/.test(contenido) || contenido.startsWith("%")) {
      throw new YamlFuera(n, "marcador de documento o directiva");
    }
    salida.push({ n, sangria: sangria.length, contenido: contenido.replace(/\s+$/, "") });
  });
  return salida;
}

// After a complete value, only spaces and a comment may follow.
function soloComentario(resto, n) {
  if (resto.trim() !== "" && !/^\s+#/.test(resto) && !/^#/.test(resto.trim())) {
    throw new YamlFuera(n, `sobra texto detrás del valor: «${resto.trim()}»`);
  }
  if (/^#/.test(resto)) throw new YamlFuera(n, "un comentario necesita un espacio delante");
}

function comillaDoble(s, i, n) {
  let out = "";
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === '"') return { valor: out, fin: j + 1 };
    if (c === "\\") {
      const e = s[j + 1];
      const tabla = { '"': '"', "\\": "\\", n: "\n", t: "\t", "/": "/" };
      if (!(e in tabla)) throw new YamlFuera(n, `escape \\${e ?? ""} no admitido`);
      out += tabla[e];
      j++;
    } else out += c;
  }
  throw new YamlFuera(n, "comilla doble sin cerrar en la misma línea");
}

function comillaSimple(s, i, n) {
  let out = "";
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === "'") {
      if (s[j + 1] === "'") {
        out += "'";
        j++;
        continue;
      }
      return { valor: out, fin: j + 1 };
    }
    out += s[j];
  }
  throw new YamlFuera(n, "comilla simple sin cerrar en la misma línea");
}

const INDICADOR = /^[&*!|>%@`?]/;

function escalarPlano(texto, n) {
  if (INDICADOR.test(texto)) throw new YamlFuera(n, `«${texto[0]}» al principio de un valor (ancla, alias, etiqueta, bloque o reservado)`);
  if (/^[-:,\]}]/.test(texto) && !/^-\S/.test(texto)) throw new YamlFuera(n, `valor que empieza por «${texto[0]}»`);
  if (/:\s/.test(texto) || texto.endsWith(":")) throw new YamlFuera(n, `valor plano con «: » dentro: «${texto}» (YAML lo leería como otra clave)`);
  return texto;
}

// A value on one line, at position 0 of `s`. Returns { valor, fin }.
function valorEnLinea(s, n, enFlujo) {
  if (s[0] === '"') return comillaDoble(s, 0, n);
  if (s[0] === "'") return comillaSimple(s, 0, n);
  if (s[0] === "[" || s[0] === "{") return flujo(s, 0, n);
  if (enFlujo) {
    const m = /^[^,\]}\[{#]*/.exec(s)[0];
    let t = m;
    let clave = false;
    const dos = /:(?=\s|$)/.exec(t);
    if (dos) {
      t = t.slice(0, dos.index);
      clave = true;
    }
    t = t.trim();
    if (t === "") throw new YamlFuera(n, "elemento vacío en una colección de flujo");
    return { valor: escalarPlano(t, n), fin: clave ? dos.index : m.length, clave };
  }
  const corte = /\s#/.exec(s);
  const t = (corte ? s.slice(0, corte.index) : s).trim();
  return { valor: escalarPlano(t, n), fin: corte ? corte.index : s.length };
}

function flujo(s, i, n) {
  const abre = s[i];
  const cierra = abre === "[" ? "]" : "}";
  const out = abre === "[" ? [] : {};
  let j = i + 1;
  const espacios = () => {
    while (s[j] === " ") j++;
  };
  espacios();
  if (s[j] === cierra) return { valor: out, fin: j + 1 };
  for (;;) {
    espacios();
    if (j >= s.length) throw new YamlFuera(n, "colección de flujo sin cerrar en la misma línea");
    if (abre === "[") {
      const r = valorEnLinea(s.slice(j), n, true);
      if (r.clave) throw new YamlFuera(n, "clave dentro de una lista de flujo");
      out.push(r.valor);
      j += r.fin;
    } else {
      const r = valorEnLinea(s.slice(j), n, true);
      if (typeof r.valor !== "string") throw new YamlFuera(n, "clave que no es un texto");
      j += r.fin;
      espacios();
      if (s[j] !== ":") throw new YamlFuera(n, `falta «:» detrás de la clave «${r.valor}»`);
      j++;
      if (s[j] !== " ") throw new YamlFuera(n, "falta un espacio detrás de «:»");
      espacios();
      if (Object.hasOwn(out, r.valor)) throw new YamlFuera(n, `clave repetida «${r.valor}»`);
      const v = valorEnLinea(s.slice(j), n, true);
      if (v.clave) throw new YamlFuera(n, "valor con «:» en una colección de flujo");
      out[r.valor] = v.valor;
      j += v.fin;
    }
    espacios();
    if (j >= s.length) throw new YamlFuera(n, "colección de flujo sin cerrar en la misma línea");
    if (s[j] === ",") {
      j++;
      continue;
    }
    if (s[j] === cierra) return { valor: out, fin: j + 1 };
    throw new YamlFuera(n, `se esperaba «,» o «${cierra}» en la colección de flujo`);
  }
}

// A scalar or flow value that fills the rest of the line.
function valorFinal(s, n) {
  const r = valorEnLinea(s, n, false);
  soloComentario(s.slice(r.fin), n);
  return r.valor;
}

function leerClave(contenido, n) {
  const m = CLAVE.exec(contenido);
  if (!m) return null;
  let clave = m[1];
  if (clave[0] === '"' || clave[0] === "'") clave = clave.slice(1, -1);
  return { clave, resto: contenido.slice(m[0].length).replace(/^ +/, "") };
}

export function leerYaml(texto) {
  const t = tokenizar(texto);
  let i = 0;

  function bloque(sangria) {
    const l = t[i];
    if (l.contenido === "-" || l.contenido.startsWith("- ")) return secuencia(l.sangria);
    return mapa(l.sangria);
  }

  // The value of `clave:` with nothing after it: a nested block, or null.
  function hijo(padre) {
    const sig = t[i];
    if (!sig) return null;
    if (sig.sangria > padre.sangria) return bloque(sig.sangria);
    if (sig.sangria === padre.sangria && (sig.contenido === "-" || sig.contenido.startsWith("- ")) && padre.esClave) {
      return secuencia(sig.sangria);
    }
    return null;
  }

  function mapa(sangria) {
    const out = {};
    while (i < t.length && t[i].sangria === sangria && !(t[i].contenido === "-" || t[i].contenido.startsWith("- "))) {
      const l = t[i];
      if (l.contenido.startsWith("?")) throw new YamlFuera(l.n, "clave compleja (?)");
      const k = leerClave(l.contenido, l.n);
      if (!k) throw new YamlFuera(l.n, `se esperaba «clave:» y hay «${l.contenido}»`);
      if (Object.hasOwn(out, k.clave)) throw new YamlFuera(l.n, `clave repetida «${k.clave}»`);
      i++;
      if (k.resto === "" || k.resto.startsWith("#")) {
        out[k.clave] = hijo({ sangria, esClave: true });
      } else {
        if (/^[|>]/.test(k.resto)) throw new YamlFuera(l.n, `escalar de bloque (${k.resto[0]})`);
        out[k.clave] = valorFinal(k.resto, l.n);
        if (i < t.length && t[i].sangria > sangria) throw new YamlFuera(t[i].n, "línea más sangrada detrás de un valor completo (¿un valor en varias líneas?)");
      }
    }
    if (i < t.length && t[i].sangria > sangria) throw new YamlFuera(t[i].n, "sangría inesperada");
    return out;
  }

  function secuencia(sangria) {
    const out = [];
    while (i < t.length && t[i].sangria === sangria && (t[i].contenido === "-" || t[i].contenido.startsWith("- "))) {
      const l = t[i];
      if (l.contenido === "-") {
        i++;
        out.push(hijo({ sangria, esClave: false }));
        continue;
      }
      const tras = l.contenido.slice(1);
      const espacios = /^ +/.exec(tras)[0].length;
      const resto = tras.slice(espacios);
      if (resto.startsWith("- ") || resto === "-") throw new YamlFuera(l.n, "secuencia dentro de secuencia en la misma línea");
      if (leerClave(resto, l.n)) {
        // `- key: value`: a mapping whose keys sit at the column of `key`.
        t[i] = { n: l.n, sangria: sangria + 1 + espacios, contenido: resto };
        out.push(mapa(sangria + 1 + espacios));
      } else {
        i++;
        if (/^[|>]/.test(resto)) throw new YamlFuera(l.n, `escalar de bloque (${resto[0]})`);
        out.push(valorFinal(resto, l.n));
        if (i < t.length && t[i].sangria > sangria) throw new YamlFuera(t[i].n, "línea más sangrada detrás de un elemento completo");
      }
    }
    return out;
  }

  if (t.length === 0) return null;
  if (t[0].sangria !== 0) throw new YamlFuera(t[0].n, "la primera línea no empieza en la columna 0");
  const raiz = bloque(0);
  if (i < t.length) throw new YamlFuera(t[i].n, "sobra contenido fuera del bloque principal");
  return raiz;
}
