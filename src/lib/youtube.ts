export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("?")[0] ?? null;
    }
    const vParam = parsed.searchParams.get("v");
    if (vParam) return vParam;
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const embedIndex = pathParts.indexOf("embed");
    const shortsIndex = pathParts.indexOf("shorts");
    if (embedIndex !== -1) return pathParts[embedIndex + 1] ?? null;
    if (shortsIndex !== -1) return pathParts[shortsIndex + 1] ?? null;
    return null;
  } catch {
    return null;
  }
}
