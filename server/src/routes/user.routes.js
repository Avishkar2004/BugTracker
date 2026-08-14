import { Router } from "express";
import { listUsers, updateRole } from "../controllers/user.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listUsers);
router.patch("/:id/role", restrictTo("admin"), updateRole);

export default router;
