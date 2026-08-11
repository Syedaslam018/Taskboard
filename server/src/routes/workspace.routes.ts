import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { WorkspaceRole } from "../models/Workspace";
import { workspaceController } from "../controllers/workspace.controller";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "../validators/workspace.validators";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createWorkspaceSchema), workspaceController.create);
router.get("/", workspaceController.list);

router.get("/:id", requireWorkspaceRole(WorkspaceRole.VIEWER), workspaceController.getOne);
router.patch(
  "/:id",
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  validate(updateWorkspaceSchema),
  workspaceController.update
);
router.delete("/:id", requireWorkspaceRole(WorkspaceRole.OWNER), workspaceController.remove);

router.post(
  "/:id/members",
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  validate(addMemberSchema),
  workspaceController.addMember
);
// VIEWER-level gate here on purpose: any member can hit this route to leave
// the workspace themselves. Removing someone *else* is enforced inside the
// service layer (requires ADMIN+) - see workspace.service.ts.
router.delete("/:id/members/:userId", requireWorkspaceRole(WorkspaceRole.VIEWER), workspaceController.removeMember);
router.patch(
  "/:id/members/:userId",
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  validate(updateMemberRoleSchema),
  workspaceController.updateMemberRole
);

export default router;
