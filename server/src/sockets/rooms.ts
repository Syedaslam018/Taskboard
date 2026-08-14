export function workspaceRoom(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

// A private per-user room, joined automatically on socket connect (see
// sockets/index.ts). Notifications target a specific person regardless of
// which workspace room(s) they currently have open, so they need their own
// channel rather than riding along on a workspace broadcast.
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
