import { desc, eq } from "drizzle-orm";
import db from "../db/connection.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { walks } from "../db/schema.ts";
import type { Response } from "express";

export const getWalksByUserCreator = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;

    const response = await db.query.walks.findMany({
      where: eq(walks.authorId, userId),
      with: {
        spots: {
          columns: {
            id: true,
            title: true,
            description: true,
            latitude: true,
            longitude: true,
            positionOrder: true,
            imageUrls: true,
            audioUrl: true,
            reach_radius: true,
          },
        },
        walkTags: {
          with: {
            tag: true,
          },
        },
        walkComments: {
          columns: {
            id: true,
            userId: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        walkReviews: {
          columns: {
            id: true,
            userId: true,
            stars: true,
            textReview: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [desc(walks.createdAt)],
    });
    console.log("🚀 ~ getWalksByUserCreator ~ response:", response);

    // Transform walkTags array to extract only the tag objects
    const transformedResponse = response.map((walk) => {
      const { walkTags, ...rest } = walk;
      return {
        ...rest,
        walkTags: walkTags?.map((walkTag) => walkTag.tag) || [],
      };
    });

    res.status(200).json({
      message: "User walks fetched successfully",
      data: transformedResponse,
    });
  } catch (error) {
    console.error("❌ Get user walks failed:", error);
    res.status(500).json({
      error: "Failed to get user walks",
    });
  }
};
