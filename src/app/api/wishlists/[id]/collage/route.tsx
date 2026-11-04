import { ImageResponse } from "next/og";
import { getItemsWithLooks, getWishlist } from "@/lib/data";
import { groupItemsByCategoryAndTag, parseTags } from "@/lib/grouping";
import { imagePathToDataUri, remoteImageToDataUri } from "@/lib/images";
import type { ItemWithLooks } from "@/lib/data";

export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;
const PADDING = 56;
const GAP = 18;
const MAX_ITEMS = 12;
const HEADER_HEIGHT = 250;
const FOOTER_HEIGHT = 70;
const CONTENT_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;
const GROUP_HEADER_HEIGHT = 32;
const GROUP_HEADER_GAP = 10;
const GROUP_GAP = 22;

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

async function resolveImage(imagePath: string | null, sourceUrl: string | null) {
  if (imagePath) {
    const local = await imagePathToDataUri(imagePath);
    if (local) return local;
  }
  if (sourceUrl) {
    return remoteImageToDataUri(sourceUrl);
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const wishlist = await getWishlist(id);

  if (!wishlist) {
    return new Response("Wishlist not found", { status: 404 });
  }

  const allItems = await getItemsWithLooks(wishlist.id);
  const orderedItems = groupItemsByCategoryAndTag(allItems)
    .flatMap((group) => group.items)
    .slice(0, MAX_ITEMS);
  const groups = groupItemsByCategoryAndTag(orderedItems);
  const images = await Promise.all(
    orderedItems.map((item) => resolveImage(item.imagePath, item.sourceImageUrl)),
  );
  const imageById = new Map(
    orderedItems.map((item, index) => [item.id, images[index]]),
  );

  const count = orderedItems.length;
  const columns = count === 0 || count === 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const contentWidth = WIDTH - PADDING * 2;
  const cardWidth = Math.floor((contentWidth - GAP * (columns - 1)) / columns);

  const groupedLayout = (() => {
    if (groups.length === 0 || groups.length > 3) return null;

    let totalRows = 0;
    let rowGaps = 0;

    for (const group of groups) {
      const rows = Math.ceil(group.items.length / columns);
      totalRows += rows;
      rowGaps += (rows - 1) * GAP;
    }

    const headerSpace =
      groups.length * (GROUP_HEADER_HEIGHT + GROUP_HEADER_GAP) +
      Math.max(0, groups.length - 1) * GROUP_GAP;
    const cardHeight = Math.floor((CONTENT_HEIGHT - headerSpace - rowGaps) / totalRows);

    if (cardHeight < 190) return null;

    return { cardHeight: Math.min(cardHeight, 330) };
  })();

  const rows = Math.max(1, Math.ceil(count / columns));
  const fallbackAvailableHeight = CONTENT_HEIGHT - GAP * (rows - 1);
  const fallbackComputedCardHeight = Math.floor(fallbackAvailableHeight / rows);
  const fallbackCardHeight =
    rows === 1 ? Math.min(fallbackComputedCardHeight, 620) : fallbackComputedCardHeight;
  const cardHeight = groupedLayout?.cardHeight ?? fallbackCardHeight;
  const imageHeight = Math.max(90, cardHeight - 108);
  const hasGrouping = groups.some(
    (group) => group.category !== "Uncategorized" || group.tag !== null,
  );

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = wishlist.slug.replace(/[^a-zA-Z0-9_-]/g, "-") || "wishlist";

  const renderCard = (item: ItemWithLooks) => {
    const price = formatPrice(item.price, item.currency);
    const image = imageById.get(item.id);
    const tags = parseTags(item.tags);
    const meta = [item.category, ...tags.slice(0, 2).map((tag) => `#${tag}`)]
      .filter(Boolean)
      .join(" · ");

    return (
      <div
        key={item.id}
        style={{
          display: "flex",
          flexDirection: "column",
          width: cardWidth,
          height: cardHeight,
          borderRadius: 22,
          border: "1px solid #e7ded2",
          backgroundColor: "#fffdf9",
          overflow: "hidden",
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            style={{
              width: "100%",
              height: imageHeight,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: imageHeight,
              backgroundColor: "#efe7dc",
              fontSize: 44,
              fontWeight: 700,
              color: "#c9bbab",
            }}
          >
            {(item.title ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
            padding: 14,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 17,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.title ?? "Untitled item"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 13,
              color: "#78716c",
            }}
          >
            <div
              style={{
                display: "flex",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.brand ?? item.siteName ?? ""}
            </div>
            {price ? (
              <div style={{ display: "flex", fontWeight: 700, color: "#c2410c" }}>
                {price}
              </div>
            ) : null}
          </div>
          {meta ? (
            <div
              style={{
                display: "flex",
                fontSize: 11,
                fontWeight: 600,
                color: "#c2410c",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {meta}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const element = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#f7f2ea",
        padding: PADDING,
        color: "#1c1917",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          height: HEADER_HEIGHT,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#c2410c",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: "#c2410c",
            }}
          />
          WISHLIST
        </div>

        <div
          style={{
            display: "flex",
            fontSize: count > 8 ? 46 : 58,
            fontWeight: 700,
            lineHeight: 1.05,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: contentWidth,
          }}
        >
          {wishlist.title}
        </div>

        <div style={{ display: "flex", fontSize: 18, color: "#78716c" }}>
          {allItems.length} {allItems.length === 1 ? "piece" : "pieces"} ·{" "}
          {hasGrouping ? "Grouped by category & tag" : "Curated with Wishlist Studio"}
        </div>
      </div>

      {count === 0 ? (
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 28,
            border: "1px solid #e7ded2",
            backgroundColor: "#fffdf9",
            fontSize: 28,
            color: "#78716c",
          }}
        >
          No items yet
        </div>
      ) : groupedLayout ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: GROUP_GAP,
            flex: 1,
          }}
        >
          {groups.map((group) => (
            <div
              key={group.key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: GROUP_HEADER_GAP,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: GROUP_HEADER_HEIGHT,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    maxWidth: contentWidth - 180,
                    fontSize: 19,
                    fontWeight: 700,
                    color: "#1c1917",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {group.category}
                </div>
                {group.tag ? (
                  <div
                    style={{
                      display: "flex",
                      maxWidth: 220,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#c2410c",
                      backgroundColor: "#ffedd5",
                      padding: "4px 9px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    #{group.tag}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: GAP,
                }}
              >
                {group.items.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignContent: "center",
            justifyContent: "center",
            gap: GAP,
            flex: 1,
          }}
        >
          {orderedItems.map(renderCard)}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: FOOTER_HEIGHT,
          paddingTop: 18,
          fontSize: 14,
          color: "#78716c",
        }}
      >
        <div style={{ display: "flex" }}>Made with Wishlist Studio</div>
        {allItems.length > MAX_ITEMS ? (
          <div style={{ display: "flex" }}>+{allItems.length - MAX_ITEMS} more</div>
        ) : null}
      </div>
    </div>
  );

  return new ImageResponse(element, {
    width: WIDTH,
    height: HEIGHT,
    headers: download
      ? { "content-disposition": `attachment; filename="${filename}.png"` }
      : { "cache-control": "public, max-age=60, s-maxage=60" },
  });
}
