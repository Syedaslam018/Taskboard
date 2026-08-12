import { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function setIO(io: SocketIOServer): void {
  ioInstance = io;
}

/**
 * Returns the active Socket.io server, or null if it hasn't been
 * initialized. Controllers use optional chaining (getIO()?.to(...).emit(...))
 * so real-time broadcasting is a no-op in contexts where sockets aren't
 * running - e.g. the Jest test suites, which call createApp() directly
 * without attaching a Socket.io server, since most tests don't need it.
 */
export function getIO(): SocketIOServer | null {
  return ioInstance;
}
