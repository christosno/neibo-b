import request from "supertest";
import app from "../src/server.ts";
import {
  cleanDb,
  createUser,
  createWalk,
  createWalkReview,
  createWalkComment,
} from "./setup/dbHelpers.ts";

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

    it("should return avgStars as null if walk has no reviews", async () => {
      const { user } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      const response = await request(app)
        .get(`/api/walks/${walk.id}`)
        .expect(200);

      expect(response.body.data.avgStars).toBeNull();
    });

    it("should return correct avgStars when walk has reviews", async () => {
      const { user } = await createUser();
      const { user: reviewer1 } = await createUser();
      const { user: reviewer2 } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      await createWalkReview({ walkId: walk.id, userId: reviewer1.id, stars: 4 });
      await createWalkReview({ walkId: walk.id, userId: reviewer2.id, stars: 5 });

      const response = await request(app)
        .get(`/api/walks/${walk.id}`)
        .expect(200);

      expect(response.body.data.avgStars).toBe(4.5);
    });
  });

  describe("GET /api/walks", () => {
    it("should return paginated walks with avgStars", async () => {
      const { user } = await createUser();
      const { user: reviewer } = await createUser();
      const { walk: walk1 } = await createWalk({
        userId: user.id,
        walkData: { name: "Walk 1" },
      });
      const { walk: walk2 } = await createWalk({
        userId: user.id,
        walkData: { name: "Walk 2" },
      });

      await createWalkReview({ walkId: walk1.id, userId: reviewer.id, stars: 5 });

      const response = await request(app).get("/api/walks").expect(200);

      expect(response.body.message).toBe("Walks fetched successfully");
      expect(response.body.data.walks).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();

      const walkWithReview = response.body.data.walks.find(
        (w: any) => w.id === walk1.id
      );
      const walkWithoutReview = response.body.data.walks.find(
        (w: any) => w.id === walk2.id
      );

      expect(walkWithReview.avgStars).toBe(5);
      expect(walkWithoutReview.avgStars).toBeNull();
    });

    it("should paginate walks correctly", async () => {
      const { user } = await createUser();
      for (let i = 0; i < 5; i++) {
        await createWalk({ userId: user.id, walkData: { name: `Walk ${i}` } });
      }

      const response = await request(app)
        .get("/api/walks?page=1&limit=2")
        .expect(200);

      expect(response.body.data.walks).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(5);
      expect(response.body.data.pagination.totalPages).toBe(3);
      expect(response.body.data.pagination.hasNext).toBe(true);
      expect(response.body.data.pagination.hasPrevious).toBe(false);
    });
  });

  describe("GET /api/walks/:id/comments", () => {
    it("should return paginated comments for a walk", async () => {
      const { user } = await createUser();
      const { user: commenter } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      await createWalkComment({
        walkId: walk.id,
        userId: commenter.id,
        comment: "Great walk!",
      });

      const response = await request(app)
        .get(`/api/walks/${walk.id}/comments`)
        .expect(200);

      expect(response.body.message).toBe("Walk comments fetched successfully");
      expect(response.body.data.comments).toHaveLength(1);
      expect(response.body.data.comments[0].comment).toBe("Great walk!");
      expect(response.body.data.comments[0].user).toBeDefined();
      expect(response.body.data.comments[0].user.username).toBe(commenter.username);
      expect(response.body.data.pagination).toBeDefined();
    });

    it("should return 404 if walk does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .get(`/api/walks/${nonExistentId}/comments`)
        .expect(404);

      expect(response.body.error).toBe("Walk not found");
    });

    it("should return empty array if walk has no comments", async () => {
      const { user } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      const response = await request(app)
        .get(`/api/walks/${walk.id}/comments`)
        .expect(200);

      expect(response.body.data.comments).toHaveLength(0);
    });
  });

  describe("GET /api/walks/:id/reviews", () => {
    it("should return paginated reviews for a walk", async () => {
      const { user } = await createUser();
      const { user: reviewer } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      await createWalkReview({
        walkId: walk.id,
        userId: reviewer.id,
        stars: 5,
        textReview: "Amazing experience!",
      });

      const response = await request(app)
        .get(`/api/walks/${walk.id}/reviews`)
        .expect(200);

      expect(response.body.message).toBe("Walk reviews fetched successfully");
      expect(response.body.data.reviews).toHaveLength(1);
      expect(response.body.data.reviews[0].stars).toBe(5);
      expect(response.body.data.reviews[0].textReview).toBe("Amazing experience!");
      expect(response.body.data.reviews[0].user).toBeDefined();
      expect(response.body.data.reviews[0].user.username).toBe(reviewer.username);
      expect(response.body.data.pagination).toBeDefined();
    });

    it("should return 404 if walk does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .get(`/api/walks/${nonExistentId}/reviews`)
        .expect(404);

      expect(response.body.error).toBe("Walk not found");
    });

    it("should return empty array if walk has no reviews", async () => {
      const { user } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      const response = await request(app)
        .get(`/api/walks/${walk.id}/reviews`)
        .expect(200);

      expect(response.body.data.reviews).toHaveLength(0);
    });
  });

  describe("POST /api/walks/:id/comments", () => {
    it("should create a comment when authenticated", async () => {
      const { user, token } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      const response = await request(app)
        .post(`/api/walks/${walk.id}/comments`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comment: "This is a great walk!" })
        .expect(201);

      expect(response.body.message).toBe("Comment created successfully");
      expect(response.body.data.comment).toBe("This is a great walk!");
      expect(response.body.data.walkId).toBe(walk.id);
      expect(response.body.data.userId).toBe(user.id);
    });

    it("should return 401 when not authenticated", async () => {
      const { user } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      await request(app)
        .post(`/api/walks/${walk.id}/comments`)
        .send({ comment: "This is a great walk!" })
        .expect(401);
    });

    it("should return 400 when comment is empty", async () => {
      const { user, token } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      const response = await request(app)
        .post(`/api/walks/${walk.id}/comments`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comment: "" })
        .expect(400);

      expect(response.body.error).toBe("Comment cannot be empty");
    });

    it("should return 404 if walk does not exist", async () => {
      const { token } = await createUser();
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .post(`/api/walks/${nonExistentId}/comments`)
        .set("Authorization", `Bearer ${token}`)
        .send({ comment: "Test comment" })
        .expect(404);

      expect(response.body.error).toBe("Walk not found");
    });
  });

  describe("POST /api/walks/:id/reviews", () => {
    it("should create a review when authenticated", async () => {
      const { user, token } = await createUser();
      const { user: walkOwner } = await createUser();
      const { walk } = await createWalk({ userId: walkOwner.id });

      const response = await request(app)
        .post(`/api/walks/${walk.id}/reviews`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stars: 5, textReview: "Amazing walk!" })
        .expect(201);

      expect(response.body.message).toBe("Review created successfully");
      expect(response.body.data.stars).toBe(5);
      expect(response.body.data.textReview).toBe("Amazing walk!");
      expect(response.body.data.walkId).toBe(walk.id);
      expect(response.body.data.userId).toBe(user.id);
    });

    it("should create a review without textReview", async () => {
      const { user, token } = await createUser();
      const { user: walkOwner } = await createUser();
      const { walk } = await createWalk({ userId: walkOwner.id });

      const response = await request(app)
        .post(`/api/walks/${walk.id}/reviews`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stars: 4 })
        .expect(201);

      expect(response.body.data.stars).toBe(4);
      expect(response.body.data.textReview).toBeNull();
    });

    it("should return 401 when not authenticated", async () => {
      const { user } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      await request(app)
        .post(`/api/walks/${walk.id}/reviews`)
        .send({ stars: 5 })
        .expect(401);
    });

    it("should return 400 when stars is invalid", async () => {
      const { user, token } = await createUser();
      const { walk } = await createWalk({ userId: user.id });

      const response = await request(app)
        .post(`/api/walks/${walk.id}/reviews`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stars: 6 })
        .expect(400);

      expect(response.body.error).toBe("Too big: expected number to be <=5");
    });

    it("should return 400 when user already reviewed the walk", async () => {
      const { user, token } = await createUser();
      const { user: walkOwner } = await createUser();
      const { walk } = await createWalk({ userId: walkOwner.id });

      await createWalkReview({ walkId: walk.id, userId: user.id, stars: 4 });

      const response = await request(app)
        .post(`/api/walks/${walk.id}/reviews`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stars: 5 })
        .expect(400);

      expect(response.body.error).toBe("You have already reviewed this walk");
    });

    it("should return 404 if walk does not exist", async () => {
      const { token } = await createUser();
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .post(`/api/walks/${nonExistentId}/reviews`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stars: 5 })
        .expect(404);

      expect(response.body.error).toBe("Walk not found");
    });
  });
});
