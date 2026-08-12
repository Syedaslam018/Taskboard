import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/token";
import { assertWorkspaceAccess } from "../middleware/rbac";
import { WorkspaceRole } from "../models/Workspace";
import { env } from "../config/env";
import { setIO } from "./io";
import { workspaceRoom } from "./rooms";

interface AuthedSocket extends Socket {
  userId?: string;
}

interface JoinAck {
  success: boolean;
  message?: string;
}

// workspaceId -> userId -> set of socket ids. A Set (not a single id) because
// the same user can have the board open in multiple tabs/devices; presence
// should only flip to "offline" once *every* connection for that user in
// that workspace has gone away.
const presence = new Map<string, Map<string, Set<string>>>();

function addPresence(workspaceId: string, userId: string, socketId: string): void {
  if (!presence.has(workspaceId)) presence.set(workspaceId, new Map());
  const users = presence.get(workspaceId) as Map<string, Set<string>>;
  if (!users.has(userId)) users.set(userId, new Set());
  (users.get(userId) as Set<string>).add(socketId);
}

function removePresence(workspaceId: string, userId: string, socketId: string): void {
  const users = presence.get(workspaceId);
  const sockets = users?.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) users?.delete(userId);
}

function getOnlineUserIds(workspaceId: string): string[] {
  const users = presence.get(workspaceId);
  return users ? Array.from(users.keys()) : [];
}

/**
 * Attaches Socket.io to the given HTTP server, authenticates every
 * connection against the same short-lived access token used for REST, and
 * wires up workspace rooms + online presence. Real-time task/comment/member
 * events are broadcast from the REST controllers that cause them (via
 * getIO() in sockets/io.ts), not from here - this file only owns
 * connection, room membership, and presence.
 */
export function initSocket(server: http.Server): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: { origin: env.clientUrl, credentials: true },
  });
  setIO(io);

  // Runs once per connection attempt, before "connection" fires. Rejects
  // outright if there's no valid access token - sockets get exactly the
  // same authentication guarantee as REST requests.
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Authentication required"));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    socket.on("workspace:join", async (workspaceId: string, ack?: (res: JoinAck) => void) => {
      try {
        // Same membership check as every REST route for this workspace -
        // a socket can't join a room for a workspace it isn't a member of.
        await assertWorkspaceAccess(workspaceId, socket.userId as string, WorkspaceRole.VIEWER);

        socket.join(workspaceRoom(workspaceId));
        addPresence(workspaceId, socket.userId as string, socket.id);

        io.to(workspaceRoom(workspaceId)).emit("user:online", {
          userId: socket.userId,
          workspaceId,
          onlineUserIds: getOnlineUserIds(workspaceId),
        });
        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, message: err instanceof Error ? err.message : "Unable to join workspace" });
      }
    });

    socket.on("workspace:leave", (workspaceId: string) => {
      socket.leave(workspaceRoom(workspaceId));
      removePresence(workspaceId, socket.userId as string, socket.id);
      io.to(workspaceRoom(workspaceId)).emit("user:offline", {
        userId: socket.userId,
        workspaceId,
        onlineUserIds: getOnlineUserIds(workspaceId),
      });
    });

    socket.on("disconnect", () => {
      for (const [workspaceId, users] of presence.entries()) {
        if (users.get(socket.userId as string)?.has(socket.id)) {
          removePresence(workspaceId, socket.userId as string, socket.id);
          io.to(workspaceRoom(workspaceId)).emit("user:offline", {
            userId: socket.userId,
            workspaceId,
            onlineUserIds: getOnlineUserIds(workspaceId),
          });
        }
      }
    });
  });

  return io;
}
