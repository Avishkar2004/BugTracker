import { Router } from "express";
import {
  listBugs,
  getBug,
  createBug,
  updateBug,
  deleteBug,
  bulkUpdate,
  addAttachments,
  listComments,
  addComment,
  deleteComment,
  listActivity,
  exportBugs,
} from "../controllers/bug.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.use(protect);

// Static segments must be declared before "/:id" so they are not swallowed by it.
router.get("/export", exportBugs);
router.patch("/bulk", bulkUpdate);

router.route("/").get(listBugs).post(upload.array("attachments", 5), createBug);

router.route("/:id").get(getBug).patch(updateBug).delete(restrictTo("admin"), deleteBug);

router.post("/:id/attachments", upload.array("attachments", 5), addAttachments);
router.route("/:id/comments").get(listComments).post(addComment);
router.delete("/:id/comments/:commentId", deleteComment);
router.get("/:id/activity", listActivity);

export default router;
