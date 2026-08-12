import http from "http";
import { AddressInfo } from "net";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../src/app";
import { initSocket } from "../src/sockets";

let mongod: MongoMemoryServer;
let httpServer: http.Server;
let baseURL: string;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  httpServer = http.createServer(app);
  initSocket(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseURL = `http://localhost:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

function connectClient(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseURL, {
      auth: token ? { token } : {},
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err) => reject(err));
  });
}

async function registerAndLogin(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test User", email, password: "supersecret1" });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

describe("Socket.io real-time", () => {
  it("rejects a connection with no access token", async () => {
    await expect(connectClient()).rejects.toBeDefined();
  });

  it("lets a member join their workspace room and broadcasts presence", async () => {
    const owner = await registerAndLogin("sockowner1@example.com");
    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Realtime WS" });
    const workspaceId = wsRes.body.data.workspace._id;

    const client = await connectClient(owner.token);
    const presencePromise = new Promise((resolve) => client.once("user:online", resolve));
    const ack = await new Promise((resolve) => client.emit("workspace:join", workspaceId, resolve));

    expect((ack as { success: boolean }).success).toBe(true);
    const presenceEvent = (await presencePromise) as { onlineUserIds: string[] };
    expect(presenceEvent.onlineUserIds).toContain(owner.userId);

    client.disconnect();
  });

  it("rejects joining a workspace the socket's user isn't a member of", async () => {
    const owner = await registerAndLogin("sockowner2@example.com");
    const outsider = await registerAndLogin("sockoutsider2@example.com");
    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Private WS" });
    const workspaceId = wsRes.body.data.workspace._id;

    const client = await connectClient(outsider.token);
    const ack = await new Promise((resolve) => client.emit("workspace:join", workspaceId, resolve));
    expect((ack as { success: boolean }).success).toBe(false);

    client.disconnect();
  });

  it("broadcasts task:created to a socket joined to the workspace room", async () => {
    const owner = await registerAndLogin("sockowner3@example.com");
    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Broadcast WS" });
    const workspaceId = wsRes.body.data.workspace._id;
    const boardRes = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ workspaceId, name: "Board" });
    const board = boardRes.body.data.board;

    const client = await connectClient(owner.token);
    await new Promise((resolve) => client.emit("workspace:join", workspaceId, resolve));

    const taskCreatedPromise = new Promise((resolve) => client.once("task:created", resolve));

    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ columnId: board.columns[0]._id, title: "Realtime task" });

    const event = (await taskCreatedPromise) as { title: string };
    expect(event.title).toBe("Realtime task");

    client.disconnect();
  });

  it("does not broadcast to a socket that never joined the workspace room", async () => {
    const owner = await registerAndLogin("sockowner4@example.com");
    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Isolated WS" });
    const workspaceId = wsRes.body.data.workspace._id;
    const boardRes = await request(app)
      .post("/api/boards")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ workspaceId, name: "Board" });
    const board = boardRes.body.data.board;

    const client = await connectClient(owner.token);
    // Deliberately not joining the workspace room this time.

    let received = false;
    client.once("task:created", () => {
      received = true;
    });

    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ columnId: board.columns[0]._id, title: "Should not be received" });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(received).toBe(false);

    client.disconnect();
  });
});
