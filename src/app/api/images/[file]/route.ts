import { readFile } from "node:fs/promises";
import path from "node:path";
import { imagesDir } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (!/^[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png|gif|avif)$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const extension = path.extname(file).slice(1).toLowerCase();

  try {
    const buffer = await readFile(path.join(imagesDir, file));

    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": MIME_TYPES[extension] ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
