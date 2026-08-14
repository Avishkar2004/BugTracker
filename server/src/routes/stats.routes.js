import { Router } from "express";
import { overview } from "../controllers/stats.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/overview", overview);

export default router;
