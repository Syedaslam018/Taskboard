import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export function getSocket(): Socket | null {
  return socket;
}

function connect(token: string): void {
  socket = io(SOCKET_URL, {
    path: "/socket.io",
    auth: { token },
    withCredentials: true,
  });
}

function disconnect(): void {
  socket?.disconnect();
  socket = null;
}

// Keeps the socket connection in sync with the in-memory access token:
// connects on login, reconnects with a fresh token if it changes (e.g.
// after the axios interceptor's silent refresh), and disconnects on
// logout. Imported once from main.tsx so the subscription is set up
// exactly once for the app's lifetime.
let lastToken: string | null = null;
export function initSocketSync(): void {
  useAuthStore.subscribe((state) => {
    const token = state.accessToken;
    if (token === lastToken) return;
    lastToken = token;

    disconnect();
    if (token) connect(token);
  });
}
