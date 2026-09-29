// SPDX-License-Identifier: MIT
// ESM facade over the single implementation, so that both module systems share
// one instance and `instanceof` gives the same answer through either door.
import m from "./ancla.cjs";

export const { desde, entre, cerca, AnclaPerdida, AnclaRepetida } = m;
