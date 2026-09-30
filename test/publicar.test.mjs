// SPDX-License-Identifier: MIT
// The guard of publishing: .github/workflows/publicar.yml, the part of ci.yml
// that it calls, the package.json of both packages and what their tarballs
// contain. Every rule is seen green on the real files and red, alone and for
// its own cause, under an in-memory sabotage of its own. Two cases cannot fall
// alone, on purpose (CASOS_CONJUNTOS), and name every rule that falls.
//
// A census runs every sabotage again and checks that each call to falta() in
// faltasDePublicacion has been seen falling at least once: not only every
// rule, every branch inside it.
//
// What this guard CANNOT see from the repository, and where it is seen
// instead (PUBLICAR.md, "Lo que ninguna prueba del repositorio ve"):
//   - the trusted publisher on npmjs.com (owner, repository, publicar.yml,
//     environment npm, and `permissions: stage publish` alone): `npm trust
//     list`, with a session; the first run of the workflow measures the rest;
//   - the e-mail of the npm account, which the registry publishes with every
//     version;
//   - that the environment npm on GitHub admits only tags v*, and the Actions
//     settings of the repository;
//   - that each pinned SHA is the commit of the tag written next to it;
//   - that GitHub reads these files as test/_yaml.mjs does. The reader refuses
//     everything outside a small subset instead of guessing. It was compared
//     with PyYAML on both workflows, normalising what PyYAML converts (the key
//     `on` becomes True, numbers and booleans stop being text): equal.
// None of these is a skipped check: this file does not claim them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import util from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { leerYaml, YamlFuera } from "./_yaml.mjs";
import { romper } from "../packages/ancla/test/_romper.mjs";
import { versionesQueNoCuadran, entornoQueFalla, enMainQueFalla, gitEn, NPM_MINIMO } from "../scripts/antes-de-publicar.mjs";

const require = createRequire(import.meta.url);
const { parcial } = require("./_parcial.cjs");

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), "utf8");

// ---- what the publication promises, written once ----

const REPO = "mrwolf99/dos-colores";
// npmjs.com trusts the workflow by this file name: renaming it breaks
// publishing without anybody seeing it until the next release.
const FLUJO = "publicar.yml";
const CI = "ci.yml";
const JOB = "publicar";
const ENTORNO = "npm";
const PATRON_ETIQUETA = "v[0-9]+.[0-9]+.[0-9]+";
const MANDO = "npm stage publish --provenance --ignore-scripts --loglevel=verbose";
const LLAMADA_CI = "./.github/workflows/ci.yml";
// The tag through the environment variable, never through a ${{ }} template:
// a template is pasted into the script before it runs.
const PASO_ETIQUETA = 'node scripts/antes-de-publicar.mjs --etiqueta "$GITHUB_REF_NAME"';
const PASO_MAIN = "node scripts/antes-de-publicar.mjs --en-main";
const PASO_ENTORNO = "node scripts/antes-de-publicar.mjs --entorno";
const ARBOL_LIMPIO = 'git diff --exit-code && test -z "$(git status --porcelain)"';
// The two ends of the peer range eslint >=9: the oldest major and the newest.
const ESLINT_MAYORES = ["9", "10"];
export const NOMBRES = { ancla: "@mrwolf99/ancla", "eslint-plugin-ancla": "eslint-plugin-ancla" };
const CICLO_DE_VIDA = [
  "preinstall", "install", "postinstall", "prepublish", "preprepare", "prepare", "postprepare",
  "prepublishOnly", "prepack", "postpack", "publish", "postpublish",
];
// What each tarball must contain, file by file (npm adds package.json, README
// and LICENSE by itself).
export const EMPAQUETADO = {
  ancla: ["LICENSE", "README.md", "ancla.cjs", "ancla.d.cts", "ancla.d.mts", "ancla.mjs", "package.json"],
  "eslint-plugin-ancla": ["LICENSE", "README.md", "docs/rules/no-unchecked-slice.md", "index.cjs", "package.json", "rules/no-unchecked-slice.cjs"],
};

export const REGLAS = {
  "flujo.nombre": `existe .github/workflows/${FLUJO}, el nombre en el que confía npmjs.com`,
  "disparo.eventos": "solo lo dispara un push",
  "disparo.push": "el push es solo de etiquetas",
  "disparo.patron": `las etiquetas son exactamente ${PATRON_ETIQUETA}`,
  "permisos.arriba": "arriba, permissions: {}",
  "permisos.job": "cada job declara sus permisos y ninguno escribe (salvo id-token)",
  "id-token.falta": `el job ${JOB} tiene id-token: write`,
  "id-token.fuera": `id-token no aparece en ningún otro sitio de ningún flujo`,
  secretos: `ni ${FLUJO} ni ${CI} usan secretos ni tokens de npm`,
  "orden.pruebas": `${JOB} depende de un job que llama a ${CI}`,
  "orden.etiqueta": `${JOB} depende de un job que compara la etiqueta ("$GITHUB_REF_NAME") con las versiones`,
  "orden.main": `${JOB} depende de un job que comprueba, sobre un clon completo, que el commit está en main`,
  "orden.atajo": `ni if ni continue-on-error en ${FLUJO} ni en ${CI}`,
  "pruebas.llamable": `${CI} se puede llamar (workflow_call)`,
  "pruebas.disparo": `${CI} se dispara por push solo en ramas: con las etiquetas correría dos veces`,
  "pruebas.sin-saltos": `${CI} corre con DOS_COLORES_SIN_SALTOS=1`,
  "pruebas.raiz": `${CI} corre npm run test:raiz`,
  "pruebas.limpieza": `${CI} corre la limpieza con --historia sobre un clon completo`,
  "pruebas.paquetes": `${CI} corre npm test en cada paquete`,
  "pruebas.eslint": `${CI} prueba la regla con ESLint 9 y 10, y comprueba cuál ha cargado`,
  "pruebas.tipos": `${CI} compila los tipos de ancla`,
  "pruebas.arbol": `cada job de ${CI} termina con el árbol intacto`,
  "acciones.sha": "cada acción remota va fijada por un SHA de 40 caracteres",
  "acciones.comentario": "cada acción fijada dice al lado la versión que era",
  "publicar.entorno": `${JOB} corre en el entorno ${ENTORNO}`,
  "publicar.node": `${JOB} usa una versión exacta de Node y sin caché`,
  "publicar.checkout": `${JOB} no deja las credenciales de git en el disco`,
  "publicar.previo": `${JOB} comprueba el entorno antes de preparar nada`,
  "publicar.mando": `cada publicación es «${MANDO}», y solo en ${JOB}`,
  "publicar.paquetes": `${JOB} prepara cada paquete una vez, y ninguno más`,
  "publicar.forma": `${JOB} y la cabecera de ${FLUJO} tienen una forma cerrada: ni una clave ni un paso de más`,
  "paquete.nombre": "cada paquete se llama como está dado de alta en npm",
  "paquete.privado": "ningún paquete es private",
  "paquete.repository": "repository apunta a este repositorio, con directory",
  "paquete.homepage": "homepage apunta al README del paquete",
  "paquete.bugs": "bugs apunta a las issues",
  "paquete.publishConfig": 'publishConfig es exactamente { access: "public" }',
  "paquete.files": "files existe y no está vacío",
  "paquete.scripts": "ningún script de ciclo de vida corre al empaquetar o publicar",
  "paquete.readme": "el README que viaja en el tarball dice cómo instalar el paquete",
  "raiz.privada": "la raíz es private: no se puede publicar por error",
  npmrc: "ni un .npmrc en el repositorio ni variables npm_config_* en los flujos",
};

// ---- reading what is really there ----

function buscarNpmrc(raiz) {
  const hallados = [];
  const pila = [raiz];
  while (pila.length) {
    const dir = pila.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if ([".git", "node_modules", ".worktrees"].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) pila.push(p);
      else if (e.name === ".npmrc") hallados.push(path.relative(raiz, p).split(path.sep).join("/"));
    }
  }
  return hallados.sort();
}

export function leerEntrada(raiz = RAIZ) {
  const dirFlujos = path.join(raiz, ".github", "workflows");
  const flujos = {};
  for (const f of fs.readdirSync(dirFlujos).sort()) {
    if (/\.ya?ml$/.test(f)) flujos[f] = fs.readFileSync(path.join(dirFlujos, f), "utf8");
  }
  const paquetes = {};
  for (const d of fs.readdirSync(path.join(raiz, "packages"), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dir = path.join(raiz, "packages", d.name);
    paquetes[d.name] = {
      pkg: JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")),
      readme: fs.readFileSync(path.join(dir, "README.md"), "utf8"),
    };
  }
  return { flujos, paquetes, raiz: JSON.parse(fs.readFileSync(path.join(raiz, "package.json"), "utf8")), npmrc: buscarNpmrc(raiz) };
}

// ---- the checks: pure, so that each one can be seen red ----

const esMapa = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const pasos = (job) => (esMapa(job) && Array.isArray(job.steps) ? job.steps.filter(esMapa) : []);
const lista = (x) => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);
const PUBLICA = /\b(?:npm|npx|pnpm|yarn)\b.*\b(?:publish|pub|stage)\b/;
const esUso = (accion) => (s) => typeof s.uses === "string" && s.uses.startsWith(`${accion}@`);

// The closed shape of what runs with id-token. `if` and `continue-on-error`
// are left out on purpose: orden.atajo judges them, with its own cause.
const CLAVES_ARRIBA = ["name", "on", "permissions", "jobs"];
const CLAVES_JOB = ["needs", "runs-on", "environment", "timeout-minutes", "permissions", "steps"];
const LOS_JUZGA_ATAJO = ["if", "continue-on-error"];
const TIPOS_DE_PASO = [
  { tipo: "checkout", es: esUso("actions/checkout"), claves: ["uses", "with"], with: ["persist-credentials"], uno: true },
  { tipo: "setup-node", es: esUso("actions/setup-node"), claves: ["uses", "with"], with: ["node-version", "package-manager-cache"], uno: true },
  { tipo: "la comprobación del entorno", es: (s) => s.run === PASO_ENTORNO, claves: ["run"] },
  { tipo: "una preparación", es: (s) => PUBLICA.test(s.run ?? ""), claves: ["run", "working-directory"] },
];

// The line of this file that called falta(), for the census of branches.
function lineaDeLlamada() {
  const pila = String(new Error().stack).split("\n");
  // [0] "Error", [1] lineaDeLlamada, [2] falta, [3] whoever called falta.
  const m = /:(\d+):\d+\)?$/.exec(pila[3] ?? "");
  return m ? Number(m[1]) : null;
}

