import { type NewsExploreArticle } from "../../api/news.api";

export const LIVE_NEWS_PAGE_SIZE = 20;



// ── News System ─────────────────────────────────────────────

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: string;
  publishedAt: string;
  category: string;
}

export const LIVE_NEWS_SESSION_CACHE: {
  articles: NewsArticle[];
  lastFetched: number;
  currentPage: number;
  hasMore: boolean;
  total: number;
  cacheMeta: { ts: number; city: string; country: string; phase: "primary" | "full" } | null;
  savedIds: string[];
} = {
  articles: [],
  lastFetched: 0,
  currentPage: 1,
  hasMore: false,
  total: 0,
  cacheMeta: null,
  savedIds: [],
};

export function mapExploreArticleToUi(a: NewsExploreArticle): NewsArticle {
  return {
    id: a.id,
    title: a.title,
    description: a.description ?? "",
    url: a.url,
    image: a.image,
    source: a.source,
    publishedAt: a.publishedAt,
    category: a.category,
  };
}

export const BASE_NEWS_CATEGORIES = [
  { id: "all",    label: "All News",  emoji: "📰",  icon: "newspaper-outline"    as const },
  { id: "local",  label: "Local",     emoji: "📍",  icon: "location-outline"     as const },
  { id: "nation", label: "National",  emoji: "🏛️", icon: "flag-outline"          as const },
  { id: "world",  label: "World",     emoji: "🌍",  icon: "globe-outline"         as const },
] as const;

export type NewsCategory = string;

// Country → Google News geo code & language mapping
export const COUNTRY_NEWS_MAP: Record<string, { gl: string; hl: string; flag: string }> = {
  "United States":  { gl: "US", hl: "en-US", flag: "🇺🇸" },
  "United Kingdom": { gl: "GB", hl: "en-GB", flag: "🇬🇧" },
  "Canada":         { gl: "CA", hl: "en-CA", flag: "🇨🇦" },
  "Australia":      { gl: "AU", hl: "en-AU", flag: "🇦🇺" },
  "India":          { gl: "IN", hl: "en-IN", flag: "🇮🇳" },
  "Germany":        { gl: "DE", hl: "de",    flag: "🇩🇪" },
  "France":         { gl: "FR", hl: "fr",    flag: "🇫🇷" },
  "Japan":          { gl: "JP", hl: "ja",    flag: "🇯🇵" },
  "Brazil":         { gl: "BR", hl: "pt-BR", flag: "🇧🇷" },
  "Mexico":         { gl: "MX", hl: "es-MX", flag: "🇲🇽" },
  "Spain":          { gl: "ES", hl: "es",    flag: "🇪🇸" },
  "Italy":          { gl: "IT", hl: "it",    flag: "🇮🇹" },
  "Netherlands":    { gl: "NL", hl: "nl",    flag: "🇳🇱" },
  "South Korea":    { gl: "KR", hl: "ko",    flag: "🇰🇷" },
  "Nigeria":        { gl: "NG", hl: "en-NG", flag: "🇳🇬" },
  "South Africa":   { gl: "ZA", hl: "en-ZA", flag: "🇿🇦" },
  "UAE":            { gl: "AE", hl: "en",    flag: "🇦🇪" },
  "Singapore":      { gl: "SG", hl: "en-SG", flag: "🇸🇬" },
  "New Zealand":    { gl: "NZ", hl: "en-NZ", flag: "🇳🇿" },
  "Ireland":        { gl: "IE", hl: "en-IE", flag: "🇮🇪" },
  "Pakistan":       { gl: "PK", hl: "en-PK", flag: "🇵🇰" },
  "Bangladesh":     { gl: "BD", hl: "en-BD", flag: "🇧🇩" },
  "Philippines":    { gl: "PH", hl: "en-PH", flag: "🇵🇭" },
  "Kenya":          { gl: "KE", hl: "en-KE", flag: "🇰🇪" },
};

/** Time-ago helper for news timestamps */
export function newsTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Simple XML text extractor — no library needed */
export function xmlTag(xml: string, tag: string): string {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = xml.indexOf(open);
  if (start === -1) return "";
  const end = xml.indexOf(close, start);
  if (end === -1) return "";
  return xml.slice(start + open.length, end).replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}


/** Check whether two strings are essentially the same content */
export function isSameContent(a: string, b: string): boolean {
  if (!a || !b) return false;
  const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleanA === cleanB) return true;
  // Check if one contains the other (e.g. title is just description truncated)
  if (cleanA.length > 10 && cleanB.length > 10) {
    if (cleanA.startsWith(cleanB.slice(0, 30)) || cleanB.startsWith(cleanA.slice(0, 30))) return true;
  }
  return false;
}

