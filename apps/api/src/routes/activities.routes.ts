import { Router } from "express";
import { getActivities, patchActivityReview, postActivity } from "../controllers/activities.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { createActivitySchema, reviewActivitySchema } from "../schemas/activity.schema.js";
import { asyncHandler } from "../lib/http-error.js";

const router = Router();

router.get("/", requireAuth(), asyncHandler(getActivities));
router.post("/", requireAuth(["STAGIAIRE", "ADMIN_RH", "RESPONSABLE_RH"]), validateBody(createActivitySchema), asyncHandler(postActivity));
router.patch("/:id/review", requireAuth(["TUTEUR", "ADMIN_RH", "RESPONSABLE_RH"]), validateBody(reviewActivitySchema), asyncHandler(patchActivityReview));

export default router;