function recorrer(valor, ruta, visitar) {
  if (Array.isArray(valor)) valor.forEach((v, i) => recorrer(v, `${ruta}[${i}]`, visitar));
  else if (esMapa(valor)) {
    for (const [k, v] of Object.entries(valor)) {
      visitar(k, `${ruta}.${k}`);
      recorrer(v, `${ruta}.${k}`, visitar);
    }
  } else if (typeof valor === "string") visitar(valor, ruta);
}

function jobDeEslint(ci) {
  return Object.entries(esMapa(ci?.jobs) ? ci.jobs : {}).find(([, j]) =>
    pasos(j).some((s) => s.run === "npm test" && s["working-directory"] === "packages/eslint-plugin-ancla"),
  );
}

// sitios: optional Set that receives the line of each falta() that fired.
export function faltasDePublicacion(e, sitios) {
  const f = [];
  const falta = (regla, texto) => {
    if (!Object.hasOwn(REGLAS, regla)) throw new Error(`regla sin declarar en REGLAS: ${regla}`);
    if (sitios) sitios.add(lineaDeLlamada());
    f.push(`${regla}: ${texto}`);
  };
  const flujos = {};
  for (const [nombre, texto] of Object.entries(e.flujos)) {
    try {
      flujos[nombre] = leerYaml(texto);
    } catch (err) {
      // The red of the reader, not of the publication: say whose it is.
      if (err instanceof YamlFuera) {
        err.message = `${nombre}: ${err.message}. Es el lector de test/_yaml.mjs el que no lo sabe leer (no adivina): o se escribe en una línea, o se amplía el lector con su prueba en los dos colores`;
      }
      throw err;
    }
  }
  const pub = flujos[FLUJO];
  const ci = flujos[CI];
  const jobs = esMapa(pub?.jobs) ? pub.jobs : {};
  const pj = jobs[JOB];

  if (!pub) falta("flujo.nombre", `no existe .github/workflows/${FLUJO}: npmjs.com confía en ese nombre exacto, y sin él no se publica nada`);

  // -- the trigger --
  if (pub) {
    const on = pub.on;
    if (!esMapa(on)) falta("disparo.eventos", `on es ${JSON.stringify(on)} y tiene que ser un mapa con push`);
    else {
      const otros = Object.keys(on).filter((k) => k !== "push");
      if (otros.length) falta("disparo.eventos", `se dispara también por ${otros.join(", ")}: solo una etiqueta publica`);
      if (!Object.hasOwn(on, "push")) falta("disparo.eventos", "no se dispara por push de etiqueta");
      else {
        const push = on.push;
        if (!esMapa(push) || !Array.isArray(push.tags)) falta("disparo.push", "push sin lista de tags: cualquier push a cualquier rama publicaría");
        else {
          const extra = Object.keys(push).filter((k) => k !== "tags");
          if (extra.length) falta("disparo.push", `push lleva ${extra.join(", ")} además de tags: GitHub lo dispara si casa cualquiera de los dos`);
          else if (JSON.stringify(push.tags) !== JSON.stringify([PATRON_ETIQUETA])) {
            falta("disparo.patron", `tags es ${JSON.stringify(push.tags)} y tiene que ser ["${PATRON_ETIQUETA}"]`);
          }
        }
      }
    }
  }

  // -- permissions --
  if (pub) {
    const arriba = pub.permissions;
    if (arriba === undefined) falta("permisos.arriba", "no hay permissions arriba: los jobs sin los suyos heredarían los del repositorio");
    else if (!esMapa(arriba)) falta("permisos.arriba", `permissions arriba es ${JSON.stringify(arriba)} y tiene que ser {}`);
    else {
      const k = Object.keys(arriba).filter((x) => x !== "id-token");
      if (k.length) falta("permisos.arriba", `permissions arriba da ${k.map((x) => `${x}: ${arriba[x]}`).join(", ")} y tiene que ser {}`);
    }
    for (const [id, job] of Object.entries(jobs)) {
      const p = esMapa(job) ? job.permissions : undefined;
      if (p === undefined) falta("permisos.job", `el job ${id} no declara permissions`);
      else if (!esMapa(p)) falta("permisos.job", `el job ${id} tiene permissions: ${JSON.stringify(p)}; se escriben uno a uno`);
      else {
        for (const [k, v] of Object.entries(p)) {
          if (k !== "id-token" && v !== "read" && v !== "none") falta("permisos.job", `el job ${id} pide ${k}: ${v}; aquí nadie escribe`);
        }
      }
    }
    const idPub = esMapa(pj) && esMapa(pj.permissions) ? pj.permissions["id-token"] : undefined;
    if (idPub !== "write") {
      falta("id-token.falta", `el job ${JOB} no tiene id-token: write (${JSON.stringify(idPub)}): npm se saltaría el OIDC en silencio y acabaría en ENEEDAUTH`);
    }
  }
  for (const [nombre, w] of Object.entries(flujos)) {
    if (esMapa(w?.permissions) && Object.hasOwn(w.permissions, "id-token")) {
      falta("id-token.fuera", `${nombre}: permissions de arriba da id-token: ${w.permissions["id-token"]}; solo lo necesita el job ${JOB} de ${FLUJO}`);
    }
    for (const [id, job] of Object.entries(esMapa(w?.jobs) ? w.jobs : {})) {
      if (nombre === FLUJO && id === JOB) continue;
      if (esMapa(job?.permissions) && Object.hasOwn(job.permissions, "id-token")) {
        falta("id-token.fuera", `${nombre}: el job ${id} tiene id-token: ${job.permissions["id-token"]}; solo lo necesita el job ${JOB} de ${FLUJO}`);
      }
    }
  }

  // -- secrets --
  for (const nombre of [FLUJO, CI]) {
    if (!flujos[nombre]) continue;
    recorrer(flujos[nombre], "", (texto, ruta) => {
      const m = /NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|\bsecrets\b|registry-url/i.exec(texto);
      if (m) falta("secretos", `${nombre}: ${ruta.slice(1)} menciona «${m[0]}»: la publicación va por OIDC y no usa ningún secreto`);
    });
  }

  // -- order: the tests and the tag check come first --
  if (pub) {
    const needs = lista(esMapa(pj) ? pj.needs : undefined);
    const llaman = Object.entries(jobs).filter(([, j]) => esMapa(j) && j.uses === LLAMADA_CI).map(([id]) => id);
    if (!llaman.some((id) => needs.includes(id))) {
      falta("orden.pruebas", `el job ${JOB} no depende (needs) de ningún job que llame a ${LLAMADA_CI}: publicaría sin pasar las pruebas`);
    }
    const comprueban = Object.entries(jobs).filter(([, j]) => pasos(j).some((s) => s.run === PASO_ETIQUETA)).map(([id]) => id);
    if (!comprueban.some((id) => needs.includes(id))) {
      const casi = Object.values(jobs)
        .flatMap((j) => pasos(j).map((s) => s.run))
        .filter((r) => typeof r === "string" && r !== PASO_ETIQUETA && r.startsWith("node scripts/antes-de-publicar.mjs --etiqueta"));
      const por = casi.length === 0 ? "" : `: la compara con «${casi[0]}» y tiene que ser «${PASO_ETIQUETA}»${casi[0].includes("${{") ? "; una plantilla ${{ }} se pega en el guion antes de ejecutarlo, y esa es la forma de inyectar órdenes" : ""}`;
      falta("orden.etiqueta", `el job ${JOB} no depende de ningún job que compare la etiqueta ("$GITHUB_REF_NAME") con las versiones${por}`);
    }
    const enMain = Object.entries(jobs).filter(([, j]) => pasos(j).some((s) => s.run === PASO_MAIN));
    if (!enMain.some(([id]) => needs.includes(id))) {
      falta("orden.main", `el job ${JOB} no depende de ningún job que compruebe que el commit está en main («${PASO_MAIN}»): una etiqueta puesta en una rama sin integrar prepararía igual`);
    }
    for (const [id, j] of enMain) {
      const co = pasos(j).find(esUso("actions/checkout"));
      if (!co || !esMapa(co.with) || co.with["fetch-depth"] !== "0") {
        falta("orden.main", `el job ${id} mira si el commit está en main sobre un clon superficial (fetch-depth distinto de 0): no tendría origin/main y caería siempre`);
      }
    }
  }
  for (const nombre of [FLUJO, CI]) {
    for (const [id, job] of Object.entries(esMapa(flujos[nombre]?.jobs) ? flujos[nombre].jobs : {})) {
      for (const k of ["if", "continue-on-error"]) {
        if (esMapa(job) && Object.hasOwn(job, k)) falta("orden.atajo", `${nombre}: el job ${id} lleva ${k}: ${job[k]}; un fallo tiene que parar la publicación`);
      }
      pasos(job).forEach((s, i) => {
        for (const k of ["if", "continue-on-error"]) {
          if (Object.hasOwn(s, k)) falta("orden.atajo", `${nombre}: el paso ${i + 1} del job ${id} lleva ${k}: ${s[k]}; un fallo tiene que parar la publicación`);
        }
      });
    }
  }

  // -- what ci.yml has to run --
  if (!ci) falta("pruebas.llamable", `no existe .github/workflows/${CI}`);
  else {
    const cjobs = Object.entries(esMapa(ci.jobs) ? ci.jobs : {});
    const todos = cjobs.flatMap(([id, j]) => pasos(j).map((s) => ({ id, j, s })));
    if (!esMapa(ci.on) || !Object.hasOwn(ci.on, "workflow_call")) falta("pruebas.llamable", `${CI} no tiene workflow_call: ${FLUJO} no lo puede llamar`);
    const pushCi = esMapa(ci.on) ? ci.on.push : undefined;
    if (JSON.stringify(pushCi) !== JSON.stringify({ branches: ["**"] })) {
      falta("pruebas.disparo", `${CI} se dispara por push con ${JSON.stringify(pushCi)} y tiene que ser {"branches":["**"]}: con etiquetas, una vX.Y.Z pasaría la CI dos veces (sola y llamada desde ${FLUJO})`);
    }
    if (!esMapa(ci.env) || ci.env.DOS_COLORES_SIN_SALTOS !== "1") {
      falta("pruebas.sin-saltos", `${CI} no pone DOS_COLORES_SIN_SALTOS: "1" arriba: un PARCIAL pasaría por verde antes de publicar`);
    }
    if (!todos.some(({ s }) => s.run === "npm run test:raiz" && s["working-directory"] === undefined)) falta("pruebas.raiz", `ningún job de ${CI} corre npm run test:raiz`);
    const limpian = todos.filter(({ s }) => s.run === "node scripts/limpieza.mjs --historia");
    if (limpian.length === 0) falta("pruebas.limpieza", `ningún job de ${CI} corre node scripts/limpieza.mjs --historia`);
    for (const { id, j } of limpian) {
      const co = pasos(j).find((s) => typeof s.uses === "string" && s.uses.startsWith("actions/checkout@"));
      if (!co || !esMapa(co.with) || co.with["fetch-depth"] !== "0") {
        falta("pruebas.limpieza", `el job ${id} mira la historia sobre un clon superficial (fetch-depth distinto de 0): vería un solo commit`);
      }
    }
    for (const d of Object.keys(e.paquetes).sort()) {
      if (!todos.some(({ s }) => s.run === "npm test" && s["working-directory"] === `packages/${d}`)) falta("pruebas.paquetes", `ningún job de ${CI} corre npm test en packages/${d}`);
    }
    // With no job testing the rule at all, pruebas.paquetes already falls
    // (npm test in packages/eslint-plugin-ancla), and that is its red.
    const je = jobDeEslint(ci);
    if (je) {
      const [id, j] = je;
      const m = esMapa(j.strategy?.matrix) ? j.strategy.matrix : {};
      const versiones = [...lista(m.eslint), ...lista(m.include).map((x) => (esMapa(x) ? x.eslint : undefined))].filter((x) => typeof x === "string");
      const mayores = new Set(versiones.map((v) => v.split(".")[0]));
      const faltan = ESLINT_MAYORES.filter((v) => !mayores.has(v));
      if (faltan.length) falta("pruebas.eslint", `el job ${id} no prueba ESLint ${faltan.join(" ni ")} (prueba ${versiones.join(", ") || "nada"})`);
      if (!pasos(j).some((s) => typeof s.run === "string" && s.run.includes('"eslint@${{ matrix.eslint }}"'))) {
        falta("pruebas.eslint", `el job ${id} no instala eslint@\${{ matrix.eslint }}: la matriz no cambiaría la versión probada`);
      }
      const t = pasos(j).find((s) => s.run === "npm test" && s["working-directory"] === "packages/eslint-plugin-ancla");
      if (!esMapa(t.env) || t.env.DOS_COLORES_ESLINT_ESPERADO !== "${{ matrix.eslint }}") {
        falta("pruebas.eslint", `el job ${id} no le dice a las pruebas qué ESLint esperar (DOS_COLORES_ESLINT_ESPERADO): podrían correr con otro y salir en verde`);
      }
    }
    if (!todos.some(({ s }) => s.run === "npx --yes -p typescript@7.0.2 tsc -p packages/ancla/tipos/tsconfig.json")) {
      falta("pruebas.tipos", `ningún job de ${CI} compila packages/ancla/tipos`);
    }
    for (const [id, j] of cjobs) {
      const ps = pasos(j);
      if (ps.length === 0 || ps[ps.length - 1].run !== ARBOL_LIMPIO) falta("pruebas.arbol", `el job ${id} de ${CI} no termina comprobando que el árbol sigue intacto`);
    }
  }

  // -- actions: pinned, and saying what they were --
  for (const [nombre, w] of Object.entries(flujos)) {
    const usos = [];
    for (const [id, j] of Object.entries(esMapa(w?.jobs) ? w.jobs : {})) {
      if (esMapa(j) && typeof j.uses === "string") usos.push({ id, uses: j.uses });
      for (const s of pasos(j)) if (typeof s.uses === "string") usos.push({ id, uses: s.uses });
    }
    for (const { id, uses } of usos) {
      if (uses.startsWith("./")) continue;
      if (!/^[\w.-]+\/[\w.-]+(?:\/[\w./-]+)?@[0-9a-f]{40}$/.test(uses)) {
        falta("acciones.sha", `${nombre}: el job ${id} usa ${uses}: una etiqueta o una rama se pueden mover; un SHA completo, no`);
      }
    }
    e.flujos[nombre].split("\n").forEach((l, i) => {
      const m = /^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/.exec(l);
      if (!m || m[1].startsWith("./")) return;
      if (!/^\s+#\s*v\d+(?:\.\d+){0,2}\s*$/.test(m[2])) {
        falta("acciones.comentario", `${nombre}:${i + 1}: ${m[1]} no dice al lado qué versión era (# vX.Y.Z)`);
      }
    });
  }

  // -- the job that publishes --
  if (pub) {
    const ps = pasos(pj);
    const env = esMapa(pj) ? pj.environment : undefined;
    const nombreEntorno = esMapa(env) ? env.name : env;
    if (nombreEntorno !== ENTORNO) {
      falta("publicar.entorno", `el job ${JOB} corre en el entorno ${JSON.stringify(nombreEntorno)} y tiene que ser «${ENTORNO}»: es parte de la confianza en npmjs.com`);
    }
    const setup = ps.find((s) => typeof s.uses === "string" && s.uses.startsWith("actions/setup-node@"));
    const w = esMapa(setup?.with) ? setup.with : {};
    if (!/^\d+\.\d+\.\d+$/.test(w["node-version"] ?? "")) {
      falta("publicar.node", `el job ${JOB} pide Node ${JSON.stringify(w["node-version"])}: tiene que ser una versión exacta, la que trae el npm con el que se ha probado`);
    }
    if (w["package-manager-cache"] !== "false") falta("publicar.node", `el job ${JOB} no desactiva la caché (package-manager-cache: false): en una publicación no se reutiliza nada`);
    const co = ps.find((s) => typeof s.uses === "string" && s.uses.startsWith("actions/checkout@"));
    if (!co || !esMapa(co.with) || co.with["persist-credentials"] !== "false") {
      falta("publicar.checkout", `el checkout del job ${JOB} deja el token de GitHub en .git/config: le falta persist-credentials: false`);
    }
    const iPrevio = ps.findIndex((s) => s.run === PASO_ENTORNO);
    const iPrimero = ps.findIndex((s) => PUBLICA.test(s.run ?? ""));
    const iSetup = ps.findIndex(esUso("actions/setup-node"));
    if (iPrevio === -1) falta("publicar.previo", `el job ${JOB} no corre «${PASO_ENTORNO}»`);
    else if (iPrimero !== -1 && iPrevio > iPrimero) falta("publicar.previo", `el job ${JOB} comprueba el entorno después de empezar a publicar`);
    else if (iSetup !== -1 && iPrevio < iSetup) falta("publicar.previo", `el job ${JOB} comprueba el entorno antes de setup-node: mediría el npm de la máquina y no el que prepara`);
    const dirs = ps.filter((s) => PUBLICA.test(s.run ?? "")).map((s) => s["working-directory"]);
    const esperados = Object.keys(e.paquetes).sort().map((d) => `packages/${d}`);
    if (JSON.stringify([...dirs].sort()) !== JSON.stringify(esperados)) {
      falta("publicar.paquetes", `el job ${JOB} prepara ${JSON.stringify(dirs)} y tiene que preparar ${JSON.stringify(esperados)}, una vez cada uno`);
    }

    // -- the closed shape: a list of what may be there, not of what may not --
    for (const k of Object.keys(pub)) {
      if (!CLAVES_ARRIBA.includes(k)) falta("publicar.forma", `${FLUJO} lleva ${k} arriba (${JSON.stringify(pub[k])}); arriba solo van ${CLAVES_ARRIBA.join(", ")}: lo demás llega también al job ${JOB}`);
    }
    if (esMapa(pj)) {
      for (const k of Object.keys(pj)) {
        if (!CLAVES_JOB.includes(k) && !LOS_JUZGA_ATAJO.includes(k)) falta("publicar.forma", `el job ${JOB} lleva ${k}: ${JSON.stringify(pj[k])}; solo puede llevar ${CLAVES_JOB.join(", ")}`);
      }
      if (pj["runs-on"] !== "ubuntu-latest") {
        falta("publicar.forma", `el job ${JOB} corre en ${JSON.stringify(pj["runs-on"])} y tiene que ser "ubuntu-latest": otra máquina pone otro código junto al id-token`);
      }
      if (esMapa(pj.environment)) falta("publicar.forma", `el job ${JOB} escribe environment como un mapa (${Object.keys(pj.environment).join(", ")}); aquí va solo el nombre`);
    }
    const cuenta = new Map();
    ps.forEach((s, i) => {
      const t = TIPOS_DE_PASO.find((x) => x.es(s));
      if (!t) {
        falta("publicar.forma", `el paso ${i + 1} del job ${JOB} no es ninguno de los que puede llevar (${TIPOS_DE_PASO.map((x) => x.tipo).join(", ")}): ${JSON.stringify(s)}`);
        return;
      }
      cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
      for (const k of Object.keys(s)) {
        if (!t.claves.includes(k) && !LOS_JUZGA_ATAJO.includes(k)) falta("publicar.forma", `el paso ${i + 1} del job ${JOB} (${t.tipo}) lleva ${k}: ${JSON.stringify(s[k])}; solo puede llevar ${t.claves.join(", ")}`);
      }
      for (const k of Object.keys(esMapa(s.with) ? s.with : {})) {
        if (!(t.with ?? []).includes(k)) falta("publicar.forma", `el paso ${i + 1} del job ${JOB} (${t.tipo}) lleva with.${k}: ${JSON.stringify(s.with[k])}; solo puede llevar with.${(t.with ?? []).join(", with.")}`);
      }
    });
    for (const [t, n] of cuenta) {
      if (t.uno && n > 1) falta("publicar.forma", `el job ${JOB} tiene ${n} pasos de ${t.tipo} y puede tener uno`);
    }
  }
  for (const [nombre, w] of Object.entries(flujos)) {
    for (const [id, j] of Object.entries(esMapa(w?.jobs) ? w.jobs : {})) {
      pasos(j).forEach((s, i) => {
        if (!PUBLICA.test(s.run ?? "")) return;
        if (nombre !== FLUJO || id !== JOB) falta("publicar.mando", `${nombre}: el job ${id} publica («${s.run}») y solo puede hacerlo el job ${JOB} de ${FLUJO}`);
        else if (s.run !== MANDO) falta("publicar.mando", `el paso ${i + 1} de ${JOB} dice «${s.run}» y tiene que decir «${MANDO}»`);
      });
    }
  }

  // -- the manifests --
  for (const [d, { pkg, readme }] of Object.entries(e.paquetes)) {
    const donde = `packages/${d}/package.json`;
    if (!Object.hasOwn(NOMBRES, d)) falta("paquete.nombre", `packages/${d} es un paquete nuevo: su nombre va en NOMBRES y su confianza en npmjs.com`);
    else if (pkg.name !== NOMBRES[d]) falta("paquete.nombre", `${donde} se llama ${JSON.stringify(pkg.name)} y en npm es ${NOMBRES[d]}`);
    if (pkg.private) falta("paquete.privado", `${donde} es private: npm se negaría a publicarlo (EPRIVATE)`);
    const repo = { type: "git", url: `git+https://github.com/${REPO}.git`, directory: `packages/${d}` };
    if (JSON.stringify(pkg.repository) !== JSON.stringify(repo)) {
      falta("paquete.repository", `${donde} tiene repository ${JSON.stringify(pkg.repository)} y tiene que ser ${JSON.stringify(repo)}: npm compara la URL con el repositorio del OIDC, letra a letra`);
    }
    const home = `https://github.com/${REPO}/tree/main/packages/${d}#readme`;
    if (pkg.homepage !== home) falta("paquete.homepage", `${donde} tiene homepage ${JSON.stringify(pkg.homepage)} y tiene que ser ${home}`);
    const bugs = { url: `https://github.com/${REPO}/issues` };
    if (JSON.stringify(pkg.bugs) !== JSON.stringify(bugs)) falta("paquete.bugs", `${donde} tiene bugs ${JSON.stringify(pkg.bugs)} y tiene que ser ${JSON.stringify(bugs)}`);
    if (JSON.stringify(pkg.publishConfig) !== JSON.stringify({ access: "public" })) {
      const extra = esMapa(pkg.publishConfig) && Object.hasOwn(pkg.publishConfig, "provenance")
        ? " (provenance ahí rompe la publicación a mano con EUSAGE; con OIDC la pide el propio flujo)"
        : "";
      falta("paquete.publishConfig", `${donde} tiene publishConfig ${JSON.stringify(pkg.publishConfig)} y tiene que ser {"access":"public"}${extra}`);
    }
    if (!Array.isArray(pkg.files) || pkg.files.length === 0) falta("paquete.files", `${donde} no tiene files: npm lo metería todo, pruebas incluidas`);
    const ciclo = Object.keys(esMapa(pkg.scripts) ? pkg.scripts : {}).filter((k) => CICLO_DE_VIDA.includes(k));
    if (ciclo.length) falta("paquete.scripts", `${donde} tiene ${ciclo.join(", ")}: correría código en el job que tiene id-token`);
    if (/not on npm/i.test(readme)) falta("paquete.readme", `packages/${d}/README.md dice que no está en npm, y viaja dentro del tarball`);
    const nombre = String(NOMBRES[d] ?? pkg.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`^npm install --save-dev (?:\\S+ )*${nombre}$`, "m").test(readme)) {
      falta("paquete.readme", `packages/${d}/README.md no dice cómo instalarlo (npm install --save-dev … ${NOMBRES[d] ?? pkg.name})`);
    }
  }
  if (e.raiz.private !== true) falta("raiz.privada", "el package.json de la raíz no es private: un npm publish en la raíz subiría el repositorio entero");
  for (const r of e.npmrc) falta("npmrc", `${r} existe: un .npmrc puede cambiar el registro o apagar la procedencia sin que se vea en el flujo`);
  for (const nombre of [FLUJO, CI]) {
    if (!flujos[nombre]) continue;
    recorrer(flujos[nombre], "", (texto, ruta) => {
      if (ruta.endsWith(`.${texto}`) && /^npm_config_/i.test(texto)) {
        falta("npmrc", `${nombre}: ${ruta.slice(1)} configura npm por la puerta de atrás (el registro, la procedencia…) sin que se vea en la orden`);
      }
    });
  }
  return f;
}

