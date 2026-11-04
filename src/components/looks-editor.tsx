"use client";

import { useActionState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { InstagramIcon } from "./instagram-icon";
import { addLook, deleteLook } from "@/app/actions";
import type { LookRow } from "@/lib/schema";
import { SubmitButton } from "./submit-button";

function lookKind(url: string) {
  if (url.includes("/reel/")) return "Reel";
  if (url.includes("/tv/")) return "Video";
  return "Post";
}

export function LooksEditor({
  itemId,
  looks,
  editing,
}: {
  itemId: string;
  looks: LookRow[];
  editing: boolean;
}) {
  const [state, formAction] = useActionState(addLook, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="rounded-xl border border-line/80 bg-white/45 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
        <InstagramIcon size={13} />
        Looks on people
      </p>

      {looks.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {looks.map((look) => (
            <span
              key={look.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium"
            >
              <a
                href={look.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 transition hover:text-accent"
              >
                <InstagramIcon size={12} />
                {look.label || lookKind(look.url)}
              </a>
              {editing ? (
                <form action={deleteLook}>
                  <input type="hidden" name="lookId" value={look.id} />
                  <button
                    type="submit"
                    aria-label="Remove look"
                    className="text-muted transition hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </form>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">
          No Instagram looks yet. Add one while editing this item.
        </p>
      )}

      {editing ? (
        <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="itemId" value={itemId} />
          <input
            name="url"
            type="url"
            required
            placeholder="https://instagram.com/p/..."
            className="field py-2 text-xs"
          />
          <div className="flex gap-2">
            <input
              name="label"
              maxLength={80}
              placeholder="Label (optional)"
              className="field py-2 text-xs"
            />
            <SubmitButton pendingText="Adding…" className="btn-secondary shrink-0">
              Add look
            </SubmitButton>
          </div>
          {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
          {state?.message ? <p className="text-xs text-emerald-700">{state.message}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
