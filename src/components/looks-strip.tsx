import { ExternalLink } from "lucide-react";
import { InstagramIcon } from "./instagram-icon";
import { instagramEmbedUrl } from "@/lib/instagram";
import type { LookRow } from "@/lib/schema";

function lookKind(url: string) {
  if (url.includes("/reel/")) return "Reel";
  if (url.includes("/tv/")) return "Video";
  return "Post";
}

export function LooksStrip({ looks }: { looks: LookRow[] }) {
  if (looks.length === 0) return null;

  return (
    <div className="border-t border-line/80 pt-4">
      <p className="mb-2 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
        <InstagramIcon size={13} />
        See it on people
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {looks.map((look) => {
          const embedUrl = instagramEmbedUrl(look.url);
          const label = look.label || lookKind(look.url);

          if (!embedUrl) {
            return (
              <a
                key={look.id}
                href={look.url}
                target="_blank"
                rel="noreferrer"
                className="flex w-[240px] shrink-0 flex-col gap-2 rounded-xl border border-line bg-white/70 p-4 transition hover:border-accent/40 hover:text-accent"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  <InstagramIcon size={13} />
                  {label}
                </span>
                <span className="text-xs leading-5 text-muted">
                  Preview unavailable for this Instagram share link.
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                  Open on Instagram <ExternalLink size={12} />
                </span>
              </a>
            );
          }

          return (
            <div
              key={look.id}
              className="w-[260px] shrink-0 overflow-hidden rounded-xl border border-line bg-white/70"
            >
              <div className="flex items-center justify-between gap-2 border-b border-line/80 px-3 py-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium">
                  <InstagramIcon size={12} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </span>
                <a
                  href={look.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-[0.68rem] font-semibold text-accent hover:underline"
                >
                  Open <ExternalLink size={10} />
                </a>
              </div>
              <iframe
                src={embedUrl}
                title={`${label} on Instagram`}
                className="h-[430px] w-full bg-white"
                loading="lazy"
                allow="encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                scrolling="no"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
