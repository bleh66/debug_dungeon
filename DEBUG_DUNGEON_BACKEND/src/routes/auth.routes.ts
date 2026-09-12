import { Router } from "express";
import { getProfile, login, register } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { loginSchema, registerSchema } from "../validations/auth.validation.js";
import { authRateLimit } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/register", authRateLimit, validate(registerSchema), register);
router.post("/login", authRateLimit, validate(loginSchema), login);
router.get(
    "/profile",
    authMiddleware,
    getProfile
);



export default router;
