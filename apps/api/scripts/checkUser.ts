import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

(async function main() {
  console.log('DATABASE_URL=', process.env.DATABASE_URL);
  const u = await prisma.user.findUnique({ where: { email: "admin.rh@locapay.bj" } });
  console.log("user:", u ? { id: u.id, email: u.email, isActive: u.isActive, role: u.role } : null);
  if (u) {
    const ok = await bcrypt.compare("Locapay2026!", u.password);
    console.log("passwordMatches:", ok);
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
