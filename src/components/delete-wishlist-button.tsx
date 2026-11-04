"use client";

import { Trash2 } from "lucide-react";
import { deleteWishlist } from "@/app/actions";

export function DeleteWishlistButton({ wishlistId }: { wishlistId: string }) {
  return (
    <form
      action={deleteWishlist}
      onSubmit={(event) => {
        if (!window.confirm("Delete this wishlist and all of its items?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={wishlistId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={13} /> Delete wishlist
      </button>
    </form>
  );
}
