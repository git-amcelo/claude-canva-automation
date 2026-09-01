import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Canva Connect OAuth (PKCE) + local token store.
 *
 * One-time setup (see README/.env.local.example):
 *  1. Create an integration at https://www.canva.com/developers/integrations
 *  2. Add redirect URL: http://127.0.0.1:3000/api/canva/callback
 *  3. Enable scopes: design:content:write, design:meta:read
 *  4. Put the client ID/secret in .env.local
 *
 * Tokens are stored in .canva/tokens.json (git-ignored) — this is a local,
 * single-user tool, so a file is the appropriate "database".
 */

const AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const SCOPES = "design:content:write design:meta:read";

const TOKENS_DIR = path.join(process.cwd(), ".canva");
const TOKENS_PATH = path.join(TOKENS_DIR, "tokens.json");

/** state → PKCE code verifier, for the in-flight OAuth handshake. */
export const pkceStore = new Map<string, string>();

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  /** Epoch ms when the access token expires. */
  expires_at: number;
}

export function getCanvaCreds(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  const redirectUri = process.env.CANVA_REDIRECT_URI || "http://127.0.0.1:3000/api/canva/callback";
  if (!clientId || !clientSecret) {
    throw new Error(
      "Canva isn't configured yet. Create an integration at canva.com/developers/integrations, then set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET in .env.local and restart the app."
    );
  }
  return { clientId, clientSecret, redirectUri };
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Builds the authorize URL and remembers the PKCE verifier under `state`. */
export function beginAuth(): string {
  const { clientId, redirectUri } = getCanvaCreds();
  const state = base64url(randomBytes(24));
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  pkceStore.set(state, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(body: URLSearchParams): Promise<StoredTokens> {
  const { clientId, clientSecret } = getCanvaCreds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Canva token request failed (HTTP ${res.status}): ${JSON.stringify(json)}`);
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (Number(json.expires_in) || 3600) * 1000,
  };
}

async function saveTokens(tokens: StoredTokens): Promise<void> {
  await mkdir(TOKENS_DIR, { recursive: true });
  await writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

async function loadTokens(): Promise<StoredTokens | null> {
  try {
    return JSON.parse(await readFile(TOKENS_PATH, "utf-8"));
  } catch {
    return null;
  }
}

/** Completes the OAuth handshake after the callback redirect. */
export async function finishAuth(code: string, state: string): Promise<void> {
  const { redirectUri } = getCanvaCreds();
  const verifier = pkceStore.get(state);
  pkceStore.delete(state);
  if (!verifier) {
    throw new Error("OAuth state mismatch — the dev server may have restarted mid-connect. Try connecting again.");
  }
  const tokens = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
  );
  await saveTokens(tokens);
}

/** Returns a valid access token (refreshing if needed), or null if not connected. */
export async function getAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;
  if (tokens.expires_at - 60_000 > Date.now()) return tokens.access_token;

  try {
    const refreshed = await tokenRequest(
      new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token })
    );
    await saveTokens(refreshed);
    return refreshed.access_token;
  } catch {
    return null; // refresh token expired/revoked — user must reconnect
  }
}
