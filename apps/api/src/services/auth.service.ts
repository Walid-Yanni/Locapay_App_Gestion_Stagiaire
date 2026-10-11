import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";

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

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");

  // 400 et non 401 : le web ne doit pas confondre cette erreur avec une session expirée.
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new HttpError(400, "Mot de passe actuel incorrect");

  const password = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password, mustChangePassword: false },
  });
}
