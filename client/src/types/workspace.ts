export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface WorkspaceMember {
  user: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberWithUser {
  user: { _id: string; name: string; email: string; avatar?: string };
  role: WorkspaceRole;
  joinedAt: string;
}
