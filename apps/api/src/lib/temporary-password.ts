import { randomInt } from "node:crypto";

// Alphabet sans caractères ambigus à la lecture : ni I, ni O (majuscules), ni l (minuscule),
// ni 0, ni 1. 24 majuscules + 25 minuscules + 8 chiffres = 57 caractères.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const LENGTH = 12;

/** Mot de passe temporaire de 12 caractères ; randomInt tire sans biais de modulo. */
export function generateTemporaryPassword(): string {
  let password = "";
  for (let i = 0; i < LENGTH; i += 1) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}
