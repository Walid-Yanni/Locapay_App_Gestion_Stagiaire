import { Router } from "express";
import { postChangePassword, postLogin } from "../controllers/auth.controller.js";
import { asyncHandler } from "../lib/http-error.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { changePasswordSchema, loginSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/login", validateBody(loginSchema), postLogin);
router.post(
  "/change-password",
  requireAuth(undefined, { allowPendingPasswordChange: true }),
  validateBody(changePasswordSchema),
  asyncHandler(postChangePassword),
);

export default router;
