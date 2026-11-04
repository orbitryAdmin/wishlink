import { z } from "zod";
import type { ParsedPage } from "./parse-metadata";

const llmResultSchema = z.object({
  title: z.string().trim().min(1).max(300).nullable().optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().max(3).nullable().optional(),
  brand: z.string().trim().max(120).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewCount: z.number().int().nonnegative().nullable().optional(),
  reviewHighlights: z.array(z.string().trim().min(1).max(240)).max(4).nullable().optional(),
});

export type LlmProduct = z.infer<typeof llmResultSchema>;

const SYSTEM_PROMPT = `You extract product information from web pages for a wishlist app.
Use only the supplied metadata and page text. Never invent prices, ratings, brands, or reviews.
If a value is unknown, return null.
Write reviewHighlights as 2-3 short, factual points about what reviewers or the page say.
Return strict JSON with this shape:
{
  "title": string|null,
  "description": string|null,
  "price": number|null,
  "currency": string|null,
  "brand": string|null,
  "imageUrl": string|null,
  "rating": number|null,
  "reviewCount": number|null,
  "reviewHighlights": string[]|null
}`;

function parseJsonContent(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned);
}

export async function normalizeWithLlm(
  parsed: ParsedPage,
  pageUrl: string,
): Promise<LlmProduct | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (
    process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta"
  ).replace(/\/$/, "");
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const payload = {
    url: pageUrl,
    metadata: {
      title: parsed.title,
      description: parsed.description,
      imageUrl: parsed.imageUrl,
      price: parsed.price,
      currency: parsed.currency,
      brand: parsed.brand,
      rating: parsed.rating,
      reviewCount: parsed.reviewCount,
      siteName: parsed.siteName,
      reviews: parsed.reviewBodies,
    },
    pageText: parsed.visibleText.slice(0, 8_000),
  };

  try {
    const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
      method: "POST",
      signal: AbortSignal.timeout(25_000),
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: JSON.stringify(payload) }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string; thought?: boolean }>;
        };
      }>;
    };

    const content = data.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("");

    if (!content) return null;

    const result = llmResultSchema.safeParse(parseJsonContent(content));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
