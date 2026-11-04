"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export function ItemGallery({
  images,
  title,
  priceLabel,
}: {
  images: string[];
  title: string;
  priceLabel?: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const activeImage = images[activeIndex];
  const visibleImages = images.filter((image) => !failed[image]);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#efe7dc]">
        {activeImage && !failed[activeImage] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeImage}
            alt={title}
            className="h-full w-full object-cover"
            onError={() => setFailed((current) => ({ ...current, [activeImage]: true }))}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
            <ImageOff size={26} strokeWidth={1.4} />
            <span className="text-xs">No image</span>
          </div>
        )}
        {priceLabel ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {priceLabel}
          </span>
        ) : null}
      </div>

      {visibleImages.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-line/70 bg-white/40 p-3">
          {visibleImages.map((image) => {
            const imageIndex = images.indexOf(image);
            const isActive = imageIndex === activeIndex;

            return (
              <button
                key={image}
                type="button"
                onClick={() => setActiveIndex(imageIndex)}
                aria-label={`Show image ${imageIndex + 1}`}
                aria-pressed={isActive}
                className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  isActive ? "border-accent" : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={() => setFailed((current) => ({ ...current, [image]: true }))}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
