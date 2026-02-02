import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { db } from "../db/connection.ts";
import {
  walks,
  walkTags,
  spots,
  walkComments,
  walkReviews,
  type NewSpot,
} from "../db/schema.ts";
import { eq, count, asc, and, desc, avg } from "drizzle-orm";
import type { CustomError } from "../middleware/errorHandler.ts";

export const createWalk = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
      const error = new Error("Walk name already exists") as CustomError;
      error.status = 400;
      error.name = "ValidationError";
      throw error;
    }
    const result = await db.transaction(async (tx) => {
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
    next(error);
  }
};

export const updateWalk = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: walkId } = req.params;
    const userId = req.user.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(walkId)) {
      const error = new Error("Invalid walk ID format") as CustomError;
      error.status = 400;
      error.name = "ValidationError";
      throw error;
    }

    const { spots: walkSpots, tagIds, ...walkData } = req.body;

    const result = await db.transaction(async (tx) => {
      // Update the walk
      const [updatedWalk] = await tx
        .update(walks)
        .set({ ...walkData, updatedAt: new Date() })
        .where(and(eq(walks.id, walkId), eq(walks.authorId, userId)))
        .returning();

      if (!updatedWalk) {
        const error = new Error(
          "Walk not found or you don't have permission to update it"
        ) as CustomError;
        error.status = 404;
        error.name = "NotFoundError";
        throw error;
      }

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
    // If it's already a CustomError with status, pass it through
    if ((error as CustomError).status) {
      return next(error);
    }

    // Handle database errors - check if it's a PostgreSQL error
    const dbError = error as any;
    if (dbError?.cause || dbError?.code) {
      const customError = new Error(
        dbError.cause?.message || dbError.message || "Database error occurred"
      ) as CustomError;
      customError.status = 400;
      customError.name = "DatabaseError";
      return next(customError);
    }

    // For any other errors, pass through
    next(error);
  }
};

export const getWalkById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: walkId } = req.params;

    const [walk, avgResult] = await Promise.all([
      db.query.walks.findFirst({
        where: eq(walks.id, walkId),
        with: {
          spots: {
            orderBy: asc(spots.positionOrder),
          },
          author: {
            columns: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
          walkTags: {
            with: {
              tag: true,
            },
          },
        },
      }),
      db
        .select({ avgStars: avg(walkReviews.stars) })
        .from(walkReviews)
        .where(eq(walkReviews.walkId, walkId)),
    ]);

    if (!walk) {
      const error = new Error("Walk not found") as CustomError;
      error.status = 404;
      error.name = "NotFoundError";
      throw error;
    }

    const avgStars = avgResult[0]?.avgStars
      ? parseFloat(avgResult[0].avgStars)
      : null;

    res.status(200).json({
      message: "Walk fetched successfully",
      data: {
        ...walk,
        avgStars,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllWalks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Parse and validate query parameters
    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 10)); // Max 100 items per page
    const offset = (page - 1) * limit;

    // Execute queries in parallel for better performance
    const [walksData, totalCountResult] = await Promise.all([
      // Get paginated walks with average stars using left join
      db
        .select({
          id: walks.id,
          authorId: walks.authorId,
          name: walks.name,
          description: walks.description,
          coverImageUrl: walks.coverImageUrl,
          duration_estimate: walks.duration_estimate,
          distance_estimate: walks.distance_estimate,
          isPublic: walks.isPublic,
          createdAt: walks.createdAt,
          updatedAt: walks.updatedAt,
          avgStars: avg(walkReviews.stars),
        })
        .from(walks)
        .leftJoin(walkReviews, eq(walks.id, walkReviews.walkId))
        .groupBy(walks.id)
        .limit(limit)
        .offset(offset),
      // Get total count of all walks
      db.select({ count: count() }).from(walks),
    ]);

    // Convert avgStars from string to number
    const walksWithParsedAvg = walksData.map((walk) => ({
      ...walk,
      avgStars: walk.avgStars ? parseFloat(walk.avgStars) : null,
    }));

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
        walks: walksWithParsedAvg,
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
    next(error);
  }
};

export const getWalkComments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: walkId } = req.params;

    // Verify walk exists
    const walk = await db.query.walks.findFirst({
      where: eq(walks.id, walkId),
    });

    if (!walk) {
      const error = new Error("Walk not found") as CustomError;
      error.status = 404;
      error.name = "NotFoundError";
      throw error;
    }

    // Parse pagination parameters
    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 10));
    const offset = (page - 1) * limit;

    const [commentsData, totalCountResult] = await Promise.all([
      db.query.walkComments.findMany({
        where: eq(walkComments.walkId, walkId),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
        orderBy: desc(walkComments.createdAt),
        limit,
        offset,
      }),
      db
        .select({ count: count() })
        .from(walkComments)
        .where(eq(walkComments.walkId, walkId)),
    ]);

    const total = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: "Walk comments fetched successfully",
      data: {
        comments: commentsData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWalkReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: walkId } = req.params;

    // Verify walk exists
    const walk = await db.query.walks.findFirst({
      where: eq(walks.id, walkId),
    });

    if (!walk) {
      const error = new Error("Walk not found") as CustomError;
      error.status = 404;
      error.name = "NotFoundError";
      throw error;
    }

    // Parse pagination parameters
    const pageParam = req.query.page;
    const limitParam = req.query.limit;

    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 10));
    const offset = (page - 1) * limit;

    const [reviewsData, totalCountResult] = await Promise.all([
      db.query.walkReviews.findMany({
        where: eq(walkReviews.walkId, walkId),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              profilePicture: true,
            },
          },
        },
        orderBy: desc(walkReviews.createdAt),
        limit,
        offset,
      }),
      db
        .select({ count: count() })
        .from(walkReviews)
        .where(eq(walkReviews.walkId, walkId)),
    ]);

    const total = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: "Walk reviews fetched successfully",
      data: {
        reviews: reviewsData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createWalkComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: walkId } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    // Verify walk exists
    const walk = await db.query.walks.findFirst({
      where: eq(walks.id, walkId),
    });

    if (!walk) {
      const error = new Error("Walk not found") as CustomError;
      error.status = 404;
      error.name = "NotFoundError";
      throw error;
    }

    const [newComment] = await db
      .insert(walkComments)
      .values({
        walkId,
        userId,
        comment,
      })
      .returning();

    res.status(201).json({
      message: "Comment created successfully",
      data: newComment,
    });
  } catch (error) {
    next(error);
  }
};

export const createWalkReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: walkId } = req.params;
    const { stars, textReview } = req.body;
    const userId = req.user.id;

    // Verify walk exists
    const walk = await db.query.walks.findFirst({
      where: eq(walks.id, walkId),
    });

    if (!walk) {
      const error = new Error("Walk not found") as CustomError;
      error.status = 404;
      error.name = "NotFoundError";
      throw error;
    }

    // Check if user already reviewed this walk
    const existingReview = await db.query.walkReviews.findFirst({
      where: and(eq(walkReviews.walkId, walkId), eq(walkReviews.userId, userId)),
    });

    if (existingReview) {
      const error = new Error(
        "You have already reviewed this walk"
      ) as CustomError;
      error.status = 400;
      error.name = "ValidationError";
      throw error;
    }

    const [newReview] = await db
      .insert(walkReviews)
      .values({
        walkId,
        userId,
        stars,
        textReview,
      })
      .returning();

    res.status(201).json({
      message: "Review created successfully",
      data: newReview,
    });
  } catch (error) {
    next(error);
  }
};
