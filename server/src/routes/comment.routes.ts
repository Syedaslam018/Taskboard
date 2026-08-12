import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireCommentRole } from "../middleware/commentAccess";
import { validate } from "../middleware/validate";
import { WorkspaceRole } from "../models/Workspace";
import { commentController } from "../controllers/comment.controller";
import { updateCommentSchema } from "../validators/comment.validators";

const router = Router();

router.use(requireAuth);

// VIEWER-level workspace gate here on purpose - the same pattern as
// removing yourself from a workspace. Whether you can edit/delete *this*
// comment is a stricter ownership check enforced inside comment.service.ts,
// not by the role you hold in the workspace.
router.patch(
  "/:id",
  requireCommentRole(WorkspaceRole.VIEWER),
  validate(updateCommentSchema),
  commentController.update
);
router.delete("/:id", requireCommentRole(WorkspaceRole.VIEWER), commentController.remove);

export default router;
