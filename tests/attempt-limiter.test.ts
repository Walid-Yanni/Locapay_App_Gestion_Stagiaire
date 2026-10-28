// Limiteur de tentatives : consommation à l'arrivée, remise à zéro sur succès, fenêtre, isolation par clé.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { createAttemptLimiter } from "../apps/api/src/lib/attempt-limiter.js";

function essai(limiter: ReturnType<typeof createAttemptLimiter>, ip: string, statut: number) {
  const res = new EventEmitter() as EventEmitter & { statusCode: number; headers: Record<string, string>; body?: unknown };
  res.statusCode = 200;
  res.headers = {};
  const api = res as unknown as {
    setHeader(k: string, v: string): void;
    status(code: number): typeof api;
    json(body: unknown): void;
  };
  api.setHeader = (k, v) => { res.headers[k] = v; };
  api.status = (code) => { res.statusCode = code; return api; };
  api.json = (body) => { res.body = body; };
  let passe = false;
  limiter.middleware({ ip, body: {} } as never, res as never, () => { passe = true; });
  if (passe) {
    res.statusCode = statut;
    res.emit("finish");
  }
  return { passe, res };
}

test("la (max+1)-ième tentative est refusée en 429 avec Retry-After", () => {
  let t = 0;
  const l = createAttemptLimiter({ max: 3, windowMs: 1000, message: "stop", now: () => t });
  for (let i = 0; i < 3; i += 1) assert.equal(essai(l, "a", 401).passe, true);
  const bloque = essai(l, "a", 401);
  assert.equal(bloque.passe, false);
  assert.equal(bloque.res.statusCode, 429);
  assert.equal(bloque.res.headers["Retry-After"], "1");
  assert.deepEqual(bloque.res.body, { message: "stop" });
});

test("une autre clé n'est pas touchée, et la fenêtre expirée rouvre l'accès", () => {
  let t = 0;
  const l = createAttemptLimiter({ max: 2, windowMs: 1000, message: "x", now: () => t });
  essai(l, "a", 401); essai(l, "a", 401);
  assert.equal(essai(l, "a", 401).passe, false);
  assert.equal(essai(l, "b", 401).passe, true);
  t = 1001;
  assert.equal(essai(l, "a", 401).passe, true);
});

test("un succès remet le compteur à zéro", () => {
  const l = createAttemptLimiter({ max: 3, windowMs: 1000, message: "x", now: () => 0 });
  essai(l, "c", 401); essai(l, "c", 401);
  assert.equal(essai(l, "c", 200).passe, true);
  for (let i = 0; i < 3; i += 1) assert.equal(essai(l, "c", 401).passe, true);
  assert.equal(essai(l, "c", 401).passe, false);
});

test("une rafale arrivée avant toute réponse ne dépasse pas la limite", () => {
  const l = createAttemptLimiter({ max: 3, windowMs: 1000, message: "x", now: () => 0 });
  let passes = 0;
  for (let i = 0; i < 10; i += 1) {
    const res = new EventEmitter() as unknown as { setHeader(): void; status(): unknown; json(): void };
    res.setHeader = () => {}; res.status = () => res; res.json = () => {};
    l.middleware({ ip: "z" } as never, res as never, () => { passes += 1; });
  }
  assert.equal(passes, 3);
});
