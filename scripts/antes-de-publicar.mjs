#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// The two checks that .github/workflows/publicar.yml runs before anything is
// sent to npm. Each one prints one ROJO line per fault, naming it.
//
//   node scripts/antes-de-publicar.mjs --etiqueta vX.Y.Z
//       the tag, the three package.json and the first entry of the CHANGELOG
//       say the same version.
//   node scripts/antes-de-publicar.mjs --en-main
//       the commit being published (HEAD) is in origin/main: a tag put on a
//       branch that was never merged stops here. It needs a full clone
//       (fetch-depth: 0), or there is no origin/main to compare with. It only
//       protects against a slip: whoever edits the workflow in the tagged
//       commit can remove it, and that is why PUBLICAR.md repeats it by hand
//       before approving.
//   node scripts/antes-de-publicar.mjs --entorno
//       the job can publish by trusted publishing: it runs in GitHub Actions,
//       it has id-token: write, its npm knows `npm stage` (11.15.0 or later),
//       and there is no npm token in the environment.
//
// Exit code: 0 all good, 1 something is wrong, 2 misuse.

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// `npm stage` exists from npm 11.15.0 on (docs.npmjs.com/staged-publishing).
export const NPM_MINIMO = "11.15.0";

// A tag is exactly vMAJOR.MINOR.PATCH, without leading zeros: the same shape
// that the trigger of publicar.yml accepts, and nothing a prerelease could use.
const ETIQUETA = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function versionDelChangelog(texto) {
  const m = /^## \[(\d+\.\d+\.\d+)\]/m.exec(texto);
  return m ? m[1] : null;
}

// versiones: { "package.json": "0.1.0", "packages/ancla/package.json": … }
export function versionesQueNoCuadran(etiqueta, { versiones, changelog }) {
  if (typeof etiqueta !== "string" || !ETIQUETA.test(etiqueta)) {
    return [`la etiqueta ${JSON.stringify(etiqueta)} no tiene la forma vX.Y.Z`];
  }
  const v = etiqueta.slice(1);
  const fallos = [];
  const entradas = Object.entries(versiones);
  if (entradas.length === 0) fallos.push("no hay ningún package.json con el que comparar la etiqueta");
  for (const [fichero, suya] of entradas) {
    if (suya !== v) fallos.push(`la etiqueta ${etiqueta} dice ${v} y ${fichero} dice ${suya}`);
  }
  const delChangelog = versionDelChangelog(changelog);
  if (delChangelog === null) fallos.push("el CHANGELOG no tiene ninguna entrada ## [x.y.z]");
  else if (delChangelog !== v) fallos.push(`la etiqueta ${etiqueta} dice ${v} y la primera entrada del CHANGELOG dice ${delChangelog}`);
  return fallos;
}

function compararVersiones(a, b) {
  const pa = a.split(/[.+-]/).slice(0, 3).map(Number);
  const pb = b.split(/[.+-]/).slice(0, 3).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  return 0;
}

// Names under which a token could reach npm without anybody writing it in a
// file: the classic ones, any npm_config_* key that talks about auth, and
// NPM_ID_TOKEN, which npm uses INSTEAD of asking GitHub for its own OIDC token
// (lib/utils/oidc.js of npm 11.16.0, line 49).
function esVariableDeToken(nombre) {
  return /^(?:NODE_AUTH_TOKEN|NPM_TOKEN|NPM_ID_TOKEN)$/i.test(nombre) || /^npm_config_.*auth/i.test(nombre);
}

export function entornoQueFalla({ npm, env }) {
  const fallos = [];
  if (env.GITHUB_ACTIONS !== "true") {
    fallos.push("no es GitHub Actions: fuera de ahí npm no hace el intercambio OIDC ni firma la procedencia");
  }
  if (!env.ACTIONS_ID_TOKEN_REQUEST_URL || !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    fallos.push("el job no tiene id-token: write: npm se saltaría el OIDC sin decirlo (solo a nivel silly) y acabaría en ENEEDAUTH");
  }
  if (typeof npm !== "string" || !/^\d+\.\d+\.\d+/.test(npm)) {
    fallos.push(`no se sabe qué npm hay (npm --version dijo ${JSON.stringify(npm)})`);
  } else if (compararVersiones(npm, NPM_MINIMO) < 0) {
    fallos.push(`npm ${npm} no sabe preparar versiones (npm stage): hace falta ${NPM_MINIMO} o posterior`);
  }
  const tokens = Object.keys(env).filter((k) => esVariableDeToken(k) && env[k] !== undefined && env[k] !== "");
  if (tokens.length > 0) {
    fallos.push(`hay un token de npm en el entorno (${tokens.sort().join(", ")}): este flujo publica sin tokens, y uno de sobra es uno que se puede filtrar`);
  }
  return fallos;
}

