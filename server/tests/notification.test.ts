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

describe("Notifications", () => {
  it("notifies the assignee when a task is created and assigned to someone else", async () => {
    const owner = await registerAndLogin("nowner1@example.com");
    const member = await registerAndLogin("nmember1@example.com");

    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const workspaceId = wsRes.body.data.workspace._id;
    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(owner.token))
      .send({ email: "nmember1@example.com", role: "MEMBER" });

    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId, name: "Board" });
    const board = boardRes.body.data.board;

    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(owner.token))
      .send({ columnId: board.columns[0]._id, title: "Implement login API", assignee: member.userId });

    const notifRes = await request(app).get("/api/notifications").set(auth(member.token));
    expect(notifRes.body.data.notifications).toHaveLength(1);
    expect(notifRes.body.data.notifications[0].type).toBe("TASK_ASSIGNED");
    expect(notifRes.body.data.unreadCount).toBe(1);
  });

  it("does not notify yourself when you assign a task to yourself", async () => {
    const owner = await registerAndLogin("nowner2@example.com");
    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const workspaceId = wsRes.body.data.workspace._id;
    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId, name: "Board" });
    const board = boardRes.body.data.board;

    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(owner.token))
      .send({ columnId: board.columns[0]._id, title: "Self-assigned", assignee: owner.userId });

    const notifRes = await request(app).get("/api/notifications").set(auth(owner.token));
    expect(notifRes.body.data.notifications).toHaveLength(0);
  });

  it("marks a notification as read, and only for its owner", async () => {
    const owner = await registerAndLogin("nowner3@example.com");
    const member = await registerAndLogin("nmember3@example.com");
    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const workspaceId = wsRes.body.data.workspace._id;
    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId, name: "Board" });
    const board = boardRes.body.data.board;

    await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(owner.token))
      .send({ columnId: board.columns[0]._id, title: "Task", assignee: member.userId });

    const notifRes = await request(app).get("/api/notifications").set(auth(member.token));
    const notificationId = notifRes.body.data.notifications[0]._id;

    const blocked = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set(auth(owner.token));
    expect(blocked.status).toBe(404);

    const allowed = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set(auth(member.token));
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.notification.read).toBe(true);
  });

  it("notifies a user when they are added to a workspace", async () => {
    const owner = await registerAndLogin("nowner4@example.com");
    const invitee = await registerAndLogin("ninvitee4@example.com");
    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const workspaceId = wsRes.body.data.workspace._id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(owner.token))
      .send({ email: "ninvitee4@example.com", role: "MEMBER" });

    const notifRes = await request(app).get("/api/notifications").set(auth(invitee.token));
    expect(notifRes.body.data.notifications).toHaveLength(1);
    expect(notifRes.body.data.notifications[0].type).toBe("MEMBER_ADDED");
  });
});

describe("Activity feed", () => {
  it("records task creation and move events in the workspace feed, newest first", async () => {
    const owner = await registerAndLogin("aowner1@example.com");
    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const workspaceId = wsRes.body.data.workspace._id;
    const boardRes = await request(app)
      .post("/api/boards")
      .set(auth(owner.token))
      .send({ workspaceId, name: "Board" });
    const board = boardRes.body.data.board;

    const taskRes = await request(app)
      .post(`/api/boards/${board._id}/tasks`)
      .set(auth(owner.token))
      .send({ columnId: board.columns[0]._id, title: "Dashboard UI" });

    await request(app)
      .patch(`/api/tasks/${taskRes.body.data.task._id}/move`)
      .set(auth(owner.token))
      .send({ columnId: board.columns[1]._id, position: 0 });

    const feedRes = await request(app)
      .get(`/api/workspaces/${workspaceId}/activity`)
      .set(auth(owner.token));

    const messages = feedRes.body.data.activities.map((a: { message: string }) => a.message);
    // Board creation, task creation, task move - most recent (move) first.
    expect(messages[0]).toContain("moved");
    expect(messages).toContainEqual(expect.stringContaining("created the board"));
    expect(messages).toContainEqual(expect.stringContaining('created "Dashboard UI"'));
  });

  it("blocks a non-member from reading a workspace's activity feed", async () => {
    const owner = await registerAndLogin("aowner2@example.com");
    const outsider = await registerAndLogin("aoutsider2@example.com");
    const wsRes = await request(app).post("/api/workspaces").set(auth(owner.token)).send({ name: "WS" });
    const workspaceId = wsRes.body.data.workspace._id;

    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/activity`)
      .set(auth(outsider.token));
    expect(res.status).toBe(404);
  });
});
