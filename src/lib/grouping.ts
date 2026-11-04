export type GroupableItem = {
  category: string | null;
  tags: string | null;
};

export type ItemGroup<T extends GroupableItem> = {
  key: string;
  category: string;
  tag: string | null;
  items: T[];
};

const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 40;
const MAX_CATEGORY_LENGTH = 60;

export function normalizeCategory(value: string | null | undefined) {
  const category = (value ?? "").trim().replace(/\s+/g, " ");
  return category ? category.slice(0, MAX_CATEGORY_LENGTH) : null;
}

export function normalizeTags(value: string | string[] | null | undefined) {
  const entries = Array.isArray(value) ? value : (value ?? "").split(/[,;\n]+/);
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const tag = entry
      .trim()
      .replace(/^#+/, "")
      .replace(/\s+/g, " ")
      .slice(0, MAX_TAG_LENGTH);
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);

    if (tags.length >= MAX_TAGS) break;
  }

  return tags;
}

export function parseTags(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeTags(parsed.filter((entry): entry is string => typeof entry === "string"));
    }
  } catch {
    return normalizeTags(value);
  }

  return [];
}

export function collectTags<T extends GroupableItem>(items: T[]) {
  const tags = new Map<string, string>();

  for (const item of items) {
    for (const tag of parseTags(item.tags)) {
      const key = tag.toLowerCase();
      if (!tags.has(key)) tags.set(key, tag);
    }
  }

  return [...tags.values()];
}

export function groupItemsByTag<T extends GroupableItem>(items: T[], selectedTags: string[]) {
  return normalizeTags(selectedTags)
    .map((tag) => {
      const key = tag.toLowerCase();
      return {
        key,
        tag,
        items: items.filter((item) =>
          parseTags(item.tags).some((entry) => entry.toLowerCase() === key),
        ),
      };
    })
    .filter((group) => group.items.length > 0);
}

export function groupItemsByCategoryAndTag<T extends GroupableItem>(items: T[]) {
  const groups = new Map<string, ItemGroup<T>>();

  for (const item of items) {
    const category = normalizeCategory(item.category) ?? "Uncategorized";
    const tag = parseTags(item.tags)[0] ?? null;
    const key = `${category.toLowerCase()}|${tag?.toLowerCase() ?? ""}`;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { key, category, tag, items: [item] });
    }
  }

  return [...groups.values()];
}
