"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-types";
import { requireAdmin } from "@/lib/auth";
import {
  countLooks,
  getItem,
  getWishlist,
  nextItemPosition,
  nextLookPosition,
} from "@/lib/data";
import { db } from "@/lib/db";
import { extractProduct } from "@/lib/extract";
import { normalizeCategory, normalizeTags } from "@/lib/grouping";
import { cacheImage, cacheProductImages } from "@/lib/images";
import { parseInstagramUrl } from "@/lib/instagram";
import { parseItemImages } from "@/lib/item-images";
import { items, looks, wishlists } from "@/lib/schema";
import { assertSafeUrl } from "@/lib/url-safety";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function fallbackTitleFromUrl(value: string) {
  try {
    const url = new URL(value);
    const lastSegment = url.pathname.split("/").filter(Boolean).pop();
    if (lastSegment) {
      return decodeURIComponent(lastSegment)
        .replace(/[-_]+/g, " ")
        .replace(/\.[a-z0-9]+$/i, "")
        .slice(0, 120);
    }
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Untitled item";
  }
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function reviewHighlightsFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

async function revalidateWishlist(wishlistId: string) {
  const wishlist = await getWishlist(wishlistId);
  revalidatePath("/");
  revalidatePath(`/wishlists/${wishlistId}`);
  if (wishlist) {
    revalidatePath(`/w/${wishlist.slug}`);
  }
}

async function touchWishlist(wishlistId: string) {
  await db.update(wishlists)
    .set({ updatedAt: new Date() })
    .where(eq(wishlists.id, wishlistId));
}

export async function createWishlist(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return { error: "Give your wishlist a name." };
  }

  if (title.length > 120) {
    return { error: "Keep the name under 120 characters." };
  }

  const id = randomUUID();
  const slugBase = slugify(title) || "wishlist";
  const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;
  const now = new Date();

  await db.insert(wishlists)
    .values({
      id,
      title,
      slug,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    });

  revalidatePath("/");
  redirect(`/wishlists/${id}`);
}

export async function deleteWishlist(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(wishlists).where(eq(wishlists.id, id));
  revalidatePath("/");
  redirect("/");
}

export async function addItem(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const wishlistId = String(formData.get("wishlistId") ?? "");
  const rawUrl = String(formData.get("url") ?? "").trim();
  const category = normalizeCategory(String(formData.get("category") ?? ""));
  const tags = normalizeTags(String(formData.get("tags") ?? ""));
  const wishlist = await getWishlist(wishlistId);

  if (!wishlist) {
    return { error: "Wishlist not found." };
  }

  if (!rawUrl) {
    return { error: "Paste a product link first." };
  }

  try {
    await assertSafeUrl(rawUrl);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That link is not allowed.",
    };
  }

  const id = randomUUID();
  const position = await nextItemPosition(wishlistId);
  let product: Awaited<ReturnType<typeof extractProduct>>;
  let cachedImages: Awaited<ReturnType<typeof cacheProductImages>>;

  try {
    product = await extractProduct(rawUrl);
    cachedImages = await cacheProductImages(product.imageUrls, id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read that page.";

    await db.insert(items)
      .values({
        id,
        wishlistId,
        url: rawUrl,
        title: fallbackTitleFromUrl(rawUrl),
        reviewHighlights: JSON.stringify([]),
        category,
        tags: JSON.stringify(tags),
        status: "failed",
        error: message,
        position,
        createdAt: new Date(),
      });

    await touchWishlist(wishlistId);
    await revalidateWishlist(wishlistId);
    return {
      warning: `Added the link, but details could not be extracted: ${message} You can edit it manually or retry.`,
    };
  }

  const cover = cachedImages.find((image) => image.path) ?? cachedImages[0];
  await db.insert(items)
    .values({
      id,
      wishlistId,
      url: product.url,
      title: product.title,
      description: product.description ?? null,
      price: product.price ?? null,
      currency: product.currency ?? null,
      imagePath: cover?.path ?? null,
      sourceImageUrl: cover?.sourceUrl ?? null,
      images: JSON.stringify(cachedImages),
      brand: product.brand ?? null,
      rating: product.rating ?? null,
      reviewCount: product.reviewCount ?? null,
      reviewHighlights: JSON.stringify(product.reviewHighlights),
      siteName: product.siteName ?? null,
      category,
      tags: JSON.stringify(tags),
      status: "ready",
      position,
      createdAt: new Date(),
    });

  await touchWishlist(wishlistId);
  await revalidateWishlist(wishlistId);
  return { message: `Added “${product.title}”.` };
}

