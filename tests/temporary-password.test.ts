// Mot de passe temporaire : longueur, alphabet sans caractères ambigus, tirage non constant.
import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTemporaryPassword } from "../apps/api/src/lib/temporary-password.js";

test("12 caractères, jamais I, O, l, 0 ni 1", () => {
  for (let i = 0; i < 500; i += 1) {
    assert.match(generateTemporaryPassword(), /^[A-HJ-NP-Za-km-z2-9]{12}$/);
  }
});

test("deux tirages successifs diffèrent (sur 50 tirages, au moins 49 valeurs distinctes)", () => {
  const valeurs = new Set(Array.from({ length: 50 }, () => generateTemporaryPassword()));
  assert.ok(valeurs.size >= 49);
});
