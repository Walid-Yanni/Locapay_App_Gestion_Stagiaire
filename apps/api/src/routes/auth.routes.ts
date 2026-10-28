import { Router } from "express";
import { postChangePassword, postLogin } from "../controllers/auth.controller.js";
import { changePasswordLimiter, loginLimiterParEmail, loginLimiterParIp } from "../lib/attempt-limiter.js";
import { asyncHandler } from "../lib/http-error.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { changePasswordSchema, loginSchema } from "../schemas/auth.schema.js";

const router = Router();

// Limiteurs avant la validation : une requête mal formée consomme aussi une tentative.
router.post("/login", loginLimiterParIp.middleware, loginLimiterParEmail.middleware, validateBody(loginSchema), postLogin);
router.post(
  "/change-password",
  changePasswordLimiter.middleware,
  requireAuth(undefined, { allowPendingPasswordChange: true }),
  validateBody(changePasswordSchema),
  asyncHandler(postChangePassword),
);

export default router;
