import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app";

let mongod: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

async function registerAndLogin(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test User", email, password: "supersecret1" });
  return res.body.data.accessToken as string;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function createWorkspace(token: string, name: string) {
  const res = await request(app).post("/api/workspaces").set(auth(token)).send({ name });
  return res.body.data.workspace._id as string;
}

describe("Boards", () => {
  it("creates a board with default columns when none are provided", async () => {
    const ownerToken = await registerAndLogin("bowner1@example.com");
    const workspaceId = await createWorkspace(ownerToken, "WS1");

    const res = await request(app)
      .post("/api/boards")
      .set(auth(ownerToken))
      .send({ workspaceId, name: "Sprint Board" });

    expect(res.status).toBe(201);
    expect(res.body.data.board.columns).toHaveLength(5);
    expect(res.body.data.board.columns[0].name).toBe("Backlog");
  });

  it("blocks a VIEWER from creating a board in the workspace", async () => {
    const ownerToken = await registerAndLogin("bowner2@example.com");
    const viewerToken = await registerAndLogin("bviewer2@example.com");
    const workspaceId = await createWorkspace(ownerToken, "WS2");

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(ownerToken))
      .send({ email: "bviewer2@example.com", role: "VIEWER" });

    const res = await request(app)
      .post("/api/boards")
      .set(auth(viewerToken))
      .send({ workspaceId, name: "Should Fail" });

    expect(res.status).toBe(403);
  });

  it("returns 404 (IDOR-safe) when a non-member requests a valid board ID from another workspace", async () => {
    const ownerToken = await registerAndLogin("bowner3@example.com");
    const outsiderToken = await registerAndLogin("boutsider3@example.com");
    const workspaceId = await createWorkspace(ownerToken, "WS3");

    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(ownerToken))
      .send({ workspaceId, name: "Private Board" });
    const boardId = boardRes.body.data.board._id;

    const res = await request(app).get(`/api/boards/${boardId}`).set(auth(outsiderToken));
    expect(res.status).toBe(404);
  });

  it("cascade-deletes tasks when a board is deleted", async () => {
    const ownerToken = await registerAndLogin("bowner4@example.com");
    const workspaceId = await createWorkspace(ownerToken, "WS4");

    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(ownerToken))
      .send({ workspaceId, name: "Cascade Board" });
    const board = boardRes.body.data.board;
    const columnId = board.columns[0]._id;

    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .send({ columnId, title: "Task to be cascaded" });

    const del = await request(app).delete(`/api/boards/${board._id}`).set(auth(ownerToken));
    expect(del.status).toBe(200);

    const count = await mongoose.connection.collection("tasks").countDocuments({});
    expect(count).toBe(0);
  });

  it("refuses to delete a column that still has tasks in it", async () => {
    const ownerToken = await registerAndLogin("bowner5@example.com");
    const workspaceId = await createWorkspace(ownerToken, "WS5");

    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(ownerToken))
      .send({ workspaceId, name: "Column Board" });
    const board = boardRes.body.data.board;
    const columnId = board.columns[0]._id;

    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .send({ columnId, title: "Blocks deletion" });

    const res = await request(app)
      .delete(`/api/boards/${board._id}/columns/${columnId}`)
      .set(auth(ownerToken));
    expect(res.status).toBe(400);
  });
});
