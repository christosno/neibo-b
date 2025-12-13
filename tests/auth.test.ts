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
        password: "testPassword123",
      };
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token");

      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should return 400 if email is already in use", async () => {
      const { user } = await createUser({
        email: `test-${Math.random()}@test.com`,
      });
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: user.email,
          username: `test-${Math.random()}`,
          password: "testPassword123",
        })
        .expect(400);

      expect(response.body.error).toBe("Email already in use");
    });

    it("should return 400 if username is already in use", async () => {
      const { user } = await createUser({
        username: `test-${Math.random()}`,
      });
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: `test-${Math.random()}@test.com`,
          username: user.username,
          password: "testPassword123",
        })
        .expect(400);

      expect(response.body.error).toBe("Username already in use");
    });

    it("should return 400 if password is not provided", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: `test-${Math.random()}@test.com`,
          username: `test-${Math.random()}`,
        })
        .expect(400);

      expect(response.body.error).toBe(
        "Invalid input: expected string, received undefined"
      );
    });

    it("should return 400 if password is not at least 8 characters long", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: `test-${Math.random()}@test.com`,
          username: `test-${Math.random()}`,
          password: "test",
        })
        .expect(400);

      expect(response.body.error).toBe(
        "Password must be at least 8 characters long"
      );
    });

    it("should return 400 if email is not provided", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          username: `test-${Math.random()}`,
          password: "testPassword123",
        })
        .expect(400);

      expect(response.body.error).toBe("Invalid email format");
    });

    it("should return 400 if username is not provided", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: `test-${Math.random()}@test.com`,
          password: "testPassword123",
        })
        .expect(400);

      expect(response.body.error).toBe(
        "Invalid input: expected string, received undefined"
      );
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login a user with valid data", async () => {
      const { user, rawPassword } = await createUser();
      const credentials = {
        email: user.email,
        password: rawPassword,
      };
      const response = await request(app)
        .post("/api/auth/login")
        .send(credentials)
        .expect(201);

      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token");

      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should return 400 if email is not provided", async () => {
      const { rawPassword } = await createUser();
      const credentials = {
        email: undefined,
        password: rawPassword,
      };
      const response = await request(app)
        .post("/api/auth/login")
        .send(credentials)
        .expect(400);

      expect(response.body.error).toBe("Invalid email format");
    });

    it("should return 401 if email is not found", async () => {
      const { rawPassword } = await createUser();
      const credentials = {
        email: "invalid-email@test.com",
        password: rawPassword,
      };
      const response = await request(app)
        .post("/api/auth/login")
        .send(credentials)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return 400 if password is not at least 8 characters long", async () => {
      const { user } = await createUser();
      const credentials = {
        email: user.email,
        password: "test",
      };
      const response = await request(app)
        .post("/api/auth/login")
        .send(credentials)
        .expect(400);

      expect(response.body.error).toBe(
        "Password must be at least 8 characters long"
      );
    });

    it("should return 400 if password is not valid", async () => {
      const { user } = await createUser();
      const credentials = {
        email: user.email,
        password: "invalid-password",
      };
      const response = await request(app)
        .post("/api/auth/login")
        .send(credentials)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });
  });
});
