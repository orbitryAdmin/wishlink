export type ItemImage = {
  path: string | null;
  sourceUrl: string | null;
};

export function parseItemImages(value: string | null | undefined): ItemImage[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((entry): ItemImage[] => {
        if (!entry || typeof entry !== "object") return [];

        const path =
          typeof entry.path === "string" && entry.path.startsWith("/api/images/")
            ? entry.path
            : null;
        const sourceUrl =
          typeof entry.sourceUrl === "string" && /^https?:\/\//i.test(entry.sourceUrl)
            ? entry.sourceUrl
            : null;

        return path || sourceUrl ? [{ path, sourceUrl }] : [];
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function itemImageSources(item: {
  images: string | null;
  imagePath: string | null;
  sourceImageUrl: string | null;
}): string[] {
  const sources = parseItemImages(item.images)
    .map((image) => image.path ?? image.sourceUrl)
    .filter((source): source is string => Boolean(source));

  const cover = item.imagePath ?? item.sourceImageUrl;
  if (cover) sources.unshift(cover);

  return [...new Set(sources)].slice(0, 8);
}
