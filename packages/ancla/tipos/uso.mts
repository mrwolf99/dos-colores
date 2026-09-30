// SPDX-License-Identifier: MIT
// Types through the ESM door: the "import" condition of the package's own
// exports map, reached by its name (self-reference), not by a relative path.
// This folder is outside test/ on purpose: `node --test` with no arguments
// would otherwise try to run these files as tests.
import { desde, entre, cerca, AnclaPerdida, AnclaRepetida, type Opciones } from "@mrwolf99/ancla";

const t = "texto de prueba";
const o: Opciones = { quien: "uso.mts", unica: true };
const a: string = desde(t, "texto", "uso.mts");
const b: string = entre(t, "texto", "prueba", o);
const c: string = cerca(t, "de", 3);

try {
  desde(t, "no está");
} catch (e) {
  if (e instanceof AnclaPerdida) {
    const papel: "ancla" | "abre" | "cierra" = e.papel;
    const code: "ANCLA_PERDIDA" = e.code;
    const ancla: string = e.ancla;
    const quien: string | undefined = e.quien;
    void [papel, code, ancla, quien];
  }
  if (e instanceof AnclaRepetida) {
    const [p, q]: readonly [number, number] = e.posiciones;
    const papel: "ancla" | "abre" = e.papel;
    const code: "ANCLA_REPETIDA" = e.code;
    const ancla: string = e.ancla;
    const quien: string | undefined = e.quien;
    void [p, q, papel, code, ancla, quien];
  }
}

// @ts-expect-error: the radius is a number. If the types degenerated to any,
// this directive would be unused and tsc would go red.
cerca(t, "a", "900");

// @ts-expect-error: an unknown option key is a type error, as it is a runtime error.
desde(t, "a", { unique: true });

// The error classes are not meant to be built by hand. This does not depend on
// which error `new` would give: a constructor that became public, with any
// parameters, makes the type `true` and the assignment below red.
type Construible<C> = C extends new (...args: never[]) => unknown ? true : false;
const perdidaNoConstruible: Construible<typeof AnclaPerdida> = false;
const repetidaNoConstruible: Construible<typeof AnclaRepetida> = false;

void [a, b, c, perdidaNoConstruible, repetidaNoConstruible];
