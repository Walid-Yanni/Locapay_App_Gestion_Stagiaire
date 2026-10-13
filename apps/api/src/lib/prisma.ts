import { PrismaClient } from "@prisma/client";

// Le hash du mot de passe est exclu de toute lecture de User, relations imbriquées comprises.
// Seul auth.service.ts le réactive explicitement (omit: { password: false }) pour le vérifier.
export const prisma = new PrismaClient({ omit: { user: { password: true } } });
