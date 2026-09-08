import { Router } from "express";
import { postLogin } from "../controllers/auth.controller.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { loginSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/login", validateBody(loginSchema), postLogin);

export default router;
