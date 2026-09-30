// SPDX-License-Identifier: MIT
// The cleanup, seen in both colours, without ever printing a private term.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { leerLista, rutaLista, mirarTexto, mirarArbol, mirarHistoria } from "../scripts/limpieza.mjs";

const require = createRequire(import.meta.url);
const { parcial } = require("./_parcial.cjs");

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(RAIZ, "scripts", "limpieza.mjs");
const RUTA = rutaLista(RAIZ);
const LISTA = RUTA ? leerLista(RUTA) : null;

// The one exemption from DOS_COLORES_SIN_SALTOS, with its reason next to it.
const EXENCION =
  process.env.GITHUB_ACTIONS === "true"
    ? { exento: "la lista privada no viaja con el repositorio, así que en CI no existe nunca; el aviso sale como ::warning:: y en el resumen del paso" }
    : undefined;
const SIN_LISTA = "sin lista privada de términos en <git-common-dir>/info/terminos-prohibidos: la parte privada de la limpieza no se ha mirado";

// Built from pieces so that this file does not contain what it looks for.
const RUTA_FALSA = "/" + "Users" + "/alguien/proyecto";
const CORREO_FALSO = "alguien" + "@" + "dominio.es";

function temporal(prefijo) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefijo));
}

test("verde: el árbol real no tiene rutas de usuario ni correos (patrones genéricos)", () => {
  const { hallazgos, ficheros } = mirarArbol(RAIZ, null);
  assert.ok(ficheros >= 10, `solo se han mirado ${ficheros} ficheros: ¿se está mirando el sitio correcto?`);
  assert.deepEqual(hallazgos, []);
});

test("rojo: una ruta de usuario y un correo cualquiera se ven, cada uno con su nombre", () => {
  assert.deepEqual(mirarTexto(`ver ${RUTA_FALSA}`, null).map((h) => h.patron), ["ruta de usuario absoluta"]);
  assert.deepEqual(mirarTexto(`escribe a ${CORREO_FALSO}`, null).map((h) => h.patron), ["correo que no es noreply ni de ejemplo"]);
});

test("verde: el noreply y los dominios de ejemplo no son una fuga", () => {
  const permitidos = ["12345+alguien@users.noreply.github.com", "noreply@sitio.org", "cliente@tienda.test", "a@example.com"];
  assert.deepEqual(mirarTexto(permitidos.join(" "), null), []);
});

test("la lista privada existe, no está vacía y empieza por un literal", (t) => {
  if (LISTA === null) return parcial(t, SIN_LISTA, EXENCION);
  assert.ok(LISTA.terminos.length > 0, "la lista privada está vacía: una limpieza sin términos no mide nada");
  assert.ok(LISTA.terminos[0].literal, "el primer término útil tiene que ser un literal: es el que se usa para ver el rojo");
});

test("verde: el árbol real no contiene ningún término de la lista privada", (t) => {
  if (LISTA === null) return parcial(t, SIN_LISTA, EXENCION);
  const { hallazgos } = mirarArbol(RAIZ, LISTA);
  assert.deepEqual(hallazgos.map((h) => `${h.fichero}:${h.linea}: ${h.patron}`), []);
});

test("rojo: el primer término de la lista, metido en un texto, se ve (y no se imprime)", (t) => {
  if (LISTA === null) return parcial(t, SIN_LISTA, EXENCION);
  const termino = LISTA.terminos[0].literal;
  const sucio = mirarTexto(`un texto con ${termino.toUpperCase()} en medio`, LISTA).map((h) => h.patron);
  assert.ok(sucio.includes("término privado nº 1"), "el primer término de la lista no se ve en un texto que lo contiene");
  assert.deepEqual(mirarTexto("un texto que no contiene nada de eso", LISTA), []);
});

test("la orden de verdad: sale 1 con un hallazgo, 0 sobre el árbol real, 2 si se usa mal", () => {
  const dir = temporal("limpieza-");
  try {
    fs.writeFileSync(path.join(dir, "nota.md"), `ver ${RUTA_FALSA}\n`);
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^ROJO: nota\.md:1: ruta de usuario absoluta$/m);
    assert.match(r.stdout, /^PARCIAL: sin lista privada/m, "fuera de git no hay lista, y eso se dice");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const v = spawnSync(process.execPath, [SCRIPT, RAIZ], { encoding: "utf8" });
  assert.equal(v.status, 0, v.stdout + v.stderr);
  const u = spawnSync(process.execPath, [SCRIPT, "--no-existe"], { encoding: "utf8" });
  assert.equal(u.status, 2, u.stdout + u.stderr);
});

test("la historia: lo que se borró del árbol sigue en los commits, y se ve", () => {
  const dir = temporal("limpieza-historia-");
  const git = (...a) =>
    execFileSync("git", ["-c", "user.name=Prueba", "-c", "user.email=prueba@repo.test", "-c", "commit.gpgsign=false", ...a], {
      cwd: dir,
      stdio: ["ignore", "pipe", "pipe"],
    });
  try {
    git("init", "-q");
    fs.writeFileSync(path.join(dir, "nota.md"), `ver ${RUTA_FALSA}\n`);
    git("add", "nota.md");
    git("commit", "-q", "-m", "con la fuga");
    fs.writeFileSync(path.join(dir, "nota.md"), "limpio\n");
    git("commit", "-q", "-am", "sin la fuga");
    assert.deepEqual(mirarArbol(dir, null).hallazgos, [], "el árbol ya está limpio");
    const h = mirarHistoria(dir, null);
    assert.equal(h.commits, 2);
    assert.ok(h.hallazgos.some((x) => x.patron === "ruta de usuario absoluta"), "la ruta sigue en la historia y no se ha visto");
    const r = spawnSync(process.execPath, [SCRIPT, dir, "--historia"], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^ROJO: historia:[0-9a-f]{7}: ruta de usuario absoluta$/m);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("la historia: lo que entra solo por una fusión también se ve", () => {
  const dir = temporal("limpieza-fusion-");
  const git = (...a) =>
    execFileSync("git", ["-c", "user.name=Prueba", "-c", "user.email=prueba@repo.test", "-c", "commit.gpgsign=false", ...a], {
      cwd: dir,
      stdio: ["ignore", "pipe", "pipe"],
    });
  try {
    git("init", "-q", "-b", "principal");
    fs.writeFileSync(path.join(dir, "a.md"), "a\n");
    git("add", "a.md");
    git("commit", "-q", "-m", "base");
    git("checkout", "-q", "-b", "rama");
    fs.writeFileSync(path.join(dir, "b.md"), "b\n");
    git("add", "b.md");
    git("commit", "-q", "-m", "rama");
    git("checkout", "-q", "principal");
    fs.writeFileSync(path.join(dir, "c.md"), "c\n");
    git("add", "c.md");
    git("commit", "-q", "-m", "principal");
    git("merge", "-q", "--no-ff", "--no-commit", "rama");
    // The leak is written in the merge itself: neither parent has it.
    fs.writeFileSync(path.join(dir, "d.md"), `ver ${RUTA_FALSA}\n`);
    git("add", "d.md");
    git("commit", "-q", "-m", "fusión");
    // The file stays: deleting it would put the line back in the history as a
    // removed line of an ordinary commit, and the case would pass without -m.
    const h = mirarHistoria(dir, null);
    assert.ok(
      h.hallazgos.some((x) => x.patron === "ruta de usuario absoluta"),
      "la ruta que entró en la fusión no se ha visto en la historia",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
