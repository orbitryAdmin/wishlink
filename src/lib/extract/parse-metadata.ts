import * as cheerio from "cheerio";

export type ParsedPage = {
  title?: string;
  description?: string;
  imageUrl?: string;
  imageUrls: string[];
  price?: number;
  currency?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  reviewBodies: string[];
  siteName?: string;
  visibleText: string;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = asText(entry);
      if (text) return text;
    }
  }

  if (isObject(value)) {
    return (
      asText(value.name) ??
      asText(value["@value"]) ??
      asText(value.url) ??
      asText(value.contentUrl)
    );
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }

  return undefined;
}

function imagesFrom(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(imagesFrom);
  }

  if (isObject(value)) {
    return imagesFrom(value.url ?? value.contentUrl ?? value["@id"]);
  }

  return [];
}

function typeIncludes(value: unknown, type: string): boolean {
  if (typeof value === "string") return value.toLowerCase() === type.toLowerCase();
  if (Array.isArray(value)) {
    return value.some((entry) => typeIncludes(entry, type));
  }
  return false;
}

function collectJsonLdNodes(value: unknown, out: JsonObject[]) {
  if (Array.isArray(value)) {
    for (const entry of value) collectJsonLdNodes(entry, out);
    return;
  }

  if (!isObject(value)) return;

  out.push(value);

  if (value["@graph"]) {
    collectJsonLdNodes(value["@graph"], out);
  }
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePriceAndCurrency(rawPrice?: string, rawCurrency?: string) {
  const price = asNumber(rawPrice);
  let currency = rawCurrency?.trim().toUpperCase();

  if (rawPrice) {
    if (!currency) {
      if (rawPrice.includes("₹")) currency = "INR";
      else if (rawPrice.includes("€")) currency = "EUR";
      else if (rawPrice.includes("£")) currency = "GBP";
      else if (rawPrice.includes("$")) currency = "USD";
    }
  }

  if (currency && currency.length > 3) {
    currency = currency.slice(0, 3);
  }

  return { price, currency };
}

export function parsePage(html: string, pageUrl: string): ParsedPage {
  const $ = cheerio.load(html);

  const jsonLdNodes: JsonObject[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text().trim();
    if (!raw) return;

    try {
      collectJsonLdNodes(JSON.parse(raw), jsonLdNodes);
    } catch {
      // Ignore malformed structured data.
    }
  });

  const product = jsonLdNodes.find((node) => typeIncludes(node["@type"], "Product"));

  let title = asText(product?.name);
  let description = asText(product?.description);
  const jsonLdImages = imagesFrom(product?.image);
  let imageUrl = jsonLdImages[0];
  const brand = asText(product?.brand);

  const offers = product?.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  const offerObject = isObject(offer) ? offer : undefined;
  const priceSpecification = isObject(offerObject?.priceSpecification)
    ? offerObject.priceSpecification
    : undefined;

  const jsonLdPrice =
    asNumber(offerObject?.price) ??
    asNumber(offerObject?.lowPrice) ??
    asNumber(priceSpecification?.price);
  const jsonLdCurrency =
    asText(offerObject?.priceCurrency) ??
    asText(priceSpecification?.priceCurrency);

  const aggregateRating = isObject(product?.aggregateRating)
    ? product.aggregateRating
    : undefined;
  let rating = asNumber(aggregateRating?.ratingValue);
  let reviewCount =
    asNumber(aggregateRating?.reviewCount) ?? asNumber(aggregateRating?.ratingCount);

  const reviewBodies: string[] = [];
  const reviews = product?.review;
  const reviewList = Array.isArray(reviews) ? reviews : reviews ? [reviews] : [];

  for (const review of reviewList) {
    if (!isObject(review)) continue;
    const body = asText(review.reviewBody) ?? asText(review.description);
    if (body) {
      reviewBodies.push(stripHtml(body).slice(0, 500));
    }
  }

  const meta = (selector: string) => $(selector).attr("content")?.trim() || undefined;

  const ogTitle = meta('meta[property="og:title"]') ?? meta('meta[name="twitter:title"]');
  const ogDescription =
    meta('meta[property="og:description"]') ??
    meta('meta[name="twitter:description"]') ??
    meta('meta[name="description"]');
  const ogImage =
    meta('meta[property="og:image"]') ??
    meta('meta[property="og:image:url"]') ??
    meta('meta[property="og:image:secure_url"]') ??
    meta('meta[name="twitter:image"]');

  const ogImages: string[] = [];
  $(
    'meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"], meta[name="twitter:image"], meta[name="twitter:image:src"]',
  ).each((_, element) => {
    const value = $(element).attr("content")?.trim();
    if (value && !value.startsWith("data:")) ogImages.push(value);
  });

  const ogSiteName = meta('meta[property="og:site_name"]');
  const ogPrice =
    meta('meta[property="product:price:amount"]') ??
    meta('meta[property="og:price:amount"]') ??
    meta('meta[itemprop="price"]');
  const ogCurrency =
    meta('meta[property="product:price:currency"]') ??
    meta('meta[property="og:price:currency"]') ??
    meta('meta[itemprop="priceCurrency"]');

  const firstText = (selector: string) =>
    $(selector).first().text().replace(/\s+/g, " ").trim() || undefined;
  const firstAttr = (selector: string, attribute: string) =>
    $(selector).first().attr(attribute)?.trim() || undefined;

  const pageTitle = $("title").first().text().trim() || undefined;
  const h1Title = firstText("h1");
  const productTitle = h1Title && h1Title.length <= 300 ? h1Title : undefined;
  title = title ?? productTitle ?? ogTitle ?? pageTitle;

  const itempropDescription =
    firstText('[itemprop="description"]') ??
    firstText(
      "#product_description p, #product_description + p, .product-description p, .product-description + p, .product__description p, [itemprop=\"description\"] p",
    ) ??
    firstText("#product_description, .product-description, .product__description");
  description = description ?? itempropDescription ?? ogDescription;

  const imageCandidates = [
    firstAttr('meta[itemprop="image"]', "content"),
    firstAttr('link[rel="image_src"]', "href"),
    firstAttr('img[itemprop="image"]', "src"),
    firstAttr('[itemprop="image"] img', "src"),
    firstAttr("main img, article img, #product-image img, .product-image img", "src"),
    $("img")
      .filter((_, element) => {
        const src = $(element).attr("src") ?? "";
        return Boolean(src) && !/logo|icon|sprite|avatar|badge/i.test(src);
      })
      .first()
      .attr("src")
      ?.trim() || undefined,
  ].filter(
    (value): value is string =>
      typeof value === "string" &&
      value.length > 0 &&
      !value.startsWith("data:") &&
      !/logo|icon|sprite|avatar|badge|swatch|flag|payment|placeholder/i.test(value),
  );

  const galleryImages: string[] = [];
  $(
    'img[itemprop="image"], [itemprop="image"] img, main img, article img, #product-image img, .product-image img, .product-gallery img, [class*="gallery"] img, [class*="product"] img',
  ).each((_, element) => {
    const node = $(element);
    const identity = `${node.attr("alt") ?? ""} ${node.attr("class") ?? ""}`;
    if (/logo|icon|sprite|avatar|badge|swatch|flag|payment|placeholder/i.test(identity)) {
      return;
    }

    const candidates = [
      node.attr("src"),
      node.attr("data-src"),
      node.attr("data-lazy-src"),
      node.attr("data-original"),
      node.attr("data-image"),
    ];
    let value = candidates.find(
      (candidate): candidate is string =>
        typeof candidate === "string" &&
        candidate.length > 0 &&
        !candidate.startsWith("data:"),
    );

    if (!value) {
      const srcset = node.attr("srcset") ?? node.attr("data-srcset");
      if (srcset) {
        const entries = srcset
          .split(",")
          .map((entry) => entry.trim().split(/\s+/)[0])
          .filter(Boolean);
        value = entries[entries.length - 1];
      }
    }

    if (value && !value.startsWith("data:")) galleryImages.push(value);
  });

  const rawImageUrls = [
    imageUrl,
    ...jsonLdImages,
    ogImage,
    ...ogImages,
    ...imageCandidates,
    ...galleryImages,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.length > 0 && !value.startsWith("data:"),
  );

  const imageUrls: string[] = [];
  for (const raw of rawImageUrls) {
    try {
      const absolute = new URL(raw, pageUrl).toString();
      if (!imageUrls.includes(absolute)) imageUrls.push(absolute);
    } catch {
      // Ignore malformed image URLs.
    }
  }

  const normalizedImageUrls = imageUrls.slice(0, 8);
  imageUrl = normalizedImageUrls[0];
  const siteName = ogSiteName ?? new URL(pageUrl).hostname.replace(/^www\./, "");

  const fallbackPrice =
    firstAttr('[itemprop="price"]', "content") ??
    firstText('[itemprop="price"]') ??
    firstAttr("[data-price]", "data-price") ??
    firstText('.price, .product-price, [class*="price"]');

  const { price, currency } = parsePriceAndCurrency(
    jsonLdPrice !== undefined ? String(jsonLdPrice) : (ogPrice ?? fallbackPrice),
    jsonLdCurrency ?? ogCurrency,
  );

  if (rating === undefined) {
    rating = asNumber(
      firstAttr('[itemprop="ratingValue"]', "content") ??
        firstText('[itemprop="ratingValue"]') ??
        meta('meta[itemprop="ratingValue"]'),
    );
  }

  if (reviewCount === undefined) {
    reviewCount = asNumber(
      firstAttr('[itemprop="reviewCount"]', "content") ??
        firstText('[itemprop="reviewCount"]') ??
        meta('meta[itemprop="reviewCount"]'),
    );
  }

  if (reviewBodies.length === 0) {
    $('[itemprop="reviewBody"], .review-body, .review-text, .review-content').each(
      (_, element) => {
        const text = stripHtml($(element).text());
        if (text) reviewBodies.push(text.slice(0, 500));
      },
    );
  }

  const brandFallback =
    firstText('[itemprop="brand"]') ??
    firstAttr('meta[property="product:brand"]', "content");

  const body = $("body").clone();
  body.find("script, style, noscript, svg, header, footer, nav, form").remove();
  const visibleText = body.text().replace(/\s+/g, " ").trim().slice(0, 12_000);

  return {
    title: title?.slice(0, 300),
    description: description?.slice(0, 2_000),
    imageUrl,
    imageUrls: normalizedImageUrls,
    price,
    currency,
    brand: brand ?? brandFallback,
    rating,
    reviewCount,
    reviewBodies: reviewBodies.slice(0, 4),
    siteName,
    visibleText,
  };
}
