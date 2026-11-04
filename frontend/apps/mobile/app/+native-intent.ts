// Bridges Universal Links / App Links to in-app routes.
//
// Shared URLs look like https://www.comlinkr.com/app/<tab>?<param>=<id> (see
// src/utils/shareLinks.ts). The `/app` prefix exists only so the AASA `paths` entry and the
// Android `pathPrefix` can scope the claim to the share surface — it maps to no route in
// this app. Without this translation the OS opens the app and lands on the home screen
// instead of the shared item.

type Tab = 'feed' | 'community' | 'food' | 'housing';

const KNOWN_TABS: Tab[] = ['feed', 'community', 'food', 'housing'];

// Used for path-style links (/app/housing/<id>), where the param is implied by the tab
// rather than spelled out in the query string.
const DEFAULT_PARAM_FOR_TAB: Record<Tab, string> = {
  feed: 'openPost',
  community: 'openQuestion',
  food: 'openRestaurant',
  housing: 'openListing',
};

function isTab(value: string): value is Tab {
  return (KNOWN_TABS as string[]).includes(value);
}

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    // `path` arrives as a full URL for universal links, or as a bare path otherwise.
    // A comlinkr:// URL is a third shape: for a non-special scheme the parser treats the
    // first segment as the *host*, so comlinkr://app/housing/<id> yields pathname
    // "/housing/<id>" and the /app check below would miss it. Strip the scheme first and
    // let it be resolved as a plain path.
    const withoutScheme = path.startsWith('comlinkr://')
      ? `/${path.slice('comlinkr://'.length)}`
      : path;

    const parsed = withoutScheme.startsWith('http')
      ? new URL(withoutScheme)
      : new URL(withoutScheme, 'https://www.comlinkr.com');

    const pathname = parsed.pathname;
    if (pathname !== '/app' && !pathname.startsWith('/app/')) return path;

    const segments = pathname.split('/').filter(Boolean).slice(1); // drop "app"
    const [rawTab, id] = segments;

    if (!rawTab || !isTab(rawTab)) return '/(tabs)/feed';

    // Path style: /app/housing/<id>, and the legacy /app/feed/<id> post links.
    if (id) {
      const param = DEFAULT_PARAM_FOR_TAB[rawTab];
      return `/(tabs)/${rawTab}?${param}=${encodeURIComponent(decodeURIComponent(id))}`;
    }

    // Query style: /app/feed?openPost=<id>. The screens already consume these params,
    // so the query string passes through untouched.
    return `/(tabs)/${rawTab}${parsed.search}`;
  } catch {
    // Never let a malformed link crash the launch path.
    return path;
  }
}
