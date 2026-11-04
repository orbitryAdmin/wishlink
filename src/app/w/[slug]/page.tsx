import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Sparkles, Star } from "lucide-react";
import { ItemGallery } from "@/components/item-gallery";
import { LooksStrip } from "@/components/looks-strip";
import { ShareActions } from "@/components/share-actions";
import { getItemsWithLooks, getWishlistBySlug } from "@/lib/data";
import {
  collectTags,
  groupItemsByCategoryAndTag,
  groupItemsByTag,
  normalizeTags,
  parseTags,
} from "@/lib/grouping";
import { itemImageSources } from "@/lib/item-images";

export const dynamic = "force-dynamic";

function formatPrice(price: number | null, currency: string | null) {
  if (price === null) return null;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  } catch {
    return `${currency ?? ""} ${price}`.trim();
  }
}

function parseHighlights(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function generateMetadata({
  params,
}: PageProps<"/w/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const wishlist = await getWishlistBySlug(slug);

  if (!wishlist) {
    return { title: "Wishlist not found" };
  }

  const items = await getItemsWithLooks(wishlist.id);
  const image = items.length > 0 ? `/api/wishlists/${wishlist.id}/collage` : undefined;

  return {
    title: wishlist.title,
    description:
      wishlist.description ??
      `A curated wishlist of ${items.length} ${items.length === 1 ? "piece" : "pieces"}.`,
    openGraph: {
      title: wishlist.title,
      description:
        wishlist.description ??
        `A curated wishlist of ${items.length} ${items.length === 1 ? "piece" : "pieces"}.`,
      type: "website",
      images: image
        ? [{ url: image, width: 1080, height: 1350, alt: wishlist.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: wishlist.title,
      description:
        wishlist.description ??
        `A curated wishlist of ${items.length} ${items.length === 1 ? "piece" : "pieces"}.`,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicWishlistPage({
  params,
  searchParams,
}: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const wishlist = await getWishlistBySlug(slug);

  if (!wishlist) {
    notFound();
  }

  const items = await getItemsWithLooks(wishlist.id);
  const allTags = collectTags(items);
  const tagParam = query?.tag;
  const requestedTags = Array.isArray(tagParam) ? tagParam : tagParam ? [tagParam] : [];
  const selectedTags = normalizeTags(requestedTags).filter((tag) =>
    allTags.some((entry) => entry.toLowerCase() === tag.toLowerCase()),
  );
  const groups =
    selectedTags.length > 0
      ? groupItemsByTag(items, selectedTags).map((group) => ({
          key: `tag-${group.key}`,
          eyebrow: "Tag",
          heading: `#${group.tag}`,
          subheading: null as string | null,
          items: group.items,
        }))
      : groupItemsByCategoryAndTag(items).map((group) => ({
          key: group.key,
          eyebrow: group.tag ? "Category + tag" : "Category",
          heading: group.category,
          subheading: group.tag ? `#${group.tag}` : null,
          items: group.items,
        }));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = `${appUrl}/w/${wishlist.slug}`;
  const downloadUrl = `/api/wishlists/${wishlist.id}/collage?download=1`;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-white">
            <Sparkles size={17} />
          </span>
          <span className="font-serif text-xl tracking-tight">Wishlist Studio</span>
        </Link>
        <span className="hidden rounded-full border border-line bg-card px-3 py-1.5 text-xs text-muted sm:inline-flex">
          Public wishlist
        </span>
      </header>

      <section className="mx-auto mt-14 max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          A curated wishlist
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
          {wishlist.title}
        </h1>
        {wishlist.description ? (
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted">
            {wishlist.description}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-muted">
          {items.length} {items.length === 1 ? "piece" : "pieces"} · Updated{" "}
          {formatDate(wishlist.updatedAt)}
        </p>

        {items.length > 0 ? (
          <div className="mt-7 flex justify-center">
            <ShareActions shareUrl={shareUrl} downloadUrl={downloadUrl} showView={false} />
          </div>
        ) : null}
      </section>

      <section className="mt-14">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
            <p className="font-serif text-2xl">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              This wishlist is still being put together. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {allTags.length > 0 ? (
              <form method="get" className="rounded-2xl border border-line bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">
                      Group by tag
                    </p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                      Select one or more tags to show a group for each tag. Items can appear
                      in more than one group.
                    </p>
                  </div>
                  {selectedTags.length > 0 ? (
                    <Link
                      href={`/w/${wishlist.slug}`}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Clear
                    </Link>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <label
                      key={tag}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white/60 px-3 py-1.5 text-xs font-medium transition hover:border-accent/40 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent"
                    >
                      <input
                        type="checkbox"
                        name="tag"
                        value={tag}
                        defaultChecked={selectedTags.some(
                          (selected) => selected.toLowerCase() === tag.toLowerCase(),
                        )}
                        className="size-3.5 accent-accent"
                      />
                      #{tag}
                    </label>
                  ))}
                </div>
                <button type="submit" className="btn-primary mt-4">
                  Show groups
                </button>
              </form>
            ) : null}

            {groups.map((group) => (
              <section key={group.key}>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">
                      {group.eyebrow}
                    </p>
                    <h2 className="mt-1 font-serif text-2xl tracking-tight">
                      {group.heading}
                      {group.subheading ? (
                        <span className="text-muted"> · {group.subheading}</span>
                      ) : null}
                    </h2>
                  </div>
                  <span className="text-xs text-muted">
                    {group.items.length} {group.items.length === 1 ? "piece" : "pieces"}
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => {
                    const price = formatPrice(item.price, item.currency);
                    const highlights = parseHighlights(item.reviewHighlights);
                    const tags = parseTags(item.tags);

                    return (
                      <article
                        key={item.id}
                        className="break-inside-avoid overflow-hidden rounded-2xl border border-line bg-card shadow-sm"
                      >
                        <ItemGallery
                          images={itemImageSources(item)}
                          title={item.title ?? "Wishlist item"}
                          priceLabel={price}
                        />

                        <div className="flex flex-col gap-3 p-5">
                          <div>
                            <h3 className="font-serif text-xl leading-tight">
                              {item.title ?? "Untitled item"}
                            </h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                              {item.brand ? <span>{item.brand}</span> : null}
                              {item.siteName ? <span>{item.siteName}</span> : null}
                              {item.rating !== null ? (
                                <span className="inline-flex items-center gap-1">
                                  <Star
                                    size={12}
                                    fill="currentColor"
                                    className="text-amber-500"
                                  />
                                  {item.rating}
                                  {item.reviewCount ? ` (${item.reviewCount})` : ""}
                                </span>
                              ) : null}
                            </div>

                            {item.category || tags.length > 0 ? (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {item.category ? (
                                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-accent">
                                    {item.category}
                                  </span>
                                ) : null}
                                {tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-line bg-white/60 px-2.5 py-1 text-[0.68rem] text-muted"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {item.description ? (
                            <p className="line-clamp-4 text-sm leading-6 text-muted">
                              {item.description}
                            </p>
                          ) : null}

                          {highlights.length > 0 ? (
                            <div className="rounded-xl bg-accent-soft/55 p-3">
                              <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-accent">
                                Review notes
                              </p>
                              <ul className="space-y-1 text-xs leading-5 text-foreground/80">
                                {highlights.slice(0, 3).map((highlight) => (
                                  <li key={highlight} className="flex gap-1.5">
                                    <span className="mt-[0.42rem] size-1 shrink-0 rounded-full bg-accent/70" />
                                    <span>{highlight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {item.notes ? (
                            <p className="text-sm italic leading-6 text-muted">“{item.notes}”</p>
                          ) : null}

                          <LooksStrip looks={item.looks} />

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:text-[#9a3412]"
                          >
                            Shop this piece <ExternalLink size={13} />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 flex flex-col items-center gap-2 border-t border-line pt-8 text-center text-xs text-muted">
        <p>Made with Wishlist Studio · Prices and availability may change.</p>
        <Link href="/" className="font-medium text-foreground/70 underline underline-offset-4">
          Create your own wishlist
        </Link>
      </footer>
    </main>
  );
}
