import { db } from "./connection.ts";
import {
  users,
  walks,
  spots,
  tags,
  walkReviews,
  walkComments,
  walkSubscriptions,
  userWalkProgress,
  walkTags,
} from "./schema.ts";

const seed = async () => {
  console.log("🚀 Starting db seed....");

  try {
    console.log("🚀 Clearing existing data....");
    await db.delete(users);
    await db.delete(walks);
    await db.delete(spots);
    await db.delete(tags);
    await db.delete(walkReviews);
    await db.delete(walkComments);
    await db.delete(walkSubscriptions);
    await db.delete(userWalkProgress);
    await db.delete(walkTags);

    console.log("🚀 Inserting users....");
    const [user1, user2] = await db
      .insert(users)
      .values([
        {
          email: "test@test.com",
          username: "test",
          password: "test",
          profilePicture: "https://via.placeholder.com/150",
          bio: "Test bio",
          isActive: true,
          isVerified: true,
        },
        {
          email: "test2@test.com",
          username: "test2",
          password: "test2",
          profilePicture: "https://via.placeholder.com/150",
          bio: "Test2 bio",
          isActive: true,
          isVerified: true,
        },
      ])
      .returning();

    console.log("🚀 Inserting walks....");
    const [walk1, walk2] = await db
      .insert(walks)
      .values([
        {
          authorId: user1.id,
          name: "Test Walk 1",
          description: "Test walk 1 description",
          coverImageUrl: "https://via.placeholder.com/150",
          duration_estimate: 30,
          distance_estimate: 10,
          isPublic: true,
        },
        {
          authorId: user2.id,
          name: "Test Walk 2",
          description: "Test walk 2 description",
          coverImageUrl: "https://via.placeholder.com/150",
          duration_estimate: 30,
          distance_estimate: 10,
          isPublic: true,
        },
      ])
      .returning();

    console.log("🚀 Inserting tags....");
    const [tag1, tag2] = await db
      .insert(tags)
      .values([
        {
          name: "Test Tag 1",
        },
        {
          name: "Test Tag 2",
        },
      ])
      .returning();

    console.log("🚀 Inserting walk tags....");
    await db.insert(walkTags).values([
      {
        walkId: walk1.id,
        tagId: tag1.id,
      },
      {
        walkId: walk2.id,
        tagId: tag2.id,
      },
    ]);

    console.log("🚀 Inserting walk reviews....");
    await db.insert(walkReviews).values([
      {
        walkId: walk1.id,
        userId: user1.id,
        stars: 5,
        textReview: "Test review 1",
      },
      {
        walkId: walk2.id,
        userId: user2.id,
        stars: 5,
        textReview: "Test review 2",
      },
    ]);

    console.log("🚀 Inserting walk comments....");
    await db.insert(walkComments).values([
      {
        walkId: walk1.id,
        userId: user1.id,
        comment: "Test comment 1",
      },
      {
        walkId: walk2.id,
        userId: user2.id,
        comment: "Test comment 2",
      },
    ]);

    console.log("🚀 Inserting walk subscriptions....");
    await db.insert(walkSubscriptions).values([
      {
        walkId: walk1.id,
        userId: user1.id,
        subscribedAt: new Date(),
      },
      {
        walkId: walk2.id,
        userId: user2.id,
        subscribedAt: new Date(),
      },
    ]);

    console.log("🚀 Inserting spots....");
    const [spot1, spot2] = await db
      .insert(spots)
      .values([
        {
          walkId: walk1.id,
          title: "Test Spot 1",
          description: "Test spot 1 description",
          latitude: "37.975948",
          longitude: "23.745159",
          reach_radius: 100,
          positionOrder: 1,
          imageUrls: ["https://via.placeholder.com/150"],
          audioUrl: "https://via.placeholder.com/150",
        },
        {
          walkId: walk1.id,
          title: "Test Spot 2",
          description: "Test spot 2 description",
          latitude: "37.976342",
          longitude: "23.736260",
          reach_radius: 100,
          positionOrder: 1,
          imageUrls: ["https://via.placeholder.com/150"],
          audioUrl: "https://via.placeholder.com/150",
        },
        {
          walkId: walk2.id,
          title: "Test Spot 3",
          description: "Test spot 3 description",
          latitude: "37.979731",
          longitude: "23.754969",
          reach_radius: 100,
          positionOrder: 1,
          imageUrls: ["https://via.placeholder.com/150"],
          audioUrl: "https://via.placeholder.com/150",
        },
        {
          walkId: walk2.id,
          title: "Test Spot 4",
          description: "Test spot 4 description",
          latitude: "37.981771",
          longitude: "23.758502",
          reach_radius: 100,
          positionOrder: 1,
          imageUrls: ["https://via.placeholder.com/150"],
          audioUrl: "https://via.placeholder.com/150",
        },
      ])
      .returning();

    console.log("🚀 Inserting user walk progress....");
    await db.insert(userWalkProgress).values([
      {
        userId: user1.id,
        walkId: walk1.id,
        currentSpotId: spot1.id,
      },
      {
        userId: user2.id,
        walkId: walk2.id,
        currentSpotId: spot2.id,
      },
    ]);

    console.log("✅ Database seeded successfully!");
    console.log("\n🔑 Login Credentials:");
    console.log("Email: test@test.com");
    console.log("Password: test");
    console.log("Email: test2@test.com");
    console.log("Password: test2");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
};

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seed;
