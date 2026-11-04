import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { imagesDir } from "./db";
import { assertSafeUrl } from "./url-safety";

const MAX_IMAGE_BYTES = 10_000_000;
const MAX_REDIRECTS = 3;
const IMAGE_TIMEOUT_MS = 20_000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 WishlistStudio/1.0";


async function fetchImageResponse(sourceUrl: string) {
  let url = await assertSafeUrl(sourceUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Invalid image redirect.");
      url = await assertSafeUrl(new URL(location, url).toString());
      continue;
    }

    return response;
  }

  throw new Error("Too many image redirects.");
}

export async function cacheImage(
  sourceUrl: string,
  id: string,
): Promise<{ imagePath?: string; error?: string }> {
  try {
    const response = await fetchImageResponse(sourceUrl);

    if (!response.ok) {
      throw new Error("Image download failed.");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error("That URL is not an image.");
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_IMAGE_BYTES) {
      throw new Error("Image is too large.");
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image is too large.");
    }

    const buffer = Buffer.from(arrayBuffer);
    const processed = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize(1_200, 1_200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const filename = `${id}.webp`;
    await writeFile(path.join(imagesDir, filename), processed);

    return { imagePath: `/api/images/${filename}` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not cache the image.",
    };
  }
}

export type CachedItemImage = {
  path: string | null;
  sourceUrl: string;
};

export async function cacheProductImages(
  sourceUrls: string[],
  itemId: string,
): Promise<CachedItemImage[]> {
  return Promise.all(
    sourceUrls.slice(0, 8).map(async (sourceUrl, index) => {
      const cached = await cacheImage(sourceUrl, `${itemId}-${index}`);
      return {
        path: cached.imagePath ?? null,
        sourceUrl,
      };
    }),
  );
}

export async function imagePathToDataUri(imagePath: string) {
  if (!imagePath.startsWith("/api/images/")) return null;

  const filename = path.basename(imagePath);
  if (!/^[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png|gif|avif)$/.test(filename)) {
    return null;
  }

  try {
    const buffer = await readFile(path.join(imagesDir, filename));
    const processed = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize(700, 700, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    return `data:image/webp;base64,${processed.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function remoteImageToDataUri(sourceUrl: string) {
  try {
    const response = await fetchImageResponse(sourceUrl);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) return null;

    const processed = await sharp(Buffer.from(arrayBuffer), { failOn: "none" })
      .rotate()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();

    return `data:image/webp;base64,${processed.toString("base64")}`;
  } catch {
    return null;
  }
}
