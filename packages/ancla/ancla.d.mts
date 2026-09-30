// SPDX-License-Identifier: MIT
export interface Opciones {
  quien?: string;
  unica?: boolean;
}

export declare function desde(texto: string, ancla: string, opciones?: string | Opciones): string;
export declare function entre(texto: string, abre: string, cierra: string, opciones?: string | Opciones): string;
export declare function cerca(texto: string, ancla: string, radio: number, opciones?: string | Opciones): string;

export declare class AnclaPerdida extends Error {
  private constructor();
  readonly name: "AnclaPerdida";
  readonly code: "ANCLA_PERDIDA";
  readonly ancla: string;
  readonly papel: "ancla" | "abre" | "cierra";
  readonly quien: string | undefined;
}

export declare class AnclaRepetida extends Error {
  private constructor();
  readonly name: "AnclaRepetida";
  readonly code: "ANCLA_REPETIDA";
  readonly ancla: string;
  readonly posiciones: readonly [number, number];
  readonly quien: string | undefined;
}
