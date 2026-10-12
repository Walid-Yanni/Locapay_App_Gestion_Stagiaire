import { prisma } from "../lib/prisma.js";

export async function listActiveTutors() {
  // Sélection explicite et minimale : ni hash ni e-mail ne sortent de ce service.
  return prisma.user.findMany({
    where: { role: "TUTEUR", isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
