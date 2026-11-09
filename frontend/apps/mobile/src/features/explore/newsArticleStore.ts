// src/features/explore/newsArticleStore.ts — what the news article route (app/news/[id].tsx, TR-017) shares with the
// Explore feed: the article the feed just opened (so the route shows it at once, with no request), and the
// like / save / comment changes made on the route (so the feed's cards match when the user comes back).
import { LIVE_NEWS_SESSION_CACHE, type NewsArticle } from "./news";

const remembered = new Map<string, NewsArticle>();

/** Called by the feed before it opens an article. */
export function rememberArticle(article: NewsArticle) {
  remembered.delete(article.id);
  remembered.set(article.id, article);
  if (remembered.size > 50) {
    const oldest = remembered.keys().next().value;
    if (oldest !== undefined) remembered.delete(oldest);
  }
}

/** The article as the feed last had it, if this session saw it. */
export function peekArticle(id: string): NewsArticle | undefined {
  return remembered.get(id) ?? LIVE_NEWS_SESSION_CACHE.articles.find((a) => a.id === id);
}

export type NewsPatch = { id: string; liked?: boolean; likeCount?: number; saved?: boolean; commentCount?: number };
const listeners = new Set<(p: NewsPatch) => void>();

export function onNewsPatch(fn: (p: NewsPatch) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitNewsPatch(p: NewsPatch) {
  listeners.forEach((fn) => fn(p));
}
