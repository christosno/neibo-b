import request from "supertest";
import app from "../src/server.ts";
import { cleanDb, createUser, createWalk } from "./setup/dbHelpers.ts";

describe("Walks endpoints", () => {
  afterEach(async () => {
    await cleanDb();
  });

  describe("GET /api/walks/:id", () => {
    it("should return a walk with spots, author, and tags", async () => {
      const { user } = await createUser();
      const { walk, spots, tags } = await createWalk({
        userId: user.id,
        walkData: {
          name: "Test Walk",
          description: "A beautiful walking tour",
        },
        spotsData: [
          { title: "Spot 1", latitude: "40.7128", longitude: "-74.0060" },
          { title: "Spot 2", latitude: "40.7580", longitude: "-73.9855" },
        ],
        tagsData: [{ name: "Historical" }, { name: "Nature" }],
      });

      const response = await request(app)
        .get(`/api/walks/${walk.id}`)
        .expect(200);

      expect(response.body).toHaveProperty("message", "Walk fetched successfully");
      expect(response.body).toHaveProperty("data");

      const data = response.body.data;

      // Walk properties
      expect(data.id).toBe(walk.id);
      expect(data.name).toBe("Test Walk");
      expect(data.description).toBe("A beautiful walking tour");

      // Author info (should only include id, username, profilePicture)
      expect(data.author).toBeDefined();
      expect(data.author.id).toBe(user.id);
      expect(data.author.username).toBe(user.username);
      expect(data.author.profilePicture).toBeDefined();
      expect(data.author.password).toBeUndefined();
      expect(data.author.email).toBeUndefined();

      // Spots (should be ordered by positionOrder)
      expect(data.spots).toHaveLength(2);
      expect(data.spots[0].title).toBe("Spot 1");
      expect(data.spots[1].title).toBe("Spot 2");

      // Tags
      expect(data.walkTags).toHaveLength(2);
      expect(data.walkTags[0].tag).toBeDefined();
    });

    it("should return spots ordered by positionOrder", async () => {
      const { user } = await createUser();
      const { walk } = await createWalk({
        userId: user.id,
        spotsData: [
          { title: "Third", positionOrder: 2 },
          { title: "First", positionOrder: 0 },
          { title: "Second", positionOrder: 1 },
        ],
      });

      const response = await request(app)
        .get(`/api/walks/${walk.id}`)
        .expect(200);

      const spots = response.body.data.spots;
      expect(spots[0].title).toBe("First");
      expect(spots[1].title).toBe("Second");
      expect(spots[2].title).toBe("Third");
    });

    it("should return 404 if walk does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .get(`/api/walks/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe("Walk not found");
    });

    it("should return 400 if walk ID is not a valid UUID", async () => {
      const response = await request(app)
        .get("/api/walks/invalid-id")
        .expect(400);

      expect(response.body.error).toBe("Params Validation failed");
      expect(response.body.details).toBeDefined();
      expect(response.body.details[0].field).toBe("id");
    });

    it("should return a walk without spots if walk has no spots", async () => {
      const { user } = await createUser();
      const { walk } = await createWalk({
        userId: user.id,
        spotsData: [],
      });

      const response = await request(app)
        .get(`/api/walks/${walk.id}`)
        .expect(200);

      expect(response.body.data.spots).toHaveLength(0);
    });

    it("should return a walk without tags if walk has no tags", async () => {
      const { user } = await createUser();
      const { walk } = await createWalk({
        userId: user.id,
        tagsData: [],
      });

      const response = await request(app)
        .get(`/api/walks/${walk.id}`)
        .expect(200);

      expect(response.body.data.walkTags).toHaveLength(0);
    });
  });
});
