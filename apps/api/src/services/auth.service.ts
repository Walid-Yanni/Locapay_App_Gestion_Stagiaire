import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.isActive) throw new Error("Identifiants invalides");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Identifiants invalides");

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" },
  );
  const refreshToken = jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "30d" },
  );

  const { password: _password, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
}