// git(args) -> { status, stdout, stderr, error }. Injected so that every
// branch can be seen red without a repository built for it.
export function gitEn(raiz) {
  return (args) => {
    const r = spawnSync("git", args, { cwd: raiz, encoding: "utf8" });
    return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
  };
}

const MAIN = "refs/remotes/origin/main";

export function enMainQueFalla({ git }) {
  const cabeza = git(["rev-parse", "--verify", "HEAD^{commit}"]);
  if (cabeza.error) return [`no se pudo ejecutar git (${cabeza.error.code ?? cabeza.error.message})`];
  if (cabeza.status !== 0) return [`git no sabe qué commit es HEAD (${cabeza.stderr.trim() || `salió con ${cabeza.status}`})`];
  const sha = cabeza.stdout.trim();
  const main = git(["rev-parse", "--verify", "--quiet", `${MAIN}^{commit}`]);
  if (main.status !== 0) {
    return ["no hay origin/main en este clon: el checkout necesita fetch-depth: 0 (con uno superficial no se puede saber si el commit está en main)"];
  }
  const r = git(["merge-base", "--is-ancestor", sha, MAIN]);
  if (r.status === 1) {
    return [`el commit ${sha.slice(0, 12)} no está en origin/main: la etiqueta se puso en una rama sin integrar o en un commit que main no tiene`];
  }
  if (r.status !== 0) return [`git merge-base --is-ancestor salió con ${r.status}: ${r.stderr.trim() || "sin mensaje"}`];
  return [];
}

function leerVersiones(raiz) {
  const versiones = {};
  const ficheros = ["package.json"];
  for (const d of fs.readdirSync(path.join(raiz, "packages"), { withFileTypes: true })) {
    if (d.isDirectory()) ficheros.push(`packages/${d.name}/package.json`);
  }
  for (const f of ficheros.sort()) versiones[f] = JSON.parse(fs.readFileSync(path.join(raiz, f), "utf8")).version;
  return versiones;
}

function avisar(fallos, titulo) {
  for (const f of fallos) {
    console.log(`ROJO: ${f}`);
    if (process.env.GITHUB_ACTIONS === "true") console.log(`::error title=${titulo}::${f}`);
  }
}

export function principal(argv, { raiz = RAIZ, env = process.env } = {}) {
  const args = argv.slice(2);
  if (args[0] === "--etiqueta" && args.length === 2) {
    const versiones = leerVersiones(raiz);
    const changelog = fs.readFileSync(path.join(raiz, "CHANGELOG.md"), "utf8");
    const fallos = versionesQueNoCuadran(args[1], { versiones, changelog });
    avisar(fallos, "etiqueta");
    if (fallos.length === 0) {
      console.log(`VERDE: la etiqueta ${args[1]} coincide con ${Object.keys(versiones).join(", ")} y con el CHANGELOG`);
    }
    return fallos.length === 0 ? 0 : 1;
  }
  if (args[0] === "--en-main" && args.length === 1) {
    const git = gitEn(raiz);
    const fallos = enMainQueFalla({ git });
    avisar(fallos, "en-main");
    if (fallos.length === 0) console.log(`VERDE: el commit ${git(["rev-parse", "HEAD"]).stdout.trim()} está en origin/main`);
    return fallos.length === 0 ? 0 : 1;
  }
  if (args[0] === "--entorno" && args.length === 1) {
    let npm;
    try {
      npm = execFileSync("npm", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    } catch (e) {
      npm = `(no se pudo ejecutar: ${e.code ?? e.message})`;
    }
    const fallos = entornoQueFalla({ npm, env });
    avisar(fallos, "entorno");
    if (fallos.length === 0) console.log(`VERDE: GitHub Actions con id-token, npm ${npm} y ningún token de npm en el entorno`);
    return fallos.length === 0 ? 0 : 1;
  }
  console.error("uso: node scripts/antes-de-publicar.mjs --etiqueta vX.Y.Z | --en-main | --entorno");
  return 2;
}

const invocado = process.argv[1] ? pathToFileURL(fs.realpathSync(process.argv[1])).href : "";
if (invocado === import.meta.url) process.exitCode = principal(process.argv);
