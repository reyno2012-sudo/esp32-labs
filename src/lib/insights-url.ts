// The guide is a hash-routed app (#/lessons/R3), so every page has the same real path ("/") and
// Vercel Web Analytics would count all visits as one page. Before an event leaves the browser, the
// router path in the hash becomes the URL's path: https://host/#/lessons/R3 -> https://host/lessons/R3.

/** The URL with its hash route (`#/path?query`) promoted to the path; anything else is returned as is. */
export function hashRouteUrl(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  return url.hash.startsWith("#/") ? `${url.origin}${url.hash.slice(1)}` : href;
}
