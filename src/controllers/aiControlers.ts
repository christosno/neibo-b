import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Zod schema for walk response structure (compatible with zodToJsonSchema)
const walkResponseSchema = z.object({
  name: z.string(),
  description: z.string(),
  duration_estimate: z.number().nullable().optional(),
  distance_estimate: z.number().nullable().optional(),
  spots: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      reach_radius: z.number().nullable().optional(),
      positionOrder: z.number(),
    })
  ),
});

export const generateTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    city,
    neighborhood,
    duration,
    tourTheme,
    startLocation,
    userPreferences,
    pace,
    groupType,
    budget,
    accessibilityNeeds,
  } = req.body;

  const prompt = `Create a walking tour for ${city}, ${neighborhood}.

Parameters:
- Theme: ${tourTheme}
- Start: ${startLocation}
- Duration: ${duration}
- Pace: ${pace}
- Group: ${groupType}
- Budget: ${budget}
- Preferences: ${userPreferences}
${accessibilityNeeds ? `- Accessibility: ${accessibilityNeeds}` : ""}

Return ONLY valid JSON matching this exact structure (no extra text, no comments):
{
  "name": "string - tour name",
  "description": "string - detailed tour description",
  "duration_estimate": number (minutes, optional),
  "distance_estimate": number (km, optional),
  "spots": [
    {
      "title": "string - spot name",
      "description": "string - spot description",
      "latitude": number (required, valid coordinate for ${city}),
      "longitude": number (required, valid coordinate for ${city}),
      "reach_radius": number (meters, optional),
      "positionOrder": number (required, 1, 2, 3...)
    }
  ]
}

Requirements:
- spots must be an array of objects, NOT strings
- for each spot, i want the descpription to be like a tour guide would describe it to a tourist. Also include some interesting facts about the spot.
- Each spot should be a stop on the tour.
- Each spot needs real coordinates for ${city}, ${neighborhood}
- positionOrder must be sequential (1, 2, 3...)
- Return ONLY the JSON object, nothing else`;
  console.log("👉 ~ generateTour ~ prompt:", prompt);

  try {
    // Manually create JSON Schema (more reliable than zodToJsonSchema conversion)
    const jsonSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        duration_estimate: { type: "number", nullable: true },
        distance_estimate: { type: "number", nullable: true },
        spots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              reach_radius: { type: "number", nullable: true },
              positionOrder: { type: "number" },
            },
            required: [
              "title",
              "description",
              "latitude",
              "longitude",
              "positionOrder",
            ],
          },
        },
      },
      required: ["name", "description", "spots"],
    };

    console.log(
      "👉 ~ generateTour ~ JSON Schema:",
      JSON.stringify(jsonSchema, null, 2)
    );

    console.log("👉 ~ generateTour ~ BEFORE GENERATE CONTENT:");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      },
    });
    console.log("👉 ~ generateTour ~ result.text:", result.text);

    // Parse the string from Gemini
    const rawJson = JSON.parse(result.text);
    console.log("👉 ~ generateTour ~ rawJson:", rawJson);

    // Use Zod to validate and get a typed object
    const validatedTour = walkResponseSchema.parse(rawJson);
    console.log("👉 ~ generateTour ~ validatedTour:", validatedTour);

    // Send the validated data to React Native
    res.json(validatedTour);
  } catch (error) {
    next(error);
  }
};
