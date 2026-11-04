import {
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const wishlists = pgTable("wishlists", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey(),
    wishlistId: text("wishlist_id")
      .notNull()
      .references(() => wishlists.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    price: doublePrecision("price"),
    currency: text("currency"),
    imagePath: text("image_path"),
    sourceImageUrl: text("source_image_url"),
    images: text("images").notNull().default("[]"),
    brand: text("brand"),
    rating: doublePrecision("rating"),
    reviewCount: integer("review_count"),
    reviewHighlights: text("review_highlights"),
    siteName: text("site_name"),
    notes: text("notes"),
    category: text("category"),
    tags: text("tags").notNull().default("[]"),
    status: text("status").notNull().default("ready"),
    error: text("error"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("items_wishlist_idx").on(table.wishlistId)],
);

export const looks = pgTable(
  "looks",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    platform: text("platform").notNull().default("instagram"),
    label: text("label"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("looks_item_idx").on(table.itemId)],
);

export type WishlistRow = typeof wishlists.$inferSelect;
export type ItemRow = typeof items.$inferSelect;
export type LookRow = typeof looks.$inferSelect;