export async function updateItem(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const itemId = String(formData.get("itemId") ?? "");
  const item = await getItem(itemId);

  if (!item) {
    return { error: "Item not found." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Title cannot be empty." };
  }

  const description = String(formData.get("description") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const category = normalizeCategory(String(formData.get("category") ?? ""));
  const tags = normalizeTags(String(formData.get("tags") ?? ""));
  const currency = String(formData.get("currency") ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const price = optionalNumber(formData.get("price"));
  const rating = optionalNumber(formData.get("rating"));
  const reviewCount = optionalNumber(formData.get("reviewCount"));
  const reviewHighlights = reviewHighlightsFromForm(formData.get("reviewHighlights"));
  const imageInput = String(formData.get("imageUrl") ?? "").trim();

  let imagePath = item.imagePath;
  let sourceImageUrl = item.sourceImageUrl;
  let images = item.images;

  if (imageInput !== (item.sourceImageUrl ?? "")) {
    if (!imageInput) {
      imagePath = null;
      sourceImageUrl = null;
      images = JSON.stringify([]);
    } else {
      try {
        const safeUrl = await assertSafeUrl(imageInput);
        sourceImageUrl = safeUrl.toString();
        const cached = await cacheImage(sourceImageUrl, `${item.id}-0`);
        imagePath = cached.imagePath ?? null;
        const existingImages = parseItemImages(item.images);
        images = JSON.stringify([
          { path: imagePath, sourceUrl: sourceImageUrl },
          ...existingImages.slice(1),
        ]);
      } catch {
        return { error: "Image URL must be a public http(s) link." };
      }
    }
  }

  await db.update(items)
    .set({
      title: title.slice(0, 300),
      description: description || null,
      brand: brand || null,
      notes: notes || null,
      category,
      tags: JSON.stringify(tags),
      currency: currency || null,
      price,
      rating: rating === null ? null : Math.min(5, Math.max(0, rating)),
      reviewCount: reviewCount === null ? null : Math.round(reviewCount),
      reviewHighlights: JSON.stringify(reviewHighlights),
      imagePath,
      sourceImageUrl,
      images,
      status: "ready",
      error: null,
    })
    .where(eq(items.id, itemId));

  await touchWishlist(item.wishlistId);
  await revalidateWishlist(item.wishlistId);
  return { message: "Item saved." };
}

export async function retryExtraction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const itemId = String(formData.get("itemId") ?? "");
  const item = await getItem(itemId);

  if (!item) {
    return { error: "Item not found." };
  }

  try {
    const product = await extractProduct(item.url);
    const cachedImages = await cacheProductImages(product.imageUrls, item.id);
    const cover = cachedImages.find((image) => image.path) ?? cachedImages[0];
    const imagePath = cover?.path ?? item.imagePath;
    const sourceImageUrl = cover?.sourceUrl ?? item.sourceImageUrl;
    const images = cachedImages.length > 0 ? JSON.stringify(cachedImages) : item.images;

    await db.update(items)
      .set({
        title: product.title,
        description: product.description ?? null,
        price: product.price ?? null,
        currency: product.currency ?? null,
        imagePath,
        sourceImageUrl,
        images,
        brand: product.brand ?? null,
        rating: product.rating ?? null,
        reviewCount: product.reviewCount ?? null,
        reviewHighlights: JSON.stringify(product.reviewHighlights),
        siteName: product.siteName ?? null,
        category: item.category,
        tags: item.tags,
        status: "ready",
        error: null,
      })
      .where(eq(items.id, item.id));

    await touchWishlist(item.wishlistId);
    await revalidateWishlist(item.wishlistId);
    return { message: "Details refreshed." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read that page.";

    await db.update(items)
      .set({ status: "failed", error: message })
      .where(eq(items.id, item.id));

    await revalidateWishlist(item.wishlistId);
    return { error: message };
  }
}

export async function deleteItem(formData: FormData): Promise<void> {
  await requireAdmin();

  const itemId = String(formData.get("itemId") ?? "");
  const item = await getItem(itemId);
  if (!item) return;

  await db.delete(items).where(eq(items.id, itemId));
  await touchWishlist(item.wishlistId);
  await revalidateWishlist(item.wishlistId);
}

export async function moveItem(formData: FormData): Promise<void> {
  await requireAdmin();

  const itemId = String(formData.get("itemId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const item = await getItem(itemId);
  if (!item || (direction !== "up" && direction !== "down")) return;

  const siblings = await db
    .select()
    .from(items)
    .where(eq(items.wishlistId, item.wishlistId))
    .orderBy(asc(items.position), asc(items.createdAt));

  const index = siblings.findIndex((entry) => entry.id === itemId);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  const neighbor = siblings[neighborIndex];

  if (index < 0 || !neighbor) return;

  await db.transaction(async (tx) => {
    await tx
      .update(items)
      .set({ position: neighbor.position })
      .where(eq(items.id, item.id));
    await tx
      .update(items)
      .set({ position: item.position })
      .where(eq(items.id, neighbor.id));
  });

  await touchWishlist(item.wishlistId);
  await revalidateWishlist(item.wishlistId);
}

export async function addLook(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const itemId = String(formData.get("itemId") ?? "");
  const rawUrl = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const item = await getItem(itemId);

  if (!item) {
    return { error: "Item not found." };
  }

  const instagram = parseInstagramUrl(rawUrl);
  if (!instagram) {
    return { error: "Paste a valid Instagram post or reel link." };
  }

  if ((await countLooks(itemId)) >= 8) {
    return { error: "You can add up to 8 looks per item." };
  }

  await db.insert(looks)
    .values({
      id: randomUUID(),
      itemId,
      url: instagram.url,
      platform: "instagram",
      label: label ? label.slice(0, 80) : null,
      position: await nextLookPosition(itemId),
      createdAt: new Date(),
    });

  await touchWishlist(item.wishlistId);
  await revalidateWishlist(item.wishlistId);
  return { message: "Look added." };
}

export async function deleteLook(formData: FormData): Promise<void> {
  await requireAdmin();

  const lookId = String(formData.get("lookId") ?? "");
  if (!lookId) return;

  const [look] = await db.select().from(looks).where(eq(looks.id, lookId)).limit(1);
  if (!look) return;

  const item = await getItem(look.itemId);
  if (!item) return;

  await db.delete(looks).where(eq(looks.id, lookId));
  await touchWishlist(item.wishlistId);
  await revalidateWishlist(item.wishlistId);
}
