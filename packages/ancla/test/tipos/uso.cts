// SPDX-License-Identifier: MIT
// Types through the CommonJS door: the "require" condition of the exports map.
import ancla = require("@mrwolf99/ancla");

const r: string = ancla.desde("abc", "b", { quien: "uso.cts" });

// @ts-expect-error: the radius is a number.
ancla.cerca("abc", "a", "900");

void r;
