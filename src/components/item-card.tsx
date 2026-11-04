"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImageOff,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import {
  deleteItem,
  moveItem,
  retryExtraction,
  updateItem,
} from "@/app/actions";
import type { ItemWithLooks } from "@/lib/data";
import { parseTags } from "@/lib/grouping";
import { LooksEditor } from "./looks-editor";
import { SubmitButton } from "./submit-button";

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

export function ItemCard({
  item,
  isFirst,
  isLast,
}: {
  item: ItemWithLooks;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [updateState, updateAction] = useActionState(updateItem, null);
  const [retryState, retryAction] = useActionState(retryExtraction, null);

  const rawImageSrc = item.imagePath ?? item.sourceImageUrl;
  const imageSrc = rawImageSrc && failedSrc !== rawImageSrc ? rawImageSrc : null;
  const highlights = parseHighlights(item.reviewHighlights);
  const tags = parseTags(item.tags);
  const price = formatPrice(item.price, item.currency);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#efe7dc]">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={item.title ?? "Wishlist item"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            onError={() => setFailedSrc(rawImageSrc ?? null)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
            <ImageOff size={28} strokeWidth={1.4} />
            <span className="text-xs">No image found</span>
          </div>
        )}

        {item.status === "failed" ? (
          <span className="absolute left-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-amber-800">
            Needs details
          </span>
        ) : null}

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur transition group-hover:opacity-100 focus:opacity-100"
          >
            <Pencil size={12} /> Edit
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4 p-5">
          <form action={updateAction} className="flex flex-col gap-3">
            <input type="hidden" name="itemId" value={item.id} />

            <div>
              <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                Title
              </label>
              <input name="title" defaultValue={item.title ?? ""} required className="field" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Category
                </label>
                <input
                  name="category"
                  maxLength={60}
                  defaultValue={item.category ?? ""}
                  placeholder="Dresses"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Tags
                </label>
                <input
                  name="tags"
                  defaultValue={tags.join(", ")}
                  placeholder="summer, midi"
                  className="field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Brand
                </label>
                <input name="brand" defaultValue={item.brand ?? ""} className="field" />
              </div>
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Site
                </label>
                <input
                  value={item.siteName ?? ""}
                  readOnly
                  className="field cursor-default text-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Price
                </label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={item.price ?? ""}
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Currency
                </label>
                <input
                  name="currency"
                  maxLength={3}
                  defaultValue={item.currency ?? ""}
                  placeholder="USD"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Rating
                </label>
                <input
                  name="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  defaultValue={item.rating ?? ""}
                  className="field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Review count
                </label>
                <input
                  name="reviewCount"
                  type="number"
                  min="0"
                  defaultValue={item.reviewCount ?? ""}
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Cover image URL
                </label>
                <input
                  name="imageUrl"
                  type="url"
                  defaultValue={item.sourceImageUrl ?? ""}
                  placeholder="https://..."
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={item.description ?? ""}
                className="field resize-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                Review notes <span className="font-normal normal-case tracking-normal">(one per line)</span>
              </label>
              <textarea
                name="reviewHighlights"
                rows={3}
                defaultValue={highlights.join("\n")}
                className="field resize-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                Your note
              </label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={item.notes ?? ""}
                placeholder="Why you love it, sizing notes, etc."
                className="field resize-none"
              />
            </div>

            {updateState?.error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {updateState.error}
              </p>
            ) : null}
            {updateState?.message ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {updateState.message}
              </p>
            ) : null}

            <div className="flex items-center gap-2">
              <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                Done
              </button>
            </div>
          </form>

          <LooksEditor itemId={item.id} looks={item.looks} editing />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-xl leading-tight">
                {item.title ?? "Untitled item"}
              </h3>
              {price ? (
                <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
                  {price}
                </span>
              ) : null}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {item.brand ? <span>{item.brand}</span> : null}
              {item.siteName ? <span>{item.siteName}</span> : null}
              {item.rating !== null ? (
                <span className="inline-flex items-center gap-1">
                  <Star size={12} fill="currentColor" className="text-amber-500" />
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
            <p className="line-clamp-3 text-sm leading-6 text-muted">{item.description}</p>
          ) : null}

          {item.status === "failed" ? (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <p>{item.error ?? "Details could not be extracted for this link."}</p>
              <form action={retryAction} className="mt-2">
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
                >
                  <RefreshCw size={12} /> Retry extraction
                </button>
              </form>
              {retryState?.error ? (
                <p className="mt-1 text-red-600">{retryState.error}</p>
              ) : null}
            </div>
          ) : null}

          {highlights.length > 0 ? (
            <div className="rounded-xl bg-accent-soft/55 p-3">
              <p className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-accent">
                Review notes
              </p>
              <ul className="space-y-1 text-xs leading-5 text-foreground/80">
                {highlights.map((highlight) => (
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

          <LooksEditor itemId={item.id} looks={item.looks} editing={false} />

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/80 pt-3">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Visit product <ExternalLink size={13} />
            </a>

            <div className="ml-auto flex items-center gap-1">
              <form action={moveItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  disabled={isFirst}
                  aria-label="Move up"
                  className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-black/5 hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
              </form>
              <form action={moveItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={isLast}
                  aria-label="Move down"
                  className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-black/5 hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
              </form>
              <form
                action={deleteItem}
                onSubmit={(event) => {
                  if (!window.confirm("Remove this item from the wishlist?")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  aria-label="Delete item"
                  className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
