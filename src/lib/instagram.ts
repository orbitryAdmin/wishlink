export type InstagramLook = {
  url: string;
  kind: "post" | "reel" | "tv";
};

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

export function parseInstagramUrl(input: string): InstagramLook | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  if (!INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);

  if (match) {
    const kind = match[1] === "p" ? "post" : match[1] === "tv" ? "tv" : "reel";

    return {
      url: `https://www.instagram.com/${kind === "post" ? "p" : kind}/${match[2]}/`,
      kind,
    };
  }

  const shareMatch = url.pathname.match(/^\/share\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);

  if (shareMatch) {
    const kind =
      shareMatch[1] === "p" ? "post" : shareMatch[1] === "tv" ? "tv" : "reel";
    const segment = shareMatch[1] === "p" ? "p" : kind;

    return {
      url: `https://www.instagram.com/share/${segment}/${shareMatch[2]}/`,
      kind,
    };
  }

  return null;
}

export function instagramEmbedUrl(input: string): string | null {
  const look = parseInstagramUrl(input);
  if (!look) return null;

  try {
    const url = new URL(look.url);
    const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) return null;

    return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
  } catch {
    return null;
  }
}
