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

async function setupTask(ownerToken: string) {
  const wsRes = await request(app).post("/api/workspaces").set(auth(ownerToken)).send({ name: "WS" });
  const workspaceId = wsRes.body.data.workspace._id;
  const boardRes = await request(app)
    .post("/api/boards")
    .set(auth(ownerToken))
    .send({ workspaceId, name: "Board" });
  const board = boardRes.body.data.board;
  const taskRes = await request(app)
    .post(`/api/boards/${board._id}/tasks`)
    .set(auth(ownerToken))
    .send({ columnId: board.columns[0]._id, title: "Task" });
  return { workspaceId, task: taskRes.body.data.task };
}

describe("Comments", () => {
  it("adds a comment and returns it with the author populated", async () => {
    const ownerToken = await registerAndLogin("cowner1@example.com");
    const { task } = await setupTask(ownerToken);

    const res = await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .set(auth(ownerToken))
      .send({ content: "API integration is almost complete." });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.content).toBe("API integration is almost complete.");
    expect(res.body.data.comment.author.name).toBeDefined();
  });

  it("blocks a VIEWER from commenting", async () => {
    const ownerToken = await registerAndLogin("cowner2@example.com");
    const viewerToken = await registerAndLogin("cviewer2@example.com");
    const { workspaceId, task } = await setupTask(ownerToken);

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(ownerToken))
      .send({ email: "cviewer2@example.com", role: "VIEWER" });

    const res = await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .set(auth(viewerToken))
      .send({ content: "Should be blocked" });

    expect(res.status).toBe(403);
  });

  it("lets a member edit their own comment but not someone else's", async () => {
    const ownerToken = await registerAndLogin("cowner3@example.com");
    const memberToken = await registerAndLogin("cmember3@example.com");
    const { workspaceId, task } = await setupTask(ownerToken);

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(ownerToken))
      .send({ email: "cmember3@example.com", role: "MEMBER" });

    const commentRes = await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .set(auth(ownerToken))
      .send({ content: "Owner's original comment" });
    const commentId = commentRes.body.data.comment._id;

    const blocked = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set(auth(memberToken))
      .send({ content: "Trying to edit someone else's comment" });
    expect(blocked.status).toBe(403);

    const allowed = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set(auth(ownerToken))
      .send({ content: "Owner's edited comment" });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.comment.content).toBe("Owner's edited comment");
  });

  it("returns 404 for a comment reached via a task in a workspace the requester isn't in", async () => {
    const ownerToken = await registerAndLogin("cowner4@example.com");
    const outsiderToken = await registerAndLogin("coutsider4@example.com");
    const { task } = await setupTask(ownerToken);

    const commentRes = await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .set(auth(ownerToken))
      .send({ content: "Secret comment" });
    const commentId = commentRes.body.data.comment._id;

    const res = await request(app).patch(`/api/comments/${commentId}`).set(auth(outsiderToken)).send({
      content: "Should not reach this",
    });
    expect(res.status).toBe(404);
  });
});
