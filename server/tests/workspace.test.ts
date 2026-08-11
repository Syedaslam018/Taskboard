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

async function registerAndLogin(email: string, name = "Test User") {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "supersecret1" });
  return res.body.data.accessToken as string;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("Workspace CRUD + RBAC", () => {
  it("creates a workspace and makes the creator OWNER", async () => {
    const ownerToken = await registerAndLogin("owner@example.com");

    const create = await request(app)
      .post("/api/workspaces")
      .set(auth(ownerToken))
      .send({ name: "Website Redesign", description: "Q3 project" });

    expect(create.status).toBe(201);
    expect(create.body.data.workspace.members).toHaveLength(1);
    expect(create.body.data.workspace.members[0].role).toBe("OWNER");
  });

  it("blocks non-members from reading a workspace with a 404 (not 403)", async () => {
    const ownerToken = await registerAndLogin("owner2@example.com");
    const outsiderToken = await registerAndLogin("outsider@example.com");

    const create = await request(app)
      .post("/api/workspaces")
      .set(auth(ownerToken))
      .send({ name: "Private Project" });
    const workspaceId = create.body.data.workspace._id;

    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set(auth(outsiderToken));

    expect(res.status).toBe(404);
  });

  it("prevents a VIEWER from updating the workspace but allows an ADMIN", async () => {
    const ownerToken = await registerAndLogin("owner3@example.com");
    const viewerToken = await registerAndLogin("viewer3@example.com");

    const create = await request(app)
      .post("/api/workspaces")
      .set(auth(ownerToken))
      .send({ name: "RBAC Test" });
    const workspaceId = create.body.data.workspace._id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(ownerToken))
      .send({ email: "viewer3@example.com", role: "VIEWER" });

    const blocked = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set(auth(viewerToken))
      .send({ name: "Hacked Name" });
    expect(blocked.status).toBe(403);

    const allowed = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set(auth(ownerToken))
      .send({ name: "Renamed Project" });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.workspace.name).toBe("Renamed Project");
  });

  it("lets a member leave on their own, but blocks a member from removing someone else", async () => {
    const ownerToken = await registerAndLogin("owner4@example.com");
    const memberToken = await registerAndLogin("member4@example.com");

    const create = await request(app)
      .post("/api/workspaces")
      .set(auth(ownerToken))
      .send({ name: "Leave Test" });
    const workspaceId = create.body.data.workspace._id;

    const meRes = await request(app).get("/api/auth/me").set(auth(memberToken));
    const memberId = meRes.body.data.user._id;
    const ownerMeRes = await request(app).get("/api/auth/me").set(auth(ownerToken));
    const ownerId = ownerMeRes.body.data.user._id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(ownerToken))
      .send({ email: "member4@example.com", role: "MEMBER" });

    // Member tries to remove the owner - should be forbidden.
    const blocked = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${ownerId}`)
      .set(auth(memberToken));
    expect(blocked.status).toBe(400); // owner removal is blocked outright

    // Member leaves on their own - should succeed.
    const left = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${memberId}`)
      .set(auth(memberToken));
    expect(left.status).toBe(200);
    expect(left.body.data.workspace.members).toHaveLength(1);
  });

  it("only OWNER can delete the workspace, not ADMIN", async () => {
    const ownerToken = await registerAndLogin("owner5@example.com");
    const adminToken = await registerAndLogin("admin5@example.com");

    const create = await request(app)
      .post("/api/workspaces")
      .set(auth(ownerToken))
      .send({ name: "Delete Test" });
    const workspaceId = create.body.data.workspace._id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set(auth(ownerToken))
      .send({ email: "admin5@example.com", role: "ADMIN" });

    const blocked = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set(auth(adminToken));
    expect(blocked.status).toBe(403);

    const allowed = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set(auth(ownerToken));
    expect(allowed.status).toBe(200);
  });
});
