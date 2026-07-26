// Stateless, signed session cookie for the connected-hub Worker.
//
// No sessions table in D1 — the cookie itself is the source of truth,
// HMAC-SHA256 signed so it can't be forged or tampered with without
// SESSION_SECRET (a Worker secret, never in this repo). This is enough
// for "who is making this request," which is all Phase 2 needs; it is
// not a general-purpose JWT library.

const SESSION_COOKIE = "bg_hub_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function base64urlEncode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function importSessionKey(env) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function createSessionToken(env, { orcid, name }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { orcid, name: name || null, iat: now, exp: now + SESSION_TTL_SECONDS };
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));

  const key = await importSessionKey(env);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));

  return `${payloadB64}.${base64urlEncode(new Uint8Array(signature))}`;
}

async function verifySessionToken(env, token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signatureB64] = parts;

  const key = await importSessionKey(env);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(signatureB64),
    new TextEncoder().encode(payloadB64)
  );
  if (!valid) return null;

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  if (typeof payload.orcid !== "string") return null;

  return payload;
}

function sessionCookieHeader(token, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}; Path=/`;
}

function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  sessionCookieHeader,
  clearSessionCookieHeader,
  getCookie,
};
