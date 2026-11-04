"use client";

import { useActionState, useEffect, useRef } from "react";
import { Link2, Sparkles } from "lucide-react";
import { addItem } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function AddLinkForm({ wishlistId }: { wishlistId: string }) {
  const [state, formAction] = useActionState(addItem, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message || state?.warning) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Sparkles size={16} />
        </span>
        <div>
          <h2 className="font-serif text-lg leading-none">Add a product</h2>
          <p className="mt-1 text-xs text-muted">
            Paste any product link. We&apos;ll pull in the title, images, price, and review notes.
          </p>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="wishlistId" value={wishlistId} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              name="url"
              type="url"
              required
              placeholder="https://shop.example.com/the-dress"
              className="field pl-10"
              autoComplete="off"
            />
          </div>
          <SubmitButton pendingText="Extracting…">Add link</SubmitButton>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            name="category"
            maxLength={60}
            placeholder="Category (e.g. Dresses)"
            className="field"
            autoComplete="off"
          />
          <input
            name="tags"
            placeholder="Tags, comma separated (summer, midi)"
            className="field"
            autoComplete="off"
          />
        </div>
        <p className="text-xs leading-5 text-muted">
          The first tag is used to group pieces in the collage. You can change these later.
        </p>
      </form>

      {state?.error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.warning ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {state.warning}
        </p>
      ) : null}
      {state?.message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
