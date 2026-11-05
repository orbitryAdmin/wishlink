import { assertSafeUrl } from "../url-safety";

const MAX_PAGE_BYTES = 2_500_000;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 15_000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const BROWSER_HEADERS: Record<string, string> = {
  "user-agent": USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

export type FetchedPage = {
  url: string;
  html: string;
};

export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  let url = await assertSafeUrl(rawUrl);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    let response: Response;

    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: BROWSER_HEADERS,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error("The website took too long to respond.");
      }
      throw new Error("Could not reach that website.");
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("The website returned an invalid redirect.");
      }

      url = await assertSafeUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`The website returned an error (${response.status}).`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("That link does not point to a product page.");
    }

    const html = await readLimitedBody(response);
    return { url: url.toString(), html };
  }

  throw new Error("Too many redirects.");
}

async function readLimitedBody(response: Response) {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > MAX_PAGE_BYTES) {
      await reader.cancel();
      throw new Error("That page is too large to read.");
    }

    chunks.push(value);
  }

  return new TextDecoder("utf-8").decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}
