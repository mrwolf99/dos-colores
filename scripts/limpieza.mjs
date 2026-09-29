#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Looks for text that must never be published.
//
// The generic patterns live here, in the open: absolute user paths and e-mail
// addresses that are not noreply or reserved for examples. The private list
// (names, domains, internal codes) lives in
// <git-common-dir>/info/terminos-prohibidos, which git never commits or pushes.
// Publishing that list would itself be the leak, so a hit on it is reported by
// its number in the list, never by the term.
//
//   node scripts/limpieza.mjs [dir] [--historia] [--lista <file>]
//
// Exit code: 0 clean (possibly with PARCIAL lines), 1 something found, 2 misuse.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SALTAR = new Set([".git", "node_modules", ".worktrees"]);

// Public by design: noreply senders and the domains reserved for examples
// (RFC 2606 and RFC 6761).
function correoPermitido(c) {
  return (
    /^noreply@/i.test(c) ||
    /@users\.noreply\.github\.com$/i.test(c) ||
    /@example\.(?:com|org|net)$/i.test(c) ||
    /\.(?:test|example|invalid)$/i.test(c)
  );
}

export const GENERICOS = [
  {
    nombre: "ruta de usuario absoluta",
    re: /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+|\b[A-Za-z]:\\Users\\[^\\\s]+/g,
  },
  {
    nombre: "correo que no es noreply ni de ejemplo",
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
    permitido: correoPermitido,
  },
];

