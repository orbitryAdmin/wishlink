"use client";

import { useActionState } from "react";
import { createWishlist } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function CreateWishlistForm() {
  const [state, formAction] = useActionState(createWishlist, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label htmlFor="wishlist-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Wishlist name
        </label>
        <input
          id="wishlist-title"
          name="title"
          required
          maxLength={120}
          placeholder="Spring wardrobe"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="wishlist-description" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Description <span className="font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="wishlist-description"
          name="description"
          rows={2}
          placeholder="Soft tailoring, warm neutrals, and a few good dresses."
          className="field resize-none"
        />
      </div>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton pendingText="Creating…">Create wishlist</SubmitButton>
    </form>
  );
}
