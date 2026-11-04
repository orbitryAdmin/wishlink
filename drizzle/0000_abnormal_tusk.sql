CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"wishlist_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"price" double precision,
	"currency" text,
	"image_path" text,
	"source_image_url" text,
	"images" text DEFAULT '[]' NOT NULL,
	"brand" text,
	"rating" double precision,
	"review_count" integer,
	"review_highlights" text,
	"site_name" text,
	"notes" text,
	"category" text,
	"tags" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"error" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "looks" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"url" text NOT NULL,
	"platform" text DEFAULT 'instagram' NOT NULL,
	"label" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "wishlists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "looks" ADD CONSTRAINT "looks_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_wishlist_idx" ON "items" USING btree ("wishlist_id");--> statement-breakpoint
CREATE INDEX "looks_item_idx" ON "looks" USING btree ("item_id");