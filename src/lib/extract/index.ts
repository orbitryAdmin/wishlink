import { fetchPage } from "./fetch-page";
import { normalizeWithLlm } from "./llm";
import { parsePage } from "./parse-metadata";

export type ExtractedProduct = {
  url: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  imageUrls: string[];
  brand?: string;
  rating?: number;
  reviewCount?: number;
  reviewHighlights: string[];
  siteName?: string;
};

function safeHttpUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function fallbackTitle(url: string) {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    if (lastSegment) {
      return decodeURIComponent(lastSegment)
        .replace(/[-_]+/g, " ")
        .replace(/\.[a-z0-9]+$/i, "")
        .slice(0, 120);
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Untitled item";
  }
}

export async function extractProduct(rawUrl: string): Promise<ExtractedProduct> {
  const page = await fetchPage(rawUrl);
  const parsed = parsePage(page.html, page.url);
  const llm = await normalizeWithLlm(parsed, page.url);

  const title = llm?.title ?? parsed.title ?? fallbackTitle(page.url);
  const description = llm?.description ?? parsed.description;
  const price = llm?.price ?? parsed.price;
  const currency = (llm?.currency ?? parsed.currency)?.toUpperCase().slice(0, 3);
  const brand = llm?.brand ?? parsed.brand;
  const rating = llm?.rating ?? parsed.rating;
  const reviewCount = llm?.reviewCount ?? parsed.reviewCount;
  const imageUrls = [
    safeHttpUrl(llm?.imageUrl),
    ...parsed.imageUrls.map(safeHttpUrl),
    safeHttpUrl(parsed.imageUrl),
  ].filter((value): value is string => Boolean(value));
  const uniqueImageUrls = [...new Set(imageUrls)].slice(0, 8);
  const imageUrl = uniqueImageUrls[0];

  const highlights = (llm?.reviewHighlights ?? parsed.reviewBodies)
    .map((highlight) => highlight.trim())
    .filter(Boolean)
    .slice(0, 4);

  return {
    url: page.url,
    title,
    description,
    price,
    currency,
    imageUrl,
    imageUrls: uniqueImageUrls,
    brand,
    rating,
    reviewCount,
    reviewHighlights: [...new Set(highlights)],
    siteName: parsed.siteName,
  };
}
