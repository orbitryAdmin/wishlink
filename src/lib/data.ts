import { asc, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  items,
  looks,
  wishlists,
  type ItemRow,
  type LookRow,
  type WishlistRow,
} from "./schema";

export type WishlistSummary = WishlistRow & {
  itemCount: number;
  coverImagePath: string | null;
};

export type ItemWithLooks = ItemRow & {
  looks: LookRow[];
};

export async function listWishlists(): Promise<WishlistSummary[]> {
  return db
    .select({
      ...getTableColumns(wishlists),
      itemCount: sql<number>`(
        select count(*)::int from items where items.wishlist_id = ${wishlists.id}
      )`,
      coverImagePath: sql<string | null>`(
        select image_path from items
        where items.wishlist_id = ${wishlists.id} and image_path is not null
        order by position asc limit 1
      )`,
    })
    .from(wishlists)
    .orderBy(desc(wishlists.createdAt));
}

export async function getWishlist(id: string): Promise<WishlistRow | undefined> {
  const [wishlist] = await db.select().from(wishlists).where(eq(wishlists.id, id)).limit(1);
  return wishlist;
}

export async function getWishlistBySlug(slug: string): Promise<WishlistRow | undefined> {
  const [wishlist] = await db.select().from(wishlists).where(eq(wishlists.slug, slug)).limit(1);
  return wishlist;
}

export async function getItem(id: string): Promise<ItemRow | undefined> {
  const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  return item;
}

export async function getItemsWithLooks(wishlistId: string): Promise<ItemWithLooks[]> {
  const itemRows = await db
    .select()
    .from(items)
    .where(eq(items.wishlistId, wishlistId))
    .orderBy(asc(items.position), asc(items.createdAt));

  if (itemRows.length === 0) return [];

  const lookRows = await db
    .select()
    .from(looks)
    .where(inArray(looks.itemId, itemRows.map((item) => item.id)))
    .orderBy(asc(looks.position), asc(looks.createdAt));

  return itemRows.map((item) => ({
    ...item,
    looks: lookRows.filter((look) => look.itemId === item.id),
  }));
}

export async function nextItemPosition(wishlistId: string): Promise<number> {
  const [row] = await db
    .select({ position: sql<number>`coalesce(max(${items.position}), -1) + 1` })
    .from(items)
    .where(eq(items.wishlistId, wishlistId));
  return row.position;
}

export async function nextLookPosition(itemId: string): Promise<number> {
  const [row] = await db
    .select({ position: sql<number>`coalesce(max(${looks.position}), -1) + 1` })
    .from(looks)
    .where(eq(looks.itemId, itemId));
  return row.position;
}

export async function countLooks(itemId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(looks)
    .where(eq(looks.itemId, itemId));
  return row.count;
}
