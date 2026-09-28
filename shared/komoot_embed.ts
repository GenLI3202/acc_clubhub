const KOMOOT_EMBED_PATH = /^\/(?:de-de\/)?tour\/\d+\/embed\/?$/;

export function normalize_komoot_embed_url(
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "www.komoot.com" ||
      url.port ||
      url.username ||
      url.password ||
      !KOMOOT_EMBED_PATH.test(url.pathname)
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}
