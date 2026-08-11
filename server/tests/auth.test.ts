import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app";

// Uses an in-memory MongoDB instance so the test suite never touches a real
// database and can run in CI without external services.
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

describe("Auth flow", () => {
  const credentials = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "supersecret1",
  };

  it("registers a new user and never returns the password hash", async () => {
    const res = await request(app).post("/api/auth/register").send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate registration with 409", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app).post("/api/auth/register").send(credentials);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("logs in with correct credentials and rejects wrong password", async () => {
    await request(app).post("/api/auth/register").send(credentials);

    const goodLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });
    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.data.accessToken).toBeDefined();

    const badLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: "wrong-password" });
    expect(badLogin.status).toBe(401);
  });

  it("blocks /me without a token and allows it with a valid one", async () => {
    const unauth = await request(app).get("/api/auth/me");
    expect(unauth.status).toBe(401);

    const register = await request(app).post("/api/auth/register").send(credentials);
    const token = register.body.data.accessToken;

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(credentials.email);
  });
});
