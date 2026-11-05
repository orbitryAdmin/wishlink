import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AddLinkForm } from "@/components/add-link-form";
import { DeleteWishlistButton } from "@/components/delete-wishlist-button";
import { ItemCard } from "@/components/item-card";
import { ShareActions } from "@/components/share-actions";
import { getItemsWithLooks, getWishlist } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function WishlistEditorPage({
  params,
}: PageProps<"/wishlists/[id]">) {
  await requireAdmin();

  const { id } = await params;
  const wishlist = await getWishlist(id);

  if (!wishlist) {
    notFound();
  }

  const wishlistItems = await getItemsWithLooks(wishlist.id);
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
        <div className="flex items-center gap-3">
          <SignOutButton />
          <DeleteWishlistButton wishlistId={wishlist.id} />
        </div>
      </header>

      <section className="mt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground"
        >
          <ArrowLeft size={13} /> All wishlists
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              {wishlist.title}
            </h1>
            {wishlist.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                {wishlist.description}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-muted">
              {wishlistItems.length} {wishlistItems.length === 1 ? "item" : "items"} · Public link:{" "}
              <span className="text-foreground/70">/w/{wishlist.slug}</span>
            </p>
          </div>

          {wishlistItems.length > 0 ? (
            <ShareActions shareUrl={shareUrl} downloadUrl={downloadUrl} />
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <AddLinkForm wishlistId={wishlist.id} />
      </section>

      <section className="mt-8">
        {wishlistItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
            <p className="font-serif text-2xl">Your collage starts here</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Paste your first product link above. We&apos;ll extract the details, then you can add
              Instagram looks showing the piece on real people.
            </p>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {wishlistItems.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                isFirst={index === 0}
                isLast={index === wishlistItems.length - 1}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
