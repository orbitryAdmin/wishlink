import Link from "next/link";
import { ArrowUpRight, Layers3, Link2, Sparkles } from "lucide-react";
import { CreateWishlistForm } from "@/components/create-wishlist-form";
import { listWishlists } from "@/lib/data";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function Home() {
  const wishlists = await listWishlists();
  const totalItems = wishlists.reduce((sum, wishlist) => sum + wishlist.itemCount, 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-white">
            <Sparkles size={17} />
          </span>
          <span className="font-serif text-xl tracking-tight">Wishlist Studio</span>
        </Link>
        <span className="hidden rounded-full border border-line bg-card px-3 py-1.5 text-xs text-muted sm:inline-flex">
          Creator dashboard
        </span>
      </header>

      <section className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Collect. Extract. Share.
          </p>
          <h1 className="mt-4 max-w-xl font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            Turn product links into a wishlist worth sharing.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Paste a product URL and we&apos;ll pull in the title, image, price, rating, and review
            notes. Add Instagram looks so people can see each piece on real people, then download a
            polished collage.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <Layers3 size={18} className="text-accent" />
              <div>
                <p className="font-serif text-2xl leading-none">{wishlists.length}</p>
                <p className="mt-1 text-xs text-muted">wishlists</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <Link2 size={18} className="text-accent" />
              <div>
                <p className="font-serif text-2xl leading-none">{totalItems}</p>
                <p className="mt-1 text-xs text-muted">products saved</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_20px_60px_-35px_rgba(28,25,23,0.35)]">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Sparkles size={15} />
            </span>
            <div>
              <h2 className="font-serif text-xl leading-none">New wishlist</h2>
              <p className="mt-1 text-xs text-muted">Start with a name. Add links next.</p>
            </div>
          </div>
          <CreateWishlistForm />
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">Your wishlists</h2>
            <p className="mt-1 text-sm text-muted">
              Every collection is public once you share its link.
            </p>
          </div>
        </div>

        {wishlists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
            <p className="font-serif text-2xl">No wishlists yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Create your first collection above, then paste a few product links to see the magic.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {wishlists.map((wishlist) => (
              <Link
                key={wishlist.id}
                href={`/wishlists/${wishlist.id}`}
                className="group overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-30px_rgba(28,25,23,0.5)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#efe7dc]">
                  {wishlist.coverImagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={wishlist.coverImagePath}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#f6d8c6,transparent_55%),radial-gradient(circle_at_80%_80%,#e8ded2,transparent_50%)]">
                      <Sparkles size={28} className="text-accent/60" />
                    </div>
                  )}
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[0.68rem] font-medium text-white backdrop-blur">
                    {wishlist.itemCount} {wishlist.itemCount === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl leading-tight">{wishlist.title}</h3>
                    <ArrowUpRight
                      size={17}
                      className="mt-1 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </div>
                  {wishlist.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                      {wishlist.description}
                    </p>
                  ) : null}
                  <p className="mt-4 text-xs text-muted">Created {formatDate(wishlist.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-20 border-t border-line pt-6 text-xs text-muted">
        Wishlist Studio · Product details are extracted best-effort. Always double-check prices.
      </footer>
    </main>
  );
}
