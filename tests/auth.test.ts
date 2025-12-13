import request from "supertest";
import app from "../src/server.ts";
import env from "../env.ts";
import { cleanDb, createUser } from "./setup/dbHelpers.ts";

describe("Authentication endpoints", () => {
  afterEach(async () => {
    await cleanDb();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user with valid data", async () => {
      const userData = {
        email: `test-${Math.random()}@test.com`,
        username: `test-${Math.random()}`,
        firstName: "Test",
        lastName: "User",
        password: "test",
      };
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token");

      expect(response.body.user).not.toHaveProperty("password");
    });
  });
});