/** Decode HTML entities (used by article meta enrichment) */
export function decodeEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Decode a Google News redirect URL to the real article URL.
 * Google News article IDs (CBMi...) are base64-encoded protobuf blobs
 * that contain the real source URL as a plain substring.
 */
export function decodeGoogleNewsUrl(googleUrl: string): string | null {
  try {
    const match = googleUrl.match(/\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    // base64url → standard base64 + padding
    let b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const decoded = atob(b64);
    // The real URL is embedded as a plain string inside the protobuf blob
    const httpsIdx = decoded.indexOf("https://");
    if (httpsIdx !== -1) {
      // Trim any trailing null bytes or control chars
      return decoded.slice(httpsIdx).replace(/[\x00-\x1F\x7F].*/s, "");
    }
    const httpIdx = decoded.indexOf("http://");
    if (httpIdx !== -1) {
      return decoded.slice(httpIdx).replace(/[\x00-\x1F\x7F].*/s, "");
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetch og:image and og:description from an article URL.
 *  Automatically decodes Google News redirect URLs to reach the real article. */
export async function fetchArticleMeta(url: string): Promise<{ image: string | null; description: string | null }> {
  try {
    if (!url || url === "#") return { image: null, description: null };
    // Decode Google News redirect → real article URL
    const realUrl = (url.includes("news.google.com") ? decodeGoogleNewsUrl(url) : null) ?? url;
    if (!realUrl || realUrl === "#") return { image: null, description: null };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(realUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return { image: null, description: null };
    const text = await resp.text();
    const head = text.slice(0, 80000);

    let image: string | null = null;
    let description: string | null = null;

    // ── Extract image ──
    const imgPatterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["'](https?:\/\/[^"']+)["']/i,
      /<meta[^>]+content=["'](https?:\/\/[^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image[^"']*["'][^>]+content=["'](https?:\/\/[^"']+)["']/i,
      /<meta[^>]+content=["'](https?:\/\/[^"']+)["'][^>]+name=["']twitter:image[^"']*["']/i,
    ];
    for (const pat of imgPatterns) {
      const m = head.match(pat);
      if (m) { image = m[1]; break; }
    }

    // ── Extract description ──
    const descPatterns = [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{20,})["']/i,
      /<meta[^>]+content=["']([^"']{20,})["'][^>]+property=["']og:description["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{20,})["']/i,
      /<meta[^>]+content=["']([^"']{20,})["'][^>]+name=["']description["']/i,
    ];
    for (const pat of descPatterns) {
      const m = head.match(pat);
      if (m) {
        description = decodeEntities(m[1]).trim();
        // Clean up if it's too long
        if (description.length > 350) description = description.slice(0, 350) + "…";
        break;
      }
    }

    return { image, description };
  } catch {
    return { image: null, description: null };
  }
}

/** Strip HTML tags and clean text for display */
export function stripHtml(html: string): string {
  if (!html) return "";
  // 1. Decode HTML entities so encoded tags become real tags
  let text = decodeEntities(html);
  // 2. Strip all HTML tags
  text = text.replace(/<[^>]*>/g, "");
  // 3. Decode any remaining double-encoded entities
  text = decodeEntities(text);
  // 4. Remove any bare URLs (Google News links, tracking URLs, etc.)
  text = text.replace(/https?:\/\/\S+/g, "");
  // 5. Remove "Google News" or source attribution artifacts
  text = text.replace(/\s*-\s*Google News\s*/gi, "");
  // 6. Collapse whitespace and trim
  return text.replace(/\s{2,}/g, " ").trim();
}

/** Parse Google News RSS description which is often an HTML ordered list with multiple
 *  sub-articles from different sources. We extract related headline snippets for context. */
export function parseGoogleNewsDescription(descHtml: string, title: string): string {
  if (!descHtml) return "";
  const decoded = decodeEntities(descHtml);

  // Extract all anchor texts — first is the main article title, rest are related
  const anchors: string[] = [];
  const anchorRegex = /<a[^>]*>([^<]+)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(decoded)) !== null) {
    const t = m[1].trim();
    if (t.length > 10) anchors.push(t);
  }

  // Related = any anchor that is NOT essentially the same as the main title
  const related = anchors.filter((a) => !isSameContent(a, title));

  if (related.length > 0) {
    return "Also covered: " + [...new Set(related)].slice(0, 3).join(" · ");
  }

  // Fallback: strip all HTML, remove title prefix, use remaining source/snippet text
  let plain = stripHtml(descHtml).replace(/https?:\/\/\S+/gi, "").replace(/\s{2,}/g, " ").trim();
  // If the plain text starts with the article title, skip past it
  if (plain.toLowerCase().startsWith(title.toLowerCase().slice(0, Math.min(30, title.length)))) {
    plain = plain.slice(Math.floor(title.length * 0.9)).replace(/^[\s\W]+/, "").trim();
  }
  if (plain.length > 20) return plain.slice(0, 300);
  return "";
}

/** Parse RSS XML text directly — no third-party proxy, no item cap */
export async function fetchRSS(
  rssUrl: string,
  category: string = "world",
  idPrefix: string = "rss",
): Promise<NewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(rssUrl, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return [];
    const xml = await resp.text();

    // Extract channel/feed title (first <title> inside <channel>)
    const chanTitleMatch = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
    let feedTitle = "News";
    if (chanTitleMatch) {
      let t = chanTitleMatch[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
      feedTitle = stripHtml(t).replace(/\s*[|\-–].*/g, "").trim() || "News";
    }

    // Helper: extract a tag's text, stripping CDATA and HTML
    const getTag = (block: string, tag: string): string => {
      const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
      if (!m) return "";
      let val = m[1].trim();
      // Strip CDATA wrapper
      val = val.replace(/^<!\[CDATA\[\s*/, "").replace(/\s*\]\]>$/, "").trim();
      return val;
    };

    // Split into <item> blocks (lazy match stops at first </item>)
    const itemBlocks = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m => m[1]);

    const isGoogleNews = idPrefix === "gnews";

    return itemBlocks.slice(0, 20).map((block, i) => {
      const rawTitle = stripHtml(getTag(block, "title"));
      const cleanTitle = rawTitle.split(" - ")[0]?.trim() || rawTitle;

      // Link: <link> text or guid with isPermaLink
      const link = block.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim()
        || block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.trim()
        || block.match(/<guid[^>]*>([^<]+)<\/guid>/i)?.[1]?.trim()
        || "#";

      const pubDate = getTag(block, "pubDate") || getTag(block, "published") || getTag(block, "dc:date") || "";

      // Description
      const rawDesc = getTag(block, "description");
      let description: string;
      if (isGoogleNews) {
        description = parseGoogleNewsDescription(rawDesc, cleanTitle);
      } else {
        description = stripHtml(rawDesc).slice(0, 400);
      }
      // Remove trailing " - Source" artifacts
      description = description.replace(/\s*-\s*[A-Z][^-]{0,40}$/, "").trim();

      return {
        id: `${idPrefix}-${category}-${i}-${Date.now()}`,
        title: cleanTitle,
        description,
        url: link,
        image: "",
        source: feedTitle,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        category,
      };
    });
  } catch {
    return [];
  }
}

/** Fetch from Google News RSS (location/query based, images via loremflickr fallback) */
export async function fetchGoogleNewsRSS(
  query: string,
  gl: string = "US",
  hl: string = "en-US",
  categoryForImages: string = "world",
): Promise<NewsArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split("-")[0]}`;
  return fetchRSS(url, categoryForImages, "gnews");
}

/** Fetch location-based news for multiple categories in parallel */
export async function fetchAllNews(
  cityName: string,
  countryName: string,
): Promise<{ local: NewsArticle[]; national: NewsArticle[]; world: NewsArticle[]; topics: Record<string, NewsArticle[]> }> {
  const geo = COUNTRY_NEWS_MAP[countryName] || { gl: "US", hl: "en-US", flag: "🇺🇸" };

  // Local/national: Google News (location-aware, loremflickr image fallback)
  // Categories: direct source RSS feeds that include real article images in <media:thumbnail>
  const [local, national, world, biz, tech, health, sports, entertainment] = await Promise.all([
    fetchGoogleNewsRSS(`${cityName} news`, geo.gl, geo.hl, "local"),
    fetchGoogleNewsRSS(`${countryName} news today`, geo.gl, geo.hl, "nation"),
    fetchRSS("https://feeds.bbci.co.uk/news/world/rss.xml", "world", "bbc"),
    fetchRSS("https://feeds.bbci.co.uk/news/business/rss.xml", "business", "bbc"),
    fetchRSS("https://feeds.bbci.co.uk/news/technology/rss.xml", "technology", "bbc"),
    fetchRSS("https://feeds.bbci.co.uk/news/health/rss.xml", "health", "bbc"),
    fetchRSS("https://feeds.bbci.co.uk/sport/rss.xml", "sports", "bbc"),
    fetchRSS("https://feeds.bbci.co.uk/news/entertainment_arts/rss.xml", "entertainment", "bbc"),
  ]);

  return {
    local: local.map((a) => ({ ...a, category: "local" })),
    national: national.map((a) => ({ ...a, category: "nation" })),
    world: world.map((a) => ({ ...a, category: "world" })),
    topics: {
      business: biz.map((a) => ({ ...a, category: "business" })),
      technology: tech.map((a) => ({ ...a, category: "technology" })),
      health: health.map((a) => ({ ...a, category: "health" })),
      sports: sports.map((a) => ({ ...a, category: "sports" })),
      entertainment: entertainment.map((a) => ({ ...a, category: "entertainment" })),
    },
  };
}
// Static fallback news when live RSS fails or returns empty
export const FALLBACK_NEWS: NewsArticle[] = [
  { id: "fb-1", title: "City Council Approves New Public Transit Plan", description: "A major expansion of bus and rail lines aims to reduce commute times by 30%. Construction begins this summer with phased rollouts over 3 years.", url: "#", image: "https://loremflickr.com/400/220/transportation?lock=1", source: "Local News", publishedAt: new Date(Date.now() - 3600000).toISOString(), category: "local" },
  { id: "fb-2", title: "Tech Layoffs Slow as Hiring Picks Up in AI Sector", description: "After a turbulent year, major tech companies are ramping up hiring in artificial intelligence and machine learning divisions.", url: "#", image: "https://loremflickr.com/400/220/technology?lock=2", source: "Tech Weekly", publishedAt: new Date(Date.now() - 7200000).toISOString(), category: "technology" },
  { id: "fb-3", title: "New Study Links Daily Walking to Longer Lifespan", description: "Researchers found that just 20 minutes of walking per day can significantly reduce the risk of heart disease and improve mental health.", url: "#", image: "https://loremflickr.com/400/220/medical?lock=3", source: "Health Today", publishedAt: new Date(Date.now() - 10800000).toISOString(), category: "health" },
  { id: "fb-4", title: "Housing Market Shows Signs of Cooling in Major Cities", description: "Home prices dipped slightly in 15 of the top 20 metro areas, giving first-time buyers a potential window of opportunity.", url: "#", image: "https://loremflickr.com/400/220/architecture?lock=4", source: "Real Estate Report", publishedAt: new Date(Date.now() - 14400000).toISOString(), category: "business" },
  { id: "fb-5", title: "Local Restaurant Week Kicks Off with 150+ Participating Spots", description: "Food lovers can enjoy prix-fixe menus at restaurants across the city. Special deals run through the end of the month.", url: "#", image: "https://loremflickr.com/400/220/food?lock=5", source: "City Eats", publishedAt: new Date(Date.now() - 18000000).toISOString(), category: "local" },
  { id: "fb-6", title: "Global Climate Summit Reaches Historic Agreement", description: "World leaders committed to cutting carbon emissions by 50% by 2035 in a landmark deal that includes binding targets for all major economies.", url: "#", image: "https://loremflickr.com/400/220/nature?lock=6", source: "World News", publishedAt: new Date(Date.now() - 21600000).toISOString(), category: "world" },
  { id: "fb-7", title: "Championship Finals Set After Dramatic Overtime Win", description: "An incredible buzzer-beater shot sent the home team to the championship finals for the first time in a decade.", url: "#", image: "https://loremflickr.com/400/220/sports?lock=7", source: "Sports Desk", publishedAt: new Date(Date.now() - 25200000).toISOString(), category: "sports" },
  { id: "fb-8", title: "New Streaming Platform Launches with Exclusive Original Series", description: "The platform debuts with 20 original shows and a competitive price point designed to shake up the streaming wars.", url: "#", image: "https://loremflickr.com/400/220/concert?lock=8", source: "Entertainment Buzz", publishedAt: new Date(Date.now() - 28800000).toISOString(), category: "entertainment" },
  { id: "fb-9", title: "Community Volunteers Clean Up Riverfront Area", description: "Over 300 volunteers gathered this weekend to remove debris and plant trees along the riverfront as part of a city-wide beautification effort.", url: "#", image: "https://loremflickr.com/400/220/city?lock=9", source: "Community Today", publishedAt: new Date(Date.now() - 32400000).toISOString(), category: "local" },
  { id: "fb-10", title: "Federal Reserve Holds Interest Rates Steady", description: "The central bank kept rates unchanged, citing steady economic growth but cautioning about persistent inflation in the services sector.", url: "#", image: "https://loremflickr.com/400/220/finance?lock=10", source: "Financial Times", publishedAt: new Date(Date.now() - 36000000).toISOString(), category: "nation" },
];
