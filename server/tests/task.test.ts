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

async function setupBoard(ownerToken: string) {
  const wsRes = await request(app).post("/api/workspaces").set(auth(ownerToken)).send({ name: "WS" });
  const workspaceId = wsRes.body.data.workspace._id;
  const boardRes = await request(app)
    .post("/api/boards")
    .set(auth(ownerToken))
    .send({ workspaceId, name: "Board" });
  return boardRes.body.data.board as { _id: string; columns: { _id: string; name: string }[] };
}

describe("Tasks", () => {
  it("creates a task, appended at position 0 in an empty column", async () => {
    const ownerToken = await registerAndLogin("towner1@example.com");
    const board = await setupBoard(ownerToken);
    const columnId = board.columns[1]._id; // "To Do"

    const res = await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .send({ columnId, title: "Implement login API", priority: "HIGH" });

    expect(res.status).toBe(201);
    expect(res.body.data.task.position).toBe(0);
    expect(res.body.data.task.priority).toBe("HIGH");
  });

  it("blocks a VIEWER from creating or updating a task, but allows a MEMBER", async () => {
    const ownerToken = await registerAndLogin("towner2@example.com");
    const memberToken = await registerAndLogin("tmember2@example.com");
    const board = await setupBoard(ownerToken);
    const columnId = board.columns[0]._id;

    const wsListRes = await request(app).get("/api/workspaces").set(auth(ownerToken));
    const workspaceId = wsListRes.body.data.workspaces[0]._id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(ownerToken))
      .send({ email: "tmember2@example.com", role: "MEMBER" });

    const created = await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(memberToken))
      .send({ columnId, title: "Member can create this" });
    expect(created.status).toBe(201);
  });

  it("reorders correctly when moving a task within the same column", async () => {
    const ownerToken = await registerAndLogin("towner3@example.com");
    const board = await setupBoard(ownerToken);
    const columnId = board.columns[0]._id;

    const titles = ["A", "B", "C"];
    const taskIds: string[] = [];
    for (const title of titles) {
      const res = await request(app)
        .post(`/api/boards/${board._id}/tasks`)
        .set(auth(ownerToken))
        .send({ columnId, title });
      taskIds.push(res.body.data.task._id);
    }
    // Order is A(0) B(1) C(2). Move A to position 2 (end).
    const move = await request(app)
      .patch(`/api/tasks/${taskIds[0]}/move`)
      .set(auth(ownerToken))
      .send({ columnId, position: 2 });
    expect(move.status).toBe(200);

    const list = await request(app)
      .get(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .query({ columnId });
    const ordered = list.body.data.tasks
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((t: { title: string }) => t.title);
    expect(ordered).toEqual(["B", "C", "A"]);
  });

  it("moves a task across columns and updates positions in both", async () => {
    const ownerToken = await registerAndLogin("towner4@example.com");
    const board = await setupBoard(ownerToken);
    const backlogId = board.columns[0]._id;
    const todoId = board.columns[1]._id;

    const t1 = await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .send({ columnId: backlogId, title: "T1" });
    const t2 = await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .send({ columnId: backlogId, title: "T2" });

    const move = await request(app)
      .patch(`/api/tasks/${t1.body.data.task._id}/move`)
      .set(auth(ownerToken))
      .send({ columnId: todoId, position: 0 });
    expect(move.status).toBe(200);
    expect(move.body.data.task.columnId).toBe(todoId);

    const backlogAfter = await request(app)
      .get(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .query({ columnId: backlogId });
    expect(backlogAfter.body.data.tasks).toHaveLength(1);
    expect(backlogAfter.body.data.tasks[0].position).toBe(0); // T2 shifted down to close the gap
    expect(backlogAfter.body.data.tasks[0]._id).toBe(t2.body.data.task._id);
  });

  it("filters tasks by priority and search", async () => {
    const ownerToken = await registerAndLogin("towner5@example.com");
    const board = await setupBoard(ownerToken);
    const columnId = board.columns[0]._id;

    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .send({ columnId, title: "Fix login bug", priority: "URGENT" });
    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .send({ columnId, title: "Write docs", priority: "LOW" });

    const res = await request(app)
      .get(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .query({ priority: "URGENT" });

    expect(res.body.data.tasks).toHaveLength(1);
    expect(res.body.data.tasks[0].title).toBe("Fix login bug");
  });

  it("returns 404 for a task belonging to a workspace the requester isn't in", async () => {
    const ownerToken = await registerAndLogin("towner6@example.com");
    const outsiderToken = await registerAndLogin("toutsider6@example.com");
    const board = await setupBoard(ownerToken);
    const columnId = board.columns[0]._id;

    const taskRes = await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(ownerToken))
      .send({ columnId, title: "Secret task" });

    const res = await request(app)
      .get(`/api/tasks/${taskRes.body.data.task._id}`)
      .set(auth(outsiderToken));
    expect(res.status).toBe(404);
  });
});