export function normalizar(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Where the private list would be for the repository that contains `raiz`.
// null: `raiz` is not inside a git repository.
export function rutaLista(raiz) {
  let comun;
  try {
    comun = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: raiz,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
  return path.join(path.resolve(raiz, comun), "info", "terminos-prohibidos");
}

// null: the file does not exist. Otherwise { ruta, terminos }, where every term
// is either { n, literal } (case- and accent-insensitive) or { n, re }.
export function leerLista(ruta) {
  let crudo;
  try {
    crudo = fs.readFileSync(ruta, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
  const terminos = [];
  crudo.split(/\r?\n/).forEach((linea, i) => {
    const l = linea.trim();
    if (l === "" || l.startsWith("#")) return;
    if (l.startsWith("re:")) {
      let re;
      try {
        re = new RegExp(normalizar(l.slice(3)), "iu");
      } catch {
        // The error text would contain the pattern: say only where it is.
        throw new Error(`lista privada, línea ${i + 1}: expresión regular inválida`);
      }
      terminos.push({ n: terminos.length + 1, re });
    } else {
      terminos.push({ n: terminos.length + 1, literal: normalizar(l).toLowerCase() });
    }
  });
  return { ruta, terminos };
}

export function mirarTexto(texto, lista) {
  const hallazgos = [];
  texto.split(/\r?\n/).forEach((original, i) => {
    for (const g of GENERICOS) {
      for (const m of original.matchAll(g.re)) {
        if (g.permitido && g.permitido(m[0])) continue;
        hallazgos.push({ linea: i + 1, patron: g.nombre });
      }
    }
    if (lista) {
      const sinAcentos = normalizar(original);
      const bajo = sinAcentos.toLowerCase();
      for (const t of lista.terminos) {
        const hay = t.literal !== undefined ? bajo.includes(t.literal) : t.re.test(sinAcentos);
        if (hay) hallazgos.push({ linea: i + 1, patron: `término privado nº ${t.n}` });
      }
    }
  });
  return hallazgos;
}

export function mirarArbol(raiz, lista) {
  const hallazgos = [];
  const saltados = [];
  let ficheros = 0;
  const pila = [raiz];
  while (pila.length > 0) {
    const dir = pila.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SALTAR.has(e.name)) continue;
      const p = path.join(dir, e.name);
      const rel = path.relative(raiz, p).split(path.sep).join("/");
      if (e.isSymbolicLink()) {
        saltados.push(`${rel} (enlace simbólico)`);
        continue;
      }
      if (e.isDirectory()) {
        pila.push(p);
        continue;
      }
      if (!e.isFile()) continue;
      const buf = fs.readFileSync(p);
      if (buf.subarray(0, 8000).includes(0)) {
        saltados.push(`${rel} (binario)`);
        continue;
      }
      ficheros++;
      for (const h of mirarTexto(rel, lista)) hallazgos.push({ fichero: rel, linea: 0, patron: `${h.patron} (en el nombre)` });
      for (const h of mirarTexto(buf.toString("utf8"), lista)) hallazgos.push({ fichero: rel, ...h });
    }
  }
  return { hallazgos, ficheros, saltados };
}

// Every commit reachable from any ref: author, committer, message and patch.
export function mirarHistoria(raiz, lista) {
  const salida = execFileSync(
    "git",
    ["log", "--all", "-p", "--no-color", "--no-ext-diff", "--format=commit %H%nAutor: %an <%ae>%nConfirma: %cn <%ce>%n%n%B"],
    { cwd: raiz, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
  );
  const lineas = salida.split("\n");
  const commits = new Set();
  const hallazgos = [];
  let actual = "?";
  lineas.forEach((l) => {
    const m = /^commit ([0-9a-f]{40})$/.exec(l);
    if (m) {
      actual = m[1].slice(0, 7);
      commits.add(actual);
      return;
    }
    for (const h of mirarTexto(l, lista)) hallazgos.push({ fichero: `historia:${actual}`, linea: 0, patron: h.patron });
  });
  return { hallazgos, commits: commits.size };
}

function avisarCI(texto) {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  console.log(`::warning title=limpieza::${texto}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- PARCIAL (limpieza): ${texto}\n`);
}

export function principal(argv) {
  const args = argv.slice(2);
  let raiz = RAIZ_REPO;
  let historia = false;
  let listaRuta;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--historia") historia = true;
    else if (a === "--lista") {
      listaRuta = args[++i];
      if (!listaRuta) {
        console.error("--lista necesita una ruta");
        return 2;
      }
    } else if (a.startsWith("-")) {
      console.error(`opción desconocida: ${a}`);
      return 2;
    } else raiz = path.resolve(a);
  }

  const ruta = listaRuta ?? rutaLista(raiz);
  const lista = ruta ? leerLista(ruta) : null;
  const parciales = [];
  let rojos = 0;

  if (lista === null) {
    const donde = ruta ? "no existe el fichero de la lista" : "la carpeta no está en un repositorio git";
    parciales.push(`sin lista privada de términos (${donde}); solo se han mirado los patrones genéricos`);
  } else if (lista.terminos.length === 0) {
    console.log("ROJO: la lista privada está vacía: una limpieza sin términos no mide nada");
    rojos++;
  }

  const arbol = mirarArbol(raiz, lista);
  for (const h of arbol.hallazgos) console.log(`ROJO: ${h.fichero}:${h.linea}: ${h.patron}`);
  rojos += arbol.hallazgos.length;
  if (arbol.saltados.length > 0) parciales.push(`${arbol.saltados.length} ficheros sin mirar: ${arbol.saltados.join(", ")}`);

  let resumenHistoria = "";
  if (historia) {
    try {
      const h = mirarHistoria(raiz, lista);
      for (const x of h.hallazgos) console.log(`ROJO: ${x.fichero}: ${x.patron}`);
      rojos += h.hallazgos.length;
      resumenHistoria = ` · historia: ${h.commits} commits, ${h.hallazgos.length} hallazgos`;
    } catch {
      parciales.push("no se ha podido leer la historia con git log");
    }
  }

  for (const p of parciales) {
    console.log(`PARCIAL: ${p}`);
    avisarCI(p);
  }
  const listaTxt = lista ? `${lista.terminos.length} términos` : "NO MIRADA";
  console.log(`limpieza: ${arbol.ficheros} ficheros mirados · ${arbol.hallazgos.length} hallazgos en el árbol${resumenHistoria} · lista privada: ${listaTxt}`);
  return rojos > 0 ? 1 : 0;
}

// Importing this module must not run it (the tests import the functions).
const invocado = process.argv[1] ? pathToFileURL(fs.realpathSync(process.argv[1])).href : "";
if (invocado === import.meta.url) process.exitCode = principal(process.argv);