// ---- green on what is really there ----

const ENTRADA = leerEntrada();

test("verde: el flujo de publicar, ci.yml y los dos package.json cumplen todo", () => {
  assert.ok(Object.hasOwn(ENTRADA.flujos, FLUJO), `no existe .github/workflows/${FLUJO}`);
  assert.deepEqual(Object.keys(ENTRADA.paquetes).sort(), Object.keys(NOMBRES).sort());
  assert.deepEqual(faltasDePublicacion(ENTRADA), []);
});

// ---- red, one at a time: each sabotage makes ONE check fall, for its cause ----

const texto = (flujo, de, a) => (e, id) => {
  e.flujos[flujo] = romper(e.flujos[flujo], de, a, id);
};
const pkg = (d, cambiar) => (e) => {
  cambiar(e.paquetes[d].pkg);
};
const PASO_ANCLA = `      - run: ${MANDO}\n        working-directory: packages/ancla\n`;
const PASO_PLUGIN = `      - run: ${MANDO}\n        working-directory: packages/eslint-plugin-ancla\n`;
const CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1";
const SETUP = "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0";
const ETIQUETA_JOB = "  etiqueta:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n";
const PUB_CHECKOUT = `    steps:\n      - uses: ${CHECKOUT}\n        with:\n          persist-credentials: false\n      - uses: ${SETUP}\n        with:\n          # Exact`;
const PASO_ETIQUETA_YML = `      - run: ${PASO_ETIQUETA}\n`;
const PASO_ENTORNO_YML = `      - run: ${PASO_ENTORNO}\n`;
const CABEZA_PUBLICAR = "  publicar:\n    needs: [pruebas, etiqueta]\n    runs-on: ubuntu-latest\n";

