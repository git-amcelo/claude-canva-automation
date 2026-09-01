/**
 * Reads a JSON API response, or explains what actually came back.
 *
 * When a serverless function crashes, times out, or rejects an oversized body,
 * the platform answers with an HTML error page rather than JSON. Calling
 * `res.json()` on that throws "Unexpected token '<'", which says nothing about
 * the real problem. This surfaces the status and the likely cause instead.
 */
export async function readJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(describeNonJson(res, text, fallbackMessage));
  }

  if (!res.ok) {
    const message = (parsed as { error?: string } | null)?.error;
    throw new Error(message || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return parsed as T;
}

function describeNonJson(res: Response, body: string, fallbackMessage: string): string {
  if (res.status === 413) {
    return "That request was too large for the server. Try again with fewer or smaller photos.";
  }
  if (res.status === 504 || res.status === 408) {
    return "The server took too long to respond. Try again, or with fewer slides.";
  }
  if (res.status === 404) {
    return "That endpoint wasn't found on the server — the deployment may be out of date.";
  }
  if (res.status >= 500) {
    return `The server hit an error (HTTP ${res.status}). Check the deployment logs for the failing request.`;
  }
  // Unexpected but not obviously classifiable — include a snippet so the real
  // cause is at least visible rather than hidden behind a parser error.
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 120);
  return `${fallbackMessage} — the server returned ${res.status} and not JSON. ${snippet}`;
}
