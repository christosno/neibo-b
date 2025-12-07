import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { db } from "../db/connection.ts";
import { walks, walkTags, spots, type NewSpot } from "../db/schema.ts";
import { eq } from "drizzle-orm";

export const createWalk = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      coverImageUrl,
      duration_estimate,
      distance_estimate,
      isPublic,
      spots: walkSpots,
      tagIds,
    } = req.body;

    const userId = req.user.id;

    const walkNameExists = await db
      .select()
      .from(walks)
      .where(eq(walks.name, name))
      .limit(1);

    if (walkNameExists.length > 0) {
      return res.status(400).json({
        error: "Walk name already exists",
      });
    }

    // All database operations must be inside the transaction
    // CRITICAL: If ANY operation fails (throws an error), Drizzle will automatically rollback
    // Do NOT catch errors inside the transaction callback - let them propagate naturally
    const result = await db.transaction(async (tx) => {
      // Insert walk first
      // If this fails, the entire transaction will rollback automatically
      const [walk] = await tx
        .insert(walks)
        .values({
          authorId: userId,
          name,
          description,
          coverImageUrl,
          duration_estimate,
          distance_estimate,
          isPublic,
        })
        .returning();

      if (tagIds && tagIds.length > 0) {
        const walkTagsValues = tagIds.map((tagId: string) => ({
          walkId: walk.id,
          tagId,
        }));

        // If this fails, the entire transaction (including walk) will rollback
        await tx.insert(walkTags).values(walkTagsValues);
      }

      let createdSpots = [];
      if (walkSpots && walkSpots.length > 0) {
        const spotValues = walkSpots.map((spot: NewSpot) => ({
          walkId: walk.id,
          title: spot.title,
          description: spot.description,
          latitude: spot.latitude,
          longitude: spot.longitude,
          reach_radius: spot.reach_radius,
          positionOrder: spot.positionOrder,
          imageUrls: spot.imageUrls,
          audioUrl: spot.audioUrl,
        }));

        // If this fails, the entire transaction (including walk and tags) will rollback
        createdSpots = await tx.insert(spots).values(spotValues).returning();
      }

      // Only reached if all operations succeeded
      return {
        walk,
        spots: createdSpots,
      };
    });

    return res.status(201).json({
      message: "Walk created successfully",
      walk: result.walk,
      spots: result.spots,
    });
  } catch (error) {
    console.error("❌ Create walk failed:", error);

    return res.status(500).json({
      error: "Failed to create walk",
      ...(process.env.NODE_ENV !== "production" && {
        details: error instanceof Error ? error.message : String(error),
      }),
    });
  }
};
