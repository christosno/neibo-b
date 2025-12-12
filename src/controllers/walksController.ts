import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { db } from "../db/connection.ts";
import { walks, walkTags, spots, type NewSpot } from "../db/schema.ts";
import { eq, count, desc, and } from "drizzle-orm";

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

export const updateWalk = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: walkId } = req.params;
    const userId = req.user.id;

    const { spots: walkSpots, tagIds, ...walkData } = req.body;

    const result = await db.transaction(async (tx) => {
      // Update the walk
      const [updatedWalk] = await tx
        .update(walks)
        .set({ ...walkData, updatedAt: new Date() })
        .where(and(eq(walks.id, walkId), eq(walks.authorId, userId)))
        .returning();

      if (!updatedWalk) throw new Error("Walk not found");

      if (tagIds !== undefined) {
        // remove existing tags
        await tx.delete(walkTags).where(eq(walkTags.walkId, updatedWalk.id));

        // add new tags
        if (tagIds.length > 0) {
          const walkTagsValues = tagIds.map((tagId: string) => ({
            walkId: updatedWalk.id,
            tagId,
          }));

          await tx.insert(walkTags).values(walkTagsValues);
        }
      }

      if (walkSpots !== undefined) {
        // remove existing spots
        await tx.delete(spots).where(eq(spots.walkId, updatedWalk.id));

        // add new spots
        if (walkSpots.length > 0) {
          const spotValues = walkSpots.map((spot: NewSpot) => ({
            walkId: updatedWalk.id,
            ...spot,
          }));

          const newSpots = await tx
            .insert(spots)
            .values(spotValues)
            .returning();

          return {
            walk: updatedWalk,
            spots: newSpots,
          };
        }
      }

      return {
        walk: updatedWalk,
        spots: walkSpots,
      };
    });

    return res.status(200).json({
      message: "Walk updated successfully",
      walk: result.walk,
      spots: result.spots,
    });
  } catch (error) {
    console.error("❌ Update walk failed:", error);
    res.status(500).json({
      error: "Failed to update walk",
    });
  }
};

export const getAllWalks = async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters
    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 10)); // Max 100 items per page
    const offset = (page - 1) * limit;

    // Execute queries in parallel for better performance
    const [walksData, totalCountResult] = await Promise.all([
      // Get paginated walks
      db.select().from(walks).limit(limit).offset(offset),
      // Get total count of all walks
      db.select({ count: count() }).from(walks),
    ]);

    const total = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    // Build pagination URLs
    const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${
      req.path
    }`;
    const buildUrl = (pageNum: number) => {
      const params = new URLSearchParams();
      params.set("page", pageNum.toString());
      if (limitParam) params.set("limit", limit.toString());
      return `${baseUrl}?${params.toString()}`;
    };

    res.status(200).json({
      message: "Walks fetched successfully",
      data: {
        walks: walksData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrevious,
          next: hasNext ? buildUrl(page + 1) : null,
          previous: hasPrevious ? buildUrl(page - 1) : null,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get all walks failed:", error);
    res.status(500).json({
      error: "Failed to get all walks",
    });
  }
};
