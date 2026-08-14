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
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("Dashboard", () => {
  it("classifies tasks assigned to the user by their column's isDone flag", async () => {
    const owner = await registerAndLogin("downer1@example.com");
    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const workspaceId = wsRes.body.data.workspace._id;
    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId, name: "Board" }); // default columns: last one ("Done") has isDone: true
    const board = boardRes.body.data.board;
    const todoColumn = board.columns[1]._id;
    const doneColumn = board.columns[board.columns.length - 1]._id;
    expect(board.columns[board.columns.length - 1].isDone).toBe(true);

    // One in-progress task assigned to the owner, one completed.
    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(owner.token))
      .send({ columnId: todoColumn, title: "Not done yet", assignee: owner.userId });

    const doneTaskRes = await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(owner.token))
      .send({ columnId: todoColumn, title: "Will be completed", assignee: owner.userId });
    await request(app)
      .patch(`/api/tasks/${doneTaskRes.body.data.task._id}/move`)
      .set(auth(owner.token))
      .send({ columnId: doneColumn, position: 0 });

    const dashboardRes = await request(app).get("/api/dashboard").set(auth(owner.token));
    expect(dashboardRes.body.data.stats.total).toBe(2);
    expect(dashboardRes.body.data.stats.completed).toBe(1);
    expect(dashboardRes.body.data.stats.inProgress).toBe(1);
  });

  it("counts an unassigned-but-overdue task as overdue only for its assignee", async () => {
    const owner = await registerAndLogin("downer2@example.com");
    const member = await registerAndLogin("dmember2@example.com");
    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const workspaceId = wsRes.body.data.workspace._id;
    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(owner.token))
      .send({ email: "dmember2@example.com", role: "MEMBER" });
    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId, name: "Board" });
    const board = boardRes.body.data.board;

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(owner.token))
      .send({ columnId: board.columns[0]._id, title: "Overdue for member", assignee: member.userId, dueDate: yesterday });

    const ownerDashboard = await request(app).get("/api/dashboard").set(auth(owner.token));
    expect(ownerDashboard.body.data.stats.overdue).toBe(0);

    const memberDashboard = await request(app).get("/api/dashboard").set(auth(member.token));
    expect(memberDashboard.body.data.stats.overdue).toBe(1);
  });

  it("aggregates recent activity across every workspace the user belongs to", async () => {
    const owner = await registerAndLogin("downer3@example.com");
    const ws1 = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS1" });
    const ws2 = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS2" });

    await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId: ws1.body.data.workspace._id, name: "Board1" });
    await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId: ws2.body.data.workspace._id, name: "Board2" });

    const res = await request(app).get("/api/dashboard").set(auth(owner.token));
    const messages = res.body.data.recentActivity.map((a: { message: string }) => a.message);
    expect(messages).toContainEqual(expect.stringContaining("Board1"));
    expect(messages).toContainEqual(expect.stringContaining("Board2"));
  });

  it("rejects assigning a task to a user who isn't a workspace member", async () => {
    const owner = await registerAndLogin("downer4@example.com");
    const outsider = await registerAndLogin("doutsider4@example.com");
    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId: wsRes.body.data.workspace._id, name: "Board" });
    const board = boardRes.body.data.board;

    const res = await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(owner.token))
      .send({ columnId: board.columns[0]._id, title: "Bad assignment", assignee: outsider.userId });

    expect(res.status).toBe(400);
  });
});
