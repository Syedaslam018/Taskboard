import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireTaskRole } from "../middleware/taskAccess";
import { validate } from "../middleware/validate";
import { WorkspaceRole } from "../models/Workspace";
import { taskController } from "../controllers/task.controller";
import { updateTaskSchema, moveTaskSchema } from "../validators/task.validators";

const router = Router();

router.use(requireAuth);

router.get("/:id", requireTaskRole(WorkspaceRole.VIEWER), taskController.getOne);
router.patch(
  "/:id",
  requireTaskRole(WorkspaceRole.MEMBER),
  validate(updateTaskSchema),
  taskController.update
);
// Deletion isn't explicitly granted to MEMBER in the spec's permission table
// (only create/update/move/comment are) - requiring ADMIN+ here is a
// deliberate, slightly more conservative reading of that ambiguity.
router.delete("/:id", requireTaskRole(WorkspaceRole.ADMIN), taskController.remove);
router.patch(
  "/:id/move",
  requireTaskRole(WorkspaceRole.MEMBER),
  validate(moveTaskSchema),
  taskController.move
);

export default router;
