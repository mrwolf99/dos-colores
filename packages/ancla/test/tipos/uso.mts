// SPDX-License-Identifier: MIT
// Types through the ESM door: the "import" condition of the package's own
// exports map, reached by its name (self-reference), not by a relative path.
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
    void papel;
    void code;
  }
  if (e instanceof AnclaRepetida) {
    const [p, q]: readonly [number, number] = e.posiciones;
    void p;
    void q;
  }
}

// @ts-expect-error: the radius is a number. If the types degenerated to any,
// this directive would be unused and tsc would go red.
cerca(t, "a", "900");

// @ts-expect-error: an unknown option key is a type error, as it is a runtime error.
desde(t, "a", { unique: true });

// @ts-expect-error: the error classes are not meant to be built by hand.
new AnclaPerdida();

void a;
void b;
void c;