export const SABOTAJES = [
  { id: "N01", regla: "flujo.nombre", que: "publicar.yml renombrado", aplicar: (e) => void delete e.flujos[FLUJO], causa: /no existe \.github\/workflows\/publicar\.yml/ },
  { id: "N02", regla: "disparo.eventos", que: "también a mano", aplicar: texto(FLUJO, "on:\n  push:\n", "on:\n  workflow_dispatch:\n  push:\n"), causa: /también por workflow_dispatch/ },
  { id: "N03", regla: "disparo.push", que: "también en push a main", aplicar: texto(FLUJO, "  push:\n    tags:\n", "  push:\n    branches: [main]\n    tags:\n"), causa: /push lleva branches además de tags/ },
  { id: "N04", regla: "disparo.patron", que: "cualquier etiqueta", aplicar: texto(FLUJO, '      - "v[0-9]+.[0-9]+.[0-9]+"\n', '      - "*"\n'), causa: /tags es \["\*"\]/ },
  { id: "N05", regla: "permisos.arriba", que: "arriba se escribe", aplicar: texto(FLUJO, "\npermissions: {}\n", "\npermissions:\n  contents: write\n"), causa: /arriba da contents: write/ },
  { id: "N06", regla: "permisos.arriba", que: "sin permisos arriba", aplicar: texto(FLUJO, "\npermissions: {}\n", "\n"), causa: /no hay permissions arriba/ },
  { id: "N07", regla: "permisos.job", que: "etiqueta escribe", aplicar: texto(FLUJO, ETIQUETA_JOB, ETIQUETA_JOB.replace("contents: read", "contents: write")), causa: /el job etiqueta pide contents: write/ },
  { id: "N08", regla: "permisos.job", que: "pruebas sin permisos", aplicar: texto(FLUJO, `    uses: ${LLAMADA_CI}\n    permissions:\n      contents: read\n`, `    uses: ${LLAMADA_CI}\n`), causa: /el job pruebas no declara permissions/ },
  { id: "N09", regla: "id-token.falta", que: "publicar sin id-token", aplicar: texto(FLUJO, "      contents: read\n      id-token: write\n", "      contents: read\n"), causa: /no tiene id-token: write .*ENEEDAUTH/ },
  { id: "N10", regla: "id-token.fuera", que: "id-token en etiqueta", aplicar: texto(FLUJO, ETIQUETA_JOB, `${ETIQUETA_JOB}      id-token: write\n`), causa: /publicar\.yml: el job etiqueta tiene id-token: write/ },
  { id: "N11", regla: "id-token.fuera", que: "id-token arriba", aplicar: texto(FLUJO, "\npermissions: {}\n", "\npermissions:\n  id-token: write\n"), causa: /publicar\.yml: permissions de arriba da id-token: write/ },
  { id: "N12", regla: "id-token.fuera", que: "id-token en ci.yml", aplicar: texto(CI, "permissions:\n  contents: read\n", "permissions:\n  contents: read\n  id-token: write\n"), causa: /ci\.yml: permissions de arriba da id-token/ },
  // In the job etiqueta, not in publicar: there publicar.forma would also fall
  // (an env or a with key of more), and this sabotage is about secretos.
  { id: "N13", regla: "secretos", que: "un token de npm en un paso", aplicar: texto(FLUJO, PASO_ETIQUETA_YML, `${PASO_ETIQUETA_YML}        env:\n          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}\n`), causa: /menciona «NODE_AUTH_TOKEN»/ },
  { id: "N14", regla: "secretos", que: "registry-url en setup-node", aplicar: texto(FLUJO, "          node-version: 24\n", "          node-version: 24\n          registry-url: https://registry.npmjs.org\n"), causa: /menciona «registry-url»/ },
  { id: "N15", regla: "secretos", que: "secrets: inherit a ci.yml", aplicar: texto(FLUJO, `    uses: ${LLAMADA_CI}\n`, `    uses: ${LLAMADA_CI}\n    secrets: inherit\n`), causa: /jobs\.pruebas\.secrets menciona «secrets»/ },
  { id: "N16", regla: "orden.pruebas", que: "publicar sin esperar a las pruebas", aplicar: texto(FLUJO, "needs: [pruebas, etiqueta]", "needs: [etiqueta]"), causa: /publicaría sin pasar las pruebas/ },
  // N17 (publicar without waiting for the job etiqueta) is C02 now: that job
  // also checks main, so both rules fall, and should.
  // Its red has to differ from N65's: no word about templates here.
  { id: "N18", regla: "orden.etiqueta", que: "la etiqueta escrita a mano", aplicar: texto(FLUJO, '--etiqueta "$GITHUB_REF_NAME"', "--etiqueta v0.0.0"), causa: /no depende de ningún job que compare la etiqueta .*: la compara con «node scripts\/antes-de-publicar\.mjs --etiqueta v0\.0\.0» y tiene que ser «[^»]*»$/ },
  { id: "N19", regla: "orden.atajo", que: "publicar aunque fallen las pruebas", aplicar: texto(FLUJO, "    environment: npm\n", "    environment: npm\n    if: always()\n"), causa: /el job publicar lleva if: always\(\)/ },
  { id: "N20", regla: "orden.atajo", que: "test:raiz que puede fallar", aplicar: texto(CI, "      - run: npm run test:raiz\n", "      - run: npm run test:raiz\n        continue-on-error: true\n"), causa: /ci\.yml: el paso 3 del job raiz lleva continue-on-error: true/ },
  { id: "N21", regla: "orden.atajo", que: "limpieza apagada", aplicar: texto(CI, "      - run: node scripts/limpieza.mjs --historia\n", "      - run: node scripts/limpieza.mjs --historia\n        if: false\n"), causa: /ci\.yml: el paso 4 del job raiz lleva if: false/ },
  { id: "N22", regla: "pruebas.llamable", que: "ci.yml sin workflow_call", aplicar: texto(CI, "  workflow_call:\n", ""), causa: /no tiene workflow_call/ },
  { id: "N23", regla: "pruebas.sin-saltos", que: "saltos permitidos", aplicar: texto(CI, 'DOS_COLORES_SIN_SALTOS: "1"', 'DOS_COLORES_SIN_SALTOS: "0"'), causa: /un PARCIAL pasaría por verde/ },
  { id: "N24", regla: "pruebas.raiz", que: "sin pruebas de la raíz", aplicar: texto(CI, "      - run: npm run test:raiz\n", ""), causa: /ningún job de ci\.yml corre npm run test:raiz/ },
  { id: "N25", regla: "pruebas.limpieza", que: "limpieza sin historia", aplicar: texto(CI, "node scripts/limpieza.mjs --historia", "node scripts/limpieza.mjs"), causa: /ningún job de ci\.yml corre node scripts\/limpieza\.mjs --historia/ },
  { id: "N26", regla: "pruebas.limpieza", que: "historia sobre clon superficial", aplicar: texto(CI, "          fetch-depth: 0\n", "          fetch-depth: 1\n"), causa: /el job raiz mira la historia sobre un clon superficial/ },
  { id: "N27", regla: "pruebas.paquetes", que: "ancla sin pruebas", aplicar: texto(CI, "        working-directory: packages/ancla\n", "        working-directory: packages\n"), causa: /ningún job de ci\.yml corre npm test en packages\/ancla/ },
  {
    id: "N28",
    regla: "pruebas.eslint",
    que: "sin ESLint 10",
    aplicar: texto(CI, "          - { node: 20, eslint: 10.11.0 }\n          - { node: 22, eslint: 10.11.0 }\n          - { node: 24, eslint: 10.11.0 }\n          - { node: 26, eslint: 10.11.0 }\n", ""),
    causa: /el job plugin no prueba ESLint 10 /,
  },
  { id: "N29", regla: "pruebas.eslint", que: "sin ESLint esperado", aplicar: texto(CI, "          DOS_COLORES_ESLINT_ESPERADO: ${{ matrix.eslint }}\n", ""), causa: /DOS_COLORES_ESLINT_ESPERADO/ },
  { id: "N30", regla: "pruebas.eslint", que: "la matriz no instala nada", aplicar: texto(CI, '"eslint@${{ matrix.eslint }}"', '"eslint@9.39.5"'), causa: /no instala eslint@/ },
  { id: "N31", regla: "pruebas.tipos", que: "sin tipos", aplicar: texto(CI, "      - run: npx --yes -p typescript@7.0.2 tsc -p packages/ancla/tipos/tsconfig.json\n", ""), causa: /ningún job de ci\.yml compila packages\/ancla\/tipos/ },
  { id: "N32", regla: "pruebas.arbol", que: "tipos sin árbol limpio", aplicar: texto(CI, `tipos/tsconfig.json\n      - run: ${ARBOL_LIMPIO}\n`, "tipos/tsconfig.json\n"), causa: /el job tipos de ci\.yml no termina comprobando/ },
  { id: "N33", regla: "acciones.sha", que: "setup-node por etiqueta", aplicar: texto(FLUJO, `${SETUP}\n        with:\n          # Exact`, "actions/setup-node@v7 # v7.0.0\n        with:\n          # Exact"), causa: /el job publicar usa actions\/setup-node@v7:/ },
  {
    id: "N34",
    regla: "acciones.sha",
    que: "checkout de ci.yml por rama",
    aplicar: texto(CI, `  tipos:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ${CHECKOUT}\n`, "  tipos:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@main # v7.0.1\n"),
    causa: /ci\.yml: el job tipos usa actions\/checkout@main/,
  },
  {
    id: "N35",
    regla: "acciones.comentario",
    que: "SHA sin decir qué versión era",
    aplicar: texto(FLUJO, `      - uses: ${SETUP}\n        with:\n          node-version: 24\n`, `      - uses: ${SETUP.replace(" # v7.0.0", "")}\n        with:\n          node-version: 24\n`),
    causa: /publicar\.yml:\d+: actions\/setup-node@8207\w+ no dice al lado qué versión era/,
  },
  { id: "N36", regla: "publicar.entorno", que: "otro entorno", aplicar: texto(FLUJO, "    environment: npm\n", "    environment: produccion\n"), causa: /entorno "produccion" y tiene que ser «npm»/ },
  { id: "N37", regla: "publicar.entorno", que: "sin entorno", aplicar: texto(FLUJO, "    environment: npm\n", ""), causa: /entorno undefined y tiene que ser «npm»/ },
  { id: "N38", regla: "publicar.checkout", que: "credenciales en disco", aplicar: texto(FLUJO, PUB_CHECKOUT, PUB_CHECKOUT.replace("persist-credentials: false", "persist-credentials: true")), causa: /deja el token de GitHub en \.git\/config/ },
  { id: "N39", regla: "publicar.node", que: "Node flotante", aplicar: texto(FLUJO, "          node-version: 24.21.0\n", "          node-version: 24\n"), causa: /pide Node "24": tiene que ser una versión exacta/ },
  { id: "N40", regla: "publicar.node", que: "con caché", aplicar: texto(FLUJO, "          node-version: 24.21.0\n          package-manager-cache: false\n", "          node-version: 24.21.0\n"), causa: /no desactiva la caché/ },
  { id: "N41", regla: "publicar.previo", que: "sin comprobar el entorno", aplicar: texto(FLUJO, `      - run: ${PASO_ENTORNO}\n`, ""), causa: /no corre «node scripts\/antes-de-publicar\.mjs --entorno»/ },
  {
    id: "N42",
    regla: "publicar.previo",
    que: "el entorno, después",
    aplicar: (e, id) => {
      texto(FLUJO, `      - run: ${PASO_ENTORNO}\n`, "")(e, id);
      texto(FLUJO, PASO_PLUGIN, `${PASO_PLUGIN}      - run: ${PASO_ENTORNO}\n`)(e, id);
    },
    causa: /comprueba el entorno después de empezar a publicar/,
  },
  { id: "N43", regla: "publicar.mando", que: "sin procedencia", aplicar: texto(FLUJO, PASO_ANCLA, PASO_ANCLA.replace(" --provenance", "")), causa: /dice «npm stage publish --ignore-scripts --loglevel=verbose»/ },
  { id: "N44", regla: "publicar.mando", que: "ensayo que no publica", aplicar: texto(FLUJO, PASO_PLUGIN, PASO_PLUGIN.replace("--loglevel=verbose", "--loglevel=verbose --dry-run")), causa: /--dry-run» y tiene que decir/ },
  { id: "N45", regla: "publicar.mando", que: "publicación directa", aplicar: texto(FLUJO, PASO_ANCLA, PASO_ANCLA.replace("npm stage publish", "npm publish")), causa: /dice «npm publish --provenance/ },
  { id: "N46", regla: "publicar.mando", que: "publicar desde ci.yml", aplicar: texto(CI, "      - run: npm run test:raiz\n", "      - run: npm run test:raiz\n      - run: npm publish --workspaces\n"), causa: /ci\.yml: el job raiz publica/ },
  { id: "N47", regla: "publicar.paquetes", que: "el plugin se queda fuera", aplicar: texto(FLUJO, PASO_PLUGIN, ""), causa: /prepara \["packages\/ancla"\] y tiene que preparar/ },
  { id: "N48", regla: "publicar.paquetes", que: "ancla dos veces", aplicar: texto(FLUJO, PASO_PLUGIN, PASO_ANCLA), causa: /prepara \["packages\/ancla","packages\/ancla"\]/ },
  { id: "N49", regla: "paquete.nombre", que: "ancla sin scope", aplicar: pkg("ancla", (p) => (p.name = "ancla")), causa: /se llama "ancla" y en npm es @mrwolf99\/ancla/ },
  { id: "N50", regla: "paquete.privado", que: "plugin private", aplicar: pkg("eslint-plugin-ancla", (p) => (p.private = true)), causa: /EPRIVATE/ },
  { id: "N51", regla: "paquete.repository", que: "mayúscula en la URL", aplicar: pkg("ancla", (p) => (p.repository.url = p.repository.url.replace("mrwolf99", "Mrwolf99"))), causa: /letra a letra/ },
  { id: "N52", regla: "paquete.repository", que: "sin directory", aplicar: pkg("eslint-plugin-ancla", (p) => delete p.repository.directory), causa: /eslint-plugin-ancla\/package\.json tiene repository .* y tiene que ser/ },
  { id: "N53", regla: "paquete.homepage", que: "sin homepage", aplicar: pkg("ancla", (p) => delete p.homepage), causa: /tiene homepage undefined/ },
  { id: "N54", regla: "paquete.bugs", que: "sin bugs", aplicar: pkg("eslint-plugin-ancla", (p) => delete p.bugs), causa: /tiene bugs undefined/ },
  { id: "N55", regla: "paquete.publishConfig", que: "provenance en publishConfig", aplicar: pkg("ancla", (p) => (p.publishConfig.provenance = true)), causa: /rompe la publicación a mano con EUSAGE/ },
  { id: "N56", regla: "paquete.publishConfig", que: "ancla restringido", aplicar: pkg("ancla", (p) => (p.publishConfig.access = "restricted")), causa: /"access":"restricted"/ },
  { id: "N57", regla: "paquete.publishConfig", que: "otro registro", aplicar: pkg("eslint-plugin-ancla", (p) => (p.publishConfig.registry = "https://registry.example.com/")), causa: /registry\.example\.com/ },
  { id: "N58", regla: "paquete.files", que: "sin files", aplicar: pkg("ancla", (p) => delete p.files), causa: /no tiene files/ },
  { id: "N59", regla: "paquete.scripts", que: "prepublishOnly", aplicar: pkg("eslint-plugin-ancla", (p) => (p.scripts.prepublishOnly = "node x.js")), causa: /tiene prepublishOnly: correría código/ },
  {
    id: "N60",
    regla: "paquete.readme",
    que: "README que dice que no está",
    aplicar: (e) => void (e.paquetes.ancla.readme += "\n**Not on npm yet.**\n"),
    causa: /packages\/ancla\/README\.md dice que no está en npm/,
  },
  {
    id: "N61",
    regla: "paquete.readme",
    que: "README sin instalación",
    aplicar: (e, id) => void (e.paquetes["eslint-plugin-ancla"].readme = romper(e.paquetes["eslint-plugin-ancla"].readme, "npm install --save-dev eslint eslint-plugin-ancla\n", "npm install eslint-plugin-ancla\n", id)),
    causa: /packages\/eslint-plugin-ancla\/README\.md no dice cómo instalarlo/,
  },
  { id: "N62", regla: "raiz.privada", que: "raíz publicable", aplicar: (e) => void delete e.raiz.private, causa: /subiría el repositorio entero/ },
  { id: "N63", regla: "npmrc", que: "un .npmrc", aplicar: (e) => void e.npmrc.push("packages/ancla/.npmrc"), causa: /packages\/ancla\/\.npmrc existe/ },
  // In ci.yml: at the top of publicar.yml, publicar.forma would also fall.
  { id: "N64", regla: "npmrc", que: "el registro por el entorno", aplicar: texto(CI, 'DOS_COLORES_SIN_SALTOS: "1"\n', 'DOS_COLORES_SIN_SALTOS: "1"\n  NPM_CONFIG_REGISTRY: https://registry.example.com/\n'), causa: /ci\.yml: env\.NPM_CONFIG_REGISTRY configura npm por la puerta de atrás/ },
  {
    id: "N65",
    regla: "orden.etiqueta",
    que: "la etiqueta por plantilla",
    aplicar: texto(FLUJO, '--etiqueta "$GITHUB_REF_NAME"', '--etiqueta "${{ github.ref_name }}"'),
    causa: /la compara con «[^»]*\$\{\{ github\.ref_name \}\}[^»]*».*una plantilla \$\{\{ \}\} se pega en el guion/,
  },
  { id: "N66", regla: "orden.main", que: "sin mirar si está en main", aplicar: texto(FLUJO, `      - run: ${PASO_MAIN}\n`, ""), causa: /no depende de ningún job que compruebe que el commit está en main/ },
  { id: "N67", regla: "orden.main", que: "main sobre un clon superficial", aplicar: texto(FLUJO, "          fetch-depth: 0\n", "          fetch-depth: 1\n"), causa: /el job etiqueta mira si el commit está en main sobre un clon superficial/ },
  { id: "N68", regla: "disparo.eventos", que: "on: push, sin mapa", aplicar: texto(FLUJO, 'on:\n  push:\n    tags:\n      - "v[0-9]+.[0-9]+.[0-9]+"\n', "on: push\n"), causa: /on es "push" y tiene que ser un mapa con push/ },
  { id: "N69", regla: "disparo.eventos", que: "on vacío", aplicar: texto(FLUJO, 'on:\n  push:\n    tags:\n      - "v[0-9]+.[0-9]+.[0-9]+"\n', "on: {}\n"), causa: /no se dispara por push de etiqueta/ },
  { id: "N70", regla: "disparo.push", que: "push sin tags", aplicar: texto(FLUJO, '  push:\n    tags:\n      - "v[0-9]+.[0-9]+.[0-9]+"\n', "  push:\n"), causa: /push sin lista de tags/ },
  { id: "N71", regla: "permisos.arriba", que: "arriba read-all", aplicar: texto(FLUJO, "\npermissions: {}\n", "\npermissions: read-all\n"), causa: /permissions arriba es "read-all" y tiene que ser \{\}/ },
  { id: "N72", regla: "permisos.job", que: "etiqueta write-all", aplicar: texto(FLUJO, ETIQUETA_JOB, "  etiqueta:\n    runs-on: ubuntu-latest\n    permissions: write-all\n"), causa: /el job etiqueta tiene permissions: "write-all"; se escriben uno a uno/ },
  { id: "N73", regla: "orden.atajo", que: "publicar aunque falle", aplicar: texto(FLUJO, "    environment: npm\n", "    environment: npm\n    continue-on-error: true\n"), causa: /el job publicar lleva continue-on-error: true/ },
  { id: "N74", regla: "pruebas.llamable", que: "ci.yml borrado", aplicar: (e) => void delete e.flujos[CI], causa: /no existe \.github\/workflows\/ci\.yml/ },
  { id: "N75", regla: "pruebas.paquetes", que: "la regla sin pruebas", aplicar: texto(CI, "        working-directory: packages/eslint-plugin-ancla\n", "        working-directory: packages\n"), causa: /ningún job de ci\.yml corre npm test en packages\/eslint-plugin-ancla/ },
  { id: "N76", regla: "pruebas.disparo", que: "ci.yml también con etiquetas", aplicar: texto(CI, '    branches: ["**"]\n', '    branches: ["**"]\n    tags: ["v*"]\n'), causa: /ci\.yml se dispara por push con \{"branches":\["\*\*"\],"tags":\["v\*"\]\}.*dos veces/ },
  { id: "N77", regla: "publicar.checkout", que: "publicar sin checkout", aplicar: texto(FLUJO, PUB_CHECKOUT, `    steps:\n      - uses: ${SETUP}\n        with:\n          # Exact`), causa: /el checkout del job publicar deja el token/ },
  {
    id: "N78",
    regla: "publicar.previo",
    que: "el entorno, antes de setup-node",
    aplicar: (e, id) => {
      texto(FLUJO, PASO_ENTORNO_YML, "")(e, id);
      texto(FLUJO, `          persist-credentials: false\n      - uses: ${SETUP}\n        with:\n          # Exact`, `          persist-credentials: false\n${PASO_ENTORNO_YML}      - uses: ${SETUP}\n        with:\n          # Exact`)(e, id);
    },
    causa: /comprueba el entorno antes de setup-node/,
  },
  // publicar.forma, one extra thing at a time. Every one of these was green
  // before the shape was closed (a list of what may not be there).
  { id: "N79", regla: "publicar.forma", que: "shell propio al preparar", aplicar: texto(FLUJO, PASO_ANCLA, `${PASO_ANCLA}        shell: bash --noprofile --norc -e {0}\n`), causa: /el paso 4 del job publicar \(una preparación\) lleva shell: /, },
  { id: "N80", regla: "publicar.forma", que: "NODE_OPTIONS al preparar", aplicar: texto(FLUJO, PASO_ANCLA, `${PASO_ANCLA}        env:\n          NODE_OPTIONS: --require ./x.cjs\n`), causa: /el paso 4 del job publicar \(una preparación\) lleva env: \{"NODE_OPTIONS"/ },
  { id: "N81", regla: "publicar.forma", que: "máquina propia", aplicar: texto(FLUJO, CABEZA_PUBLICAR, CABEZA_PUBLICAR.replace("ubuntu-latest", "self-hosted")), causa: /el job publicar corre en "self-hosted"/ },
  { id: "N82", regla: "publicar.forma", que: "un contenedor", aplicar: texto(FLUJO, "    environment: npm\n", "    environment: npm\n    container: node:latest\n"), causa: /el job publicar lleva container: "node:latest"/ },
  {
    id: "N83",
    regla: "publicar.forma",
    que: "una acción de terceros, fijada",
    aplicar: texto(FLUJO, PASO_ENTORNO_YML, `${PASO_ENTORNO_YML}      - uses: tercero/accion@0123456789abcdef0123456789abcdef01234567 # v1.0.0\n`),
    causa: /el paso 4 del job publicar no es ninguno de los que puede llevar .*tercero\/accion/,
  },
  { id: "N84", regla: "publicar.forma", que: "un npx de más", aplicar: texto(FLUJO, PASO_ENTORNO_YML, `${PASO_ENTORNO_YML}      - run: npx --yes cualquier-cosa@latest\n`), causa: /el paso 4 del job publicar no es ninguno .*npx --yes cualquier-cosa/ },
  {
    id: "N85",
    regla: "publicar.forma",
    que: "el registro por GITHUB_ENV",
    aplicar: texto(FLUJO, PASO_ENTORNO_YML, `${PASO_ENTORNO_YML}      - run: echo npm_config_registry=https://registry.example.com/ >> "$GITHUB_ENV"\n`),
    causa: /el paso 4 del job publicar no es ninguno .*GITHUB_ENV/,
  },
  { id: "N86", regla: "publicar.forma", que: "NODE_OPTIONS arriba", aplicar: texto(FLUJO, "\npermissions: {}\n", "\npermissions: {}\n\nenv:\n  NODE_OPTIONS: --require ./x.cjs\n"), causa: /publicar\.yml lleva env arriba/ },
  { id: "N87", regla: "publicar.forma", que: "Node de otro espejo", aplicar: texto(FLUJO, "          node-version: 24.21.0\n", "          node-version: 24.21.0\n          mirror: https://nodejs.example.com/dist\n"), causa: /\(setup-node\) lleva with\.mirror/ },
  { id: "N88", regla: "publicar.forma", que: "entorno como mapa", aplicar: texto(FLUJO, "    environment: npm\n", "    environment:\n      name: npm\n      url: https://example.com\n"), causa: /escribe environment como un mapa \(name, url\)/ },
  { id: "N89", regla: "publicar.forma", que: "shell por defecto arriba", aplicar: texto(FLUJO, "\npermissions: {}\n", "\npermissions: {}\n\ndefaults:\n  run:\n    shell: bash --noprofile --norc -e {0}\n"), causa: /publicar\.yml lleva defaults arriba/ },
  { id: "N90", regla: "publicar.forma", que: "otro setup-node", aplicar: texto(FLUJO, PASO_ENTORNO_YML, `${PASO_ENTORNO_YML}      - uses: ${SETUP}\n        with:\n          node-version: 18.20.8\n`), causa: /el job publicar tiene 2 pasos de setup-node y puede tener uno/ },
];

// null when the sabotage proves what it claims; otherwise, why it does not.
export function juzgarSabotaje(s, entrada, faltas = faltasDePublicacion) {
  const e = structuredClone(entrada);
  s.aplicar(e, s.id);
  if (util.isDeepStrictEqual(e, entrada)) return `el sabotaje ${s.id} no ha cambiado nada: no demostraría nada`;
  const fallos = faltas(e);
  if (fallos.length === 0) return `${s.id}: la guarda no ha caído`;
  const reglas = [...new Set(fallos.map((x) => x.slice(0, x.indexOf(": "))))];
  if (reglas.length !== 1 || reglas[0] !== s.regla) return `${s.id} tenía que tumbar solo ${s.regla}:\n${fallos.join("\n")}`;
  if (!fallos.some((x) => s.causa.test(x))) return `${s.id} tumbó ${s.regla}, pero no por su causa:\n${fallos.join("\n")}`;
  return null;
}

// A sabotage over a base that is already red proves nothing: each one says
// so, pointing at the green test, instead of listing rules that are not its.
function faltasDeLaBase() {
  try {
    return faltasDePublicacion(ENTRADA);
  } catch (err) {
    return [`no se puede leer: ${err.message}`];
  }
}
const BASE = faltasDeLaBase();

for (const s of SABOTAJES) {
  test(`rojo ${s.id} (${s.que}): cae ${s.regla}, sola y por su causa`, () => {
    if (BASE.length) assert.fail(`la base ya está en rojo (lo dice la prueba «verde»), y un sabotaje sobre ella no demuestra nada: ${BASE[0]}`);
    assert.equal(juzgarSabotaje(s, ENTRADA), null);
  });
}

// What cannot fall alone, on purpose, with every rule that falls named and
// each cause checked.
export const CASOS_CONJUNTOS = [
  {
    id: "C01",
    que: "un paquete nuevo en packages/",
    aplicar: (e) => {
      const pkg = structuredClone(e.paquetes.ancla.pkg);
      pkg.name = "otro";
      pkg.repository.directory = "packages/otro";
      pkg.homepage = `https://github.com/${REPO}/tree/main/packages/otro#readme`;
      e.paquetes.otro = { pkg, readme: "npm install --save-dev otro\n" };
    },
    // A new package is also missing from the CI and from the publication.
    reglas: ["paquete.nombre", "pruebas.paquetes", "publicar.paquetes"],
    causas: [
      /^paquete\.nombre: packages\/otro es un paquete nuevo: su nombre va en NOMBRES/,
      /^pruebas\.paquetes: ningún job de ci\.yml corre npm test en packages\/otro$/,
      /^publicar\.paquetes: el job publicar prepara .* y tiene que preparar .*"packages\/otro"/,
    ],
  },
  {
    id: "C02",
    que: "publicar sin esperar al job etiqueta",
    aplicar: texto(FLUJO, "needs: [pruebas, etiqueta]", "needs: [pruebas]"),
    reglas: ["orden.etiqueta", "orden.main"],
    causas: [
      /^orden\.etiqueta: el job publicar no depende de ningún job que compare la etiqueta \("\$GITHUB_REF_NAME"\) con las versiones$/,
      /^orden\.main: el job publicar no depende de ningún job que compruebe que el commit está en main/,
    ],
  },
];

for (const c of CASOS_CONJUNTOS) {
  test(`rojo ${c.id} (${c.que}): caen ${c.reglas.join(", ")}, y cada una por su causa`, () => {
    if (BASE.length) assert.fail(`la base ya está en rojo (lo dice la prueba «verde»): ${BASE[0]}`);
    const e = structuredClone(ENTRADA);
    c.aplicar(e, c.id);
    const fallos = faltasDePublicacion(e);
    assert.deepEqual([...new Set(fallos.map((x) => x.slice(0, x.indexOf(": "))))].sort(), [...c.reglas].sort(), fallos.join("\n"));
    for (const causa of c.causas) assert.ok(fallos.some((x) => causa.test(x)), `${causa} no está entre:\n${fallos.join("\n")}`);
  });
}

// ---- the census of branches: every falta() has been seen falling ----

const FUENTE = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");

// Every line of faltasDePublicacion that calls falta(), with its text.
export function sitiosDeFalta(fuente) {
  const lineas = fuente.split("\n");
  const desde = lineas.findIndex((l) => l.startsWith("export function faltasDePublicacion("));
  const hasta = lineas.findIndex((l, i) => i > desde && l === "}");
  if (desde === -1 || hasta === -1) throw new Error("no se encuentra faltasDePublicacion en el fuente: el censo no sabría qué contar");
  const sitios = [];
  for (let i = desde; i < hasta; i++) if (/\bfalta\("/.test(lineas[i])) sitios.push({ linea: i + 1, texto: lineas[i].trim() });
  return sitios;
}

export function sitiosSinVer(sitios, vistos) {
  return sitios.filter((x) => !vistos.has(x.linea)).map((x) => `línea ${x.linea}: ${x.texto.slice(0, 100)}`);
}

function sitiosVistos(sabotajes, conjuntos) {
  const vistos = new Set();
  for (const s of sabotajes) {
    const e = structuredClone(ENTRADA);
    s.aplicar(e, s.id);
    faltasDePublicacion(e, vistos);
  }
  for (const c of conjuntos) {
    const e = structuredClone(ENTRADA);
    c.aplicar(e, c.id);
    faltasDePublicacion(e, vistos);
  }
  return vistos;
}

test("cada llamada a falta() la ha hecho caer algún sabotaje: todas las ramas, no solo todas las reglas", () => {
  const sitios = sitiosDeFalta(FUENTE);
  assert.ok(sitios.length >= Object.keys(REGLAS).length, `solo se han encontrado ${sitios.length} llamadas a falta(), menos que reglas`);
  const vistos = sitiosVistos(SABOTAJES, CASOS_CONJUNTOS);
  assert.ok(!vistos.has(null), "alguna llamada a falta() no ha dicho su línea: el censo no sabría cuál es");
  assert.deepEqual(sitiosSinVer(sitios, vistos), []);
});

test("el censo de ramas sabe fallar: sin el sabotaje de una rama, la nombra con su línea", () => {
  const sitios = sitiosDeFalta(FUENTE);
  const sinN68 = sitiosVistos(SABOTAJES.filter((s) => s.id !== "N68"), CASOS_CONJUNTOS);
  const faltan = sitiosSinVer(sitios, sinN68);
  assert.equal(faltan.length, 1, faltan.join("\n"));
  assert.match(faltan[0], /^línea \d+: .*falta\("disparo\.eventos", `on es/);
  const sinC01 = sitiosVistos(SABOTAJES, []);
  assert.match(sitiosSinVer(sitios, sinC01).join("\n"), /falta\("paquete\.nombre", `packages\/\$\{d\} es un paquete nuevo/);
  assert.throws(() => sitiosDeFalta("nada que ver\n"), /no se encuentra faltasDePublicacion/);
});

test("el juez de sabotajes sabe fallar: sin cambio, sin caída, con dos reglas y con otra causa", () => {
  const base = { id: "X", regla: "npmrc", que: "prueba", causa: /\.npmrc existe/ };
  const conNpmrc = (e) => void e.npmrc.push("x/.npmrc");
  assert.match(juzgarSabotaje({ ...base, aplicar: () => {} }, ENTRADA), /no ha cambiado nada/);
  assert.match(juzgarSabotaje({ ...base, aplicar: conNpmrc }, ENTRADA, () => []), /la guarda no ha caído/);
  const dos = (e) => {
    conNpmrc(e);
    delete e.raiz.private;
  };
  assert.match(juzgarSabotaje({ ...base, aplicar: dos }, ENTRADA), /tenía que tumbar solo npmrc:\n.*raiz\.privada/s);
  assert.match(juzgarSabotaje({ ...base, aplicar: conNpmrc, causa: /otra cosa/ }, ENTRADA), /no por su causa/);
  assert.equal(juzgarSabotaje({ ...base, aplicar: conNpmrc }, ENTRADA), null);
});

test("cada regla la ha visto caer un sabotaje, y ningún sabotaje apunta a una regla que no existe", () => {
  const vistas = new Set(SABOTAJES.map((s) => s.regla));
  assert.deepEqual(reglasSinSabotaje(REGLAS, SABOTAJES), [], "reglas que nadie ha visto caer");
  assert.deepEqual([...vistas].filter((r) => !Object.hasOwn(REGLAS, r)), [], "sabotajes de reglas que no existen");
  assert.equal(new Set(SABOTAJES.map((s) => s.id)).size, SABOTAJES.length, "ids de sabotaje repetidos");
});

export function reglasSinSabotaje(reglas, sabotajes) {
  const vistas = new Set(sabotajes.map((s) => s.regla));
  return Object.keys(reglas).filter((r) => !vistas.has(r));
}

test("el censo de reglas sabe fallar: una regla nueva que ningún sabotaje ha visto caer se nombra", () => {
  assert.deepEqual(reglasSinSabotaje({ ...REGLAS, "regla.nueva": "x" }, SABOTAJES), ["regla.nueva"]);
  assert.deepEqual(reglasSinSabotaje(REGLAS, SABOTAJES.filter((s) => s.regla !== "npmrc")), ["npmrc"]);
});

// ---- what each tarball carries, measured with npm itself ----

function npmPack(dir) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^npm_/i.test(k)));
  const [cmd, pre] = process.env.npm_execpath ? [process.execPath, [process.env.npm_execpath]] : ["npm", []];
  const r = spawnSync(cmd, [...pre, "pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: dir, encoding: "utf8", env });
  if (r.error) return { error: `${cmd}: ${r.error.code ?? r.error.message}` };
  if (r.status !== 0) return { error: `npm pack salió con ${r.status}: ${r.stderr.trim().split("\n").slice(-3).join(" | ")}` };
  const [info] = JSON.parse(r.stdout);
  return { name: info.name, version: info.version, files: info.files.map((x) => x.path).sort() };
}

export function diferenciasDeTarball(esperado, reales) {
  return { sobran: reales.filter((x) => !esperado.includes(x)), faltan: esperado.filter((x) => !reales.includes(x)) };
}

test("verde: npm pack de cada paquete da exactamente sus ficheros, con su nombre y su versión", (t) => {
  for (const [d, esperado] of Object.entries(EMPAQUETADO)) {
    const r = npmPack(path.join(RAIZ, "packages", d));
    if (r.error) return parcial(t, `npm pack no se ha podido ejecutar (${r.error}): el contenido del tarball no se ha mirado`);
    assert.equal(r.name, NOMBRES[d]);
    assert.equal(r.version, ENTRADA.paquetes[d].pkg.version);
    assert.deepEqual(diferenciasDeTarball(esperado, r.files), { sobran: [], faltan: [] }, `packages/${d}`);
  }
});

test("rojo: en una copia de ancla, las pruebas en files sobran y un fichero quitado falta, cada uno con su nombre", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ancla-pack-"));
  try {
    fs.cpSync(path.join(RAIZ, "packages", "ancla"), dir, { recursive: true, filter: (s) => !s.includes("node_modules") });
    const original = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    const escribir = (p) => fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(p, null, 2));

    escribir({ ...original, files: [...original.files, "test"] });
    const con = npmPack(dir);
    if (con.error) return parcial(t, `npm pack no se ha podido ejecutar (${con.error}): el rojo del tarball no se ha mirado`);
    const d1 = diferenciasDeTarball(EMPAQUETADO.ancla, con.files);
    assert.deepEqual(d1.faltan, []);
    assert.ok(d1.sobran.includes("test/_romper.mjs") && d1.sobran.every((x) => x.startsWith("test/")), JSON.stringify(d1));

    escribir({ ...original, files: original.files.filter((x) => x !== "ancla.mjs") });
    const sin = npmPack(dir);
    if (sin.error) return parcial(t, `npm pack no se ha podido ejecutar (${sin.error}): el rojo del fichero que falta no se ha mirado`);
    assert.deepEqual(diferenciasDeTarball(EMPAQUETADO.ancla, sin.files), { sobran: [], faltan: ["ancla.mjs"] });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- the reader of YAML, in both colours ----

test("el lector de YAML lee lo que usan los flujos, con los valores como texto", () => {
  const y = [
    "# comentario",
    "name: x # al final",
    "on:",
    "  push:",
    "    tags:",
    '      - "v1"',
    "  workflow_call:",
    "permissions: {}",
    "jobs:",
    "  a:",
    "    needs: [b, 'c']",
    "    steps:",
    "      - uses: o/r@abc # v1",
    "        with:",
    "          n: 0",
    "      - { run: echo, working-directory: d }",
    "    m:",
    "    - uno",
  ].join("\n");
  assert.deepEqual(leerYaml(y), {
    name: "x",
    on: { push: { tags: ["v1"] }, workflow_call: null },
    permissions: {},
    jobs: { a: { needs: ["b", "c"], steps: [{ uses: "o/r@abc", with: { n: "0" } }, { run: "echo", "working-directory": "d" }], m: ["uno"] } },
  });
});

test("el lector de YAML se niega, nombrando la causa, a todo lo que no sabe leer", () => {
  const casos = [
    ["a:\n\tb: 1", /tabulador/],
    ["a: &x 1", /al principio de un valor/],
    ["a: *x", /al principio de un valor/],
    ["a: !!str 1", /al principio de un valor/],
    ["a: |\n  b", /escalar de bloque/],
    ["---\na: 1", /marcador de documento/],
    ["a: 1\na: 2", /clave repetida «a»/],
    ["a: b: c", /valor plano con «: » dentro/],
    ['a: "b', /comilla doble sin cerrar/],
    ["a: [b, c", /colección de flujo sin cerrar/],
    ['a: "b" c', /sobra texto detrás del valor/],
    ["? a\n: b", /clave compleja/],
    ["a: b\n  c", /línea más sangrada detrás de un valor completo/],
    ["a: { b: 1, b: 2 }", /clave repetida «b»/],
    ["- - a", /secuencia dentro de secuencia/],
  ];
  for (const [y, causa] of casos) {
    assert.throws(() => leerYaml(y), (err) => err instanceof YamlFuera && causa.test(err.message), `no se negó bien a ${JSON.stringify(y)}`);
  }
});

// ---- scripts/antes-de-publicar.mjs, in both colours ----

const VERSIONES = () => {
  const v = { "package.json": ENTRADA.raiz.version };
  for (const [d, { pkg }] of Object.entries(ENTRADA.paquetes)) v[`packages/${d}/package.json`] = pkg.version;
  return v;
};
const CHANGELOG = leer("CHANGELOG.md");

test("verde: la etiqueta de la versión de hoy cuadra con los tres package.json y el CHANGELOG", () => {
  assert.deepEqual(versionesQueNoCuadran(`v${ENTRADA.raiz.version}`, { versiones: VERSIONES(), changelog: CHANGELOG }), []);
});

test("rojo: una etiqueta mal formada, un package.json que no cuadra, un CHANGELOG que no cuadra, cada uno solo", () => {
  const v = ENTRADA.raiz.version;
  for (const mala of [v, `v${v}-rc.1`, `v${v}.0`, "v01.1.0", "", "v1.2"]) {
    assert.deepEqual(versionesQueNoCuadran(mala, { versiones: VERSIONES(), changelog: CHANGELOG }), [`la etiqueta ${JSON.stringify(mala)} no tiene la forma vX.Y.Z`]);
  }
  const otra = { ...VERSIONES(), "packages/ancla/package.json": "9.9.9" };
  assert.deepEqual(versionesQueNoCuadran(`v${v}`, { versiones: otra, changelog: CHANGELOG }), [`la etiqueta v${v} dice ${v} y packages/ancla/package.json dice 9.9.9`]);
  const cl = CHANGELOG.replace(`## [${v}]`, "## [9.9.9]");
  assert.notEqual(cl, CHANGELOG, "el sabotaje del CHANGELOG no se aplicó");
  assert.deepEqual(versionesQueNoCuadran(`v${v}`, { versiones: VERSIONES(), changelog: cl }), [`la etiqueta v${v} dice ${v} y la primera entrada del CHANGELOG dice 9.9.9`]);
  assert.deepEqual(versionesQueNoCuadran(`v${v}`, { versiones: VERSIONES(), changelog: "# Changelog\n" }), ["el CHANGELOG no tiene ninguna entrada ## [x.y.z]"]);
  assert.deepEqual(versionesQueNoCuadran(`v${v}`, { versiones: {}, changelog: CHANGELOG }), ["no hay ningún package.json con el que comparar la etiqueta"]);
});

const ENTORNO_BUENO = { GITHUB_ACTIONS: "true", ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.example.com/", ACTIONS_ID_TOKEN_REQUEST_TOKEN: "t" };

test("el entorno: verde con id-token y npm suficiente (también justo en el mínimo), rojo por cada falta, sola", () => {
  // A fabricated environment: the real green of --entorno is only seen in the
  // publishing job itself, the first time it runs.
  for (const npm of [NPM_MINIMO, "11.19.0", "12.1.0"]) assert.deepEqual(entornoQueFalla({ npm, env: ENTORNO_BUENO }), [], npm);
  const rojos = [
    [{ npm: "11.14.9", env: ENTORNO_BUENO }, /npm 11\.14\.9 no sabe preparar versiones/],
    [{ npm: "10.9.9", env: ENTORNO_BUENO }, /npm 10\.9\.9 no sabe preparar versiones/],
    [{ npm: "(no se pudo ejecutar: ENOENT)", env: ENTORNO_BUENO }, /no se sabe qué npm hay/],
    [{ npm: "11.19.0", env: { ...ENTORNO_BUENO, GITHUB_ACTIONS: undefined } }, /no es GitHub Actions/],
    [{ npm: "11.19.0", env: { ...ENTORNO_BUENO, ACTIONS_ID_TOKEN_REQUEST_URL: undefined } }, /no tiene id-token: write/],
    [{ npm: "11.19.0", env: { ...ENTORNO_BUENO, ACTIONS_ID_TOKEN_REQUEST_TOKEN: "" } }, /no tiene id-token: write/],
    [{ npm: "11.19.0", env: { ...ENTORNO_BUENO, NODE_AUTH_TOKEN: "x" } }, /token de npm en el entorno \(NODE_AUTH_TOKEN\)/],
    [{ npm: "11.19.0", env: { ...ENTORNO_BUENO, npm_config__authToken: "x" } }, /token de npm en el entorno \(npm_config__authToken\)/],
    [{ npm: "11.19.0", env: { ...ENTORNO_BUENO, NPM_ID_TOKEN: "x" } }, /token de npm en el entorno \(NPM_ID_TOKEN\)/],
  ];
  for (const [entrada, causa] of rojos) {
    const f = entornoQueFalla(entrada);
    assert.equal(f.length, 1, `${JSON.stringify(entrada)} tenía que dar un solo rojo:\n${f.join("\n")}`);
    assert.match(f[0], causa);
  }
  assert.deepEqual(entornoQueFalla({ npm: "11.19.0", env: { ...ENTORNO_BUENO, NODE_AUTH_TOKEN: "" } }), [], "una variable vacía no es un token");
});

// --en-main: every branch with a fabricated git, then both colours with a real
// repository built in a temporary folder.
test("en main: verde si el commit está en origin/main, y un rojo por cada falta, cada uno con su causa", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const git = (respuestas) => (args) => respuestas[args[0] === "merge-base" ? "merge" : args.includes("HEAD^{commit}") ? "head" : "main"];
  const bien = { head: { status: 0, stdout: `${sha}\n`, stderr: "" }, main: { status: 0, stdout: `${sha}\n`, stderr: "" }, merge: { status: 0, stdout: "", stderr: "" } };
  assert.deepEqual(enMainQueFalla({ git: git(bien) }), []);
  const rojos = [
    [{ ...bien, head: { error: Object.assign(new Error("x"), { code: "ENOENT" }) } }, /^no se pudo ejecutar git \(ENOENT\)$/],
    [{ ...bien, head: { status: 128, stdout: "", stderr: "fatal: not a git repository" } }, /^git no sabe qué commit es HEAD \(fatal: not a git repository\)$/],
    [{ ...bien, main: { status: 1, stdout: "", stderr: "" } }, /^no hay origin\/main en este clon: el checkout necesita fetch-depth: 0/],
    [{ ...bien, merge: { status: 1, stdout: "", stderr: "" } }, /^el commit 0123456789ab no está en origin\/main: la etiqueta se puso en una rama sin integrar/],
    [{ ...bien, merge: { status: 128, stdout: "", stderr: "fatal: bad object" } }, /^git merge-base --is-ancestor salió con 128: fatal: bad object$/],
  ];
  const textos = new Set();
  for (const [r, causa] of rojos) {
    const f = enMainQueFalla({ git: git(r) });
    assert.equal(f.length, 1, f.join("\n"));
    assert.match(f[0], causa);
    textos.add(f[0]);
  }
  assert.equal(textos.size, rojos.length, "dos faltas distintas dicen lo mismo");
});

test("en main, con un git de verdad: verde sobre un commit de main, rojo sobre uno fuera y sobre un clon sin origin/main", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "en-main-"));
  try {
    const g = gitEn(dir);
    const hacer = (...args) => {
      const r = g(args);
      if (r.error || r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.error?.code ?? r.stderr}`);
      return r.stdout.trim();
    };
    const probar = g(["--version"]);
    if (probar.error) return parcial(t, `no se ha podido ejecutar git (${probar.error.code}): --en-main no se ha mirado con un repositorio de verdad`);
    hacer("init", "-q", "-b", "main");
    const id = ["-c", "user.name=prueba", "-c", "user.email=prueba@example.com", "-c", "commit.gpgsign=false"];
    hacer(...id, "commit", "-q", "--no-verify", "--allow-empty", "-m", "uno");
    assert.match(enMainQueFalla({ git: g })[0] ?? "", /no hay origin\/main en este clon/);
    hacer("update-ref", "refs/remotes/origin/main", "HEAD");
    assert.deepEqual(enMainQueFalla({ git: g }), []);
    hacer("checkout", "-q", "-b", "rama");
    hacer(...id, "commit", "-q", "--no-verify", "--allow-empty", "-m", "dos");
    const f = enMainQueFalla({ git: g });
    assert.equal(f.length, 1, f.join("\n"));
    assert.match(f[0], new RegExp(`^el commit ${hacer("rev-parse", "HEAD").slice(0, 12)} no está en origin/main`));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("la orden de verdad: --etiqueta sale 0 con la versión de hoy y 1 con otra; mal usada, 2", () => {
  const script = path.join(RAIZ, "scripts", "antes-de-publicar.mjs");
  const bien = spawnSync(process.execPath, [script, "--etiqueta", `v${ENTRADA.raiz.version}`], { encoding: "utf8" });
  assert.equal(bien.status, 0, bien.stdout + bien.stderr);
  assert.match(bien.stdout, /^VERDE: la etiqueta v\d+\.\d+\.\d+ coincide con package\.json, packages\/ancla\/package\.json, packages\/eslint-plugin-ancla\/package\.json y con el CHANGELOG$/m);
  const mal = spawnSync(process.execPath, [script, "--etiqueta", "v9.9.9"], { encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "" } });
  assert.equal(mal.status, 1, mal.stdout + mal.stderr);
  assert.equal(mal.stdout.match(/^ROJO: /gm)?.length, 4, mal.stdout);
  const fuera = spawnSync(process.execPath, [script, "--entorno"], { encoding: "utf8", env: { PATH: process.env.PATH } });
  assert.equal(fuera.status, 1, fuera.stdout + fuera.stderr);
  assert.match(fuera.stdout, /^ROJO: no es GitHub Actions/m);
  assert.equal(spawnSync(process.execPath, [script, "--nada"], { encoding: "utf8" }).status, 2);
});
