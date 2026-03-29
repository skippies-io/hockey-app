export function decodeGithubPagesRedirect(search, hash = "") {
  if (typeof search !== "string" || !search.startsWith("?/")) return null;

  const encoded = search.slice(2);
  if (!encoded) return hash || "";

  const decoded = encoded.replace(/~and~/g, "&");
  const [path, ...queryParts] = decoded.split("&");
  const query = queryParts.join("&");

  return `${path}${query ? `?${query}` : ""}${hash || ""}`;
}
