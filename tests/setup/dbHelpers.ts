import { db } from "../../src/db/connection.ts";
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
  type NewUser,
  type NewWalk,
  type NewSpot,
  type NewTag,
  type NewWalkReview,
  type NewWalkComment,
} from "../../src/db/schema.ts";
import { hashPassword } from "../../src/utils/passwords.ts";
import { generateToken } from "../../src/utils/jwt.ts";

export const createUser = async (userData: Partial<NewUser> = {}) => {
  const defaultData = {
    email: `test-${Math.random()}@test.com`,
    username: `test-${Math.random()}`,
    firstName: "Test",
    lastName: "User",
    password: "testPassword123",
    isAdmin: false,
    isSuperAdmin: false,
    isDeleted: false,
    profilePicture: "https://via.placeholder.com/150",
    bio: "Test bio",
    isActive: true,
    isVerified: true,
    ...userData,
  };

  const hashedPassword = await hashPassword(defaultData.password);
  const [user] = await db
    .insert(users)
    .values({ ...defaultData, password: hashedPassword })
    .returning();

  const token = await generateToken({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  return { user, token, rawPassword: defaultData.password };
};

/**
 * Creates tags and associates them with a walk
 * @param walkId - The ID of the walk to associate tags with
 * @param tagsData - Array of tag data (at minimum requires name)
 * @returns Array of created tags
 */
export const createWalkTags = async (
  walkId: string,
  tagsData: Array<{ name: string } & Partial<Omit<NewTag, "name">>> = []
): Promise<(typeof tags.$inferSelect)[]> => {
  if (tagsData.length === 0) {
    return [];
  }

  const createdTags = await db
    .insert(tags)
    .values(
      tagsData.map((tag) => ({
        name: tag.name,
      }))
    )
    .returning();

  // Create walk-tag associations
  if (createdTags.length > 0) {
    await db.insert(walkTags).values(
      createdTags.map((tag) => ({
        walkId,
        tagId: tag.id,
      }))
    );
  }

  return createdTags;
};

/**
 * Creates spots for a walk
 * @param walkId - The ID of the walk to create spots for
 * @param spotsData - Array of spot data
 * @returns Array of created spots
 */
export const createWalkSpots = async (
  walkId: string,
  spotsData: Partial<NewSpot>[] = []
): Promise<(typeof spots.$inferSelect)[]> => {
  if (spotsData.length === 0) {
    return [];
  }

  const defaultSpotData = {
    title: "Test Spot",
    description: "Test spot description",
    latitude: "0.0",
    longitude: "0.0",
    reach_radius: 50,
    positionOrder: 0,
  };

  const createdSpots = await db
    .insert(spots)
    .values(
      spotsData.map((spot, index) => ({
        walkId,
        ...defaultSpotData,
        positionOrder: index,
        ...spot,
      }))
    )
    .returning();

  return createdSpots;
};

/**
 * Creates a walk with optional spots and tags
 * @param options - Configuration object
 * @param options.userId - The ID of the user creating the walk
 * @param options.walkData - Partial walk data (will be merged with defaults)
 * @param options.spotsData - Array of spot data to create
 * @param options.tagsData - Array of tag data to create (requires name field)
 * @returns Object containing the created walk, spots, and tags
 */
export const createWalk = async ({
  userId,
  walkData = {},
  spotsData = [],
  tagsData = [],
}: {
  userId: string;
  walkData?: Partial<NewWalk>;
  spotsData?: Partial<NewSpot>[];
  tagsData?: Array<{ name: string } & Partial<Omit<NewTag, "name">>>;
}) => {
  const defaultWalkData = {
    authorId: userId,
    name: `Test Walk ${Math.random()}`,
    description: "Test walk description",
    coverImageUrl: "https://via.placeholder.com/150",
    duration_estimate: "30.00",
    distance_estimate: "10.00",
    isPublic: true,
    ...walkData,
  };

  const [walk] = await db.insert(walks).values(defaultWalkData).returning();

  // Create tags and spots in parallel for better performance
  const [createdTags, createdSpots] = await Promise.all([
    createWalkTags(walk.id, tagsData),
    createWalkSpots(walk.id, spotsData),
  ]);

  return { walk, tags: createdTags, spots: createdSpots };
};

/**
 * Creates a review for a walk
 * @param reviewData - Review data (requires walkId, userId, stars)
 * @returns The created review
 */
export const createWalkReview = async (
  reviewData: Omit<NewWalkReview, "id" | "createdAt" | "updatedAt">
) => {
  const [review] = await db.insert(walkReviews).values(reviewData).returning();
  return review;
};

/**
 * Creates a comment for a walk
 * @param commentData - Comment data (requires walkId, userId, comment)
 * @returns The created comment
 */
export const createWalkComment = async (
  commentData: Omit<NewWalkComment, "id" | "createdAt" | "updatedAt">
) => {
  const [comment] = await db
    .insert(walkComments)
    .values(commentData)
    .returning();
  return comment;
};

export const cleanDb = async () => {
  await db.delete(users);
  await db.delete(walks);
  await db.delete(spots);
  await db.delete(tags);
  await db.delete(walkReviews);
  await db.delete(walkComments);
  await db.delete(walkSubscriptions);
  await db.delete(userWalkProgress);
  await db.delete(walkTags);
};
