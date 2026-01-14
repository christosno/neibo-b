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
      search_query: z.string(),
      full_address: z.string(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      positionOrder: z.number(),
    })
  ),
});

export const generateTour = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { city, neighborhood, duration, tourTheme, startLocation, language } =
    req.body;

  const prompt = `Act as a professional local historian and expert urban storyteller. Your goal is to design a high-quality, immersive walking tour for ${city}, ${neighborhood}.

### THEME-SPECIFIC DIRECTIVES
Tailor the selection of "spots" based on the Theme: "${tourTheme}":
- If "Art & Architecture": Focus on hidden gems, artists' former residences, studios, buildings with unique structural stories, and bars/cafes where creative movements were born.
- If "Histories from the City": Focus on the "ghosts" of the city—places of revolution, significant births/deaths, former locations of vanished landmarks, and sites of social change.
- For ANY theme: Avoid generic tourist traps. Prioritize "story-rich" locations over "photo-op" locations.

### TOUR PARAMETERS & LOGISTICS
- City/Neighborhood: ${city}, ${neighborhood}
- Theme: ${tourTheme}
- Starting Point: ${startLocation} || "Identify the most atmospheric starting point relevant to the theme."
- **Total Tour Duration: ${duration} minutes**
- Language: ${language || "English"}

### TIME MANAGEMENT (CRITICAL)
- Calculate the number of spots based on the total duration of ${duration} minutes. 
- Assume an average of 8-12 minutes per spot (5 mins for the story + 5 mins walking/observation).
- Do not overload the tour; it is better to have 5 deep, meaningful stops than 10 rushed ones.
- Ensure the spots are geographically logical and walkable in the time provided.

### NARRATIVE STYLE
1. Use evocative language (sights, sounds, smells) as a charismatic local guide.
2. Include one "Hidden Secret" or "Little-Known Fact" per spot.
3. Explain WHY this spot matters to the theme of ${tourTheme}.

### DATA INTEGRITY
For each spot, provide a "search_query" and "full_address" for Geocoding.
- Return ONLY a valid JSON object. No markdown, no preamble.

### OUTPUT FORMAT
{
  "name": "string (Catchy title)",
  "description": "string (Deep introductory narrative)",
  "total_duration_minutes": ${duration},
  "estimated_distance_km": number,
  "spots": [
    {
      "title": "string",
      "search_query": "string (For Google Maps search)",
      "full_address": "string",
      "description": "string (Atmospheric guide narrative + hidden facts)",
      "stop_duration_minutes": number (minutes spent at this specific location),
      "latitude": number,
      "longitude": number,
      "positionOrder": number
    }
  ]
}`;
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
              search_query: { type: "string" },
              full_address: { type: "string" },
              latitude: { type: "number", nullable: true },
              longitude: { type: "number", nullable: true },
              positionOrder: { type: "number" },
            },
            required: [
              "title",
              "description",
              "search_query",
              "full_address",
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
