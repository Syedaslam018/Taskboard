import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireBoardRole } from "../middleware/boardAccess";
import { validate } from "../middleware/validate";
import { WorkspaceRole } from "../models/Workspace";
import { boardController } from "../controllers/board.controller";
import { taskController } from "../controllers/task.controller";
import { createBoardSchema, updateBoardSchema, addColumnSchema, updateColumnSchema } from "../validators/board.validators";
import { createTaskSchema, listTasksQuerySchema } from "../validators/task.validators";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createBoardSchema), boardController.create);

router.get("/:id", requireBoardRole(WorkspaceRole.VIEWER), boardController.getOne);
router.patch(
  "/:id",
  requireBoardRole(WorkspaceRole.ADMIN),
  validate(updateBoardSchema),
  boardController.update
);
router.delete("/:id", requireBoardRole(WorkspaceRole.ADMIN), boardController.remove);

router.post(
  "/:id/columns",
  requireBoardRole(WorkspaceRole.ADMIN),
  validate(addColumnSchema),
  boardController.addColumn
);
router.delete("/:id/columns/:columnId", requireBoardRole(WorkspaceRole.ADMIN), boardController.removeColumn);
router.patch(
  "/:id/columns/:columnId",
  requireBoardRole(WorkspaceRole.ADMIN),
  validate(updateColumnSchema),
  boardController.updateColumn
);

// Tasks nested under their board, matching the spec's
// GET/POST /api/boards/:boardId/tasks routes.
router.get(
  "/:id/tasks",
  requireBoardRole(WorkspaceRole.VIEWER),
  validate(listTasksQuerySchema),
  taskController.list
);
router.post(
  "/:id/tasks",
  requireBoardRole(WorkspaceRole.MEMBER),
  validate(createTaskSchema),
  taskController.create
);

export default router;
