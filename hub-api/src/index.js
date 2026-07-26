// bri-gest connected-hub Worker.
//
// Phase 1 (done): deploy pipeline + ORCID OAuth against the sandbox
// registry. Phase 2: a session (done) built on that identity, and now
// the single primitive emission event from the build order (section 5,
// item 2) — forwarding a saved article into the shared pool, writing to
// D1 and reading it back. Deliberately only one event type
// (flag_interesting) here; richer judgment types are a later step, once
// real content exists to design them against.

import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  sessionCookieHeader,
  clearSessionCookieHeader,
  getCookie,
} from "./session.js";

const OAUTH_STATE_COOKIE = "orcid_oauth_state";
const ALLOWED_SOURCE_TOOLS = ["endo", "gm", "hub"];
const PMID_PATTERN = /^\d{1,10}$/;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function clearOauthStateCookieHeader() {
  return `${OAUTH_STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/auth/orcid`;
}

function handleLogin(env) {
  const state = crypto.randomUUID().replace(/-/g, "");

  const authorizeUrl = new URL(env.ORCID_AUTH_BASE + "/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.ORCID_CLIENT_ID);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "/authenticate");
  authorizeUrl.searchParams.set("redirect_uri", env.ORCID_REDIRECT_URI);
  authorizeUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Set-Cookie": `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/auth/orcid`,
    },
  });
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieState = getCookie(request, OAUTH_STATE_COOKIE);

  if (oauthError) {
    return new Response(`ORCID login failed: ${escapeHtml(oauthError)}`, {
      status: 400,
      headers: { "Set-Cookie": clearOauthStateCookieHeader() },
    });
  }

  // Missing/mismatched state means this isn't a request we initiated —
  // reject rather than proceed to token exchange.
  if (!code || !state || !cookieState || state !== cookieState) {
    return new Response("Invalid or missing OAuth state — please try logging in again.", {
      status: 400,
      headers: { "Set-Cookie": clearOauthStateCookieHeader() },
    });
  }

  const tokenResponse = await fetch(env.ORCID_AUTH_BASE + "/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: env.ORCID_CLIENT_ID,
      client_secret: env.ORCID_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.ORCID_REDIRECT_URI,
    }),
  });

  const tokenBody = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenBody.orcid) {
    return new Response(
      `ORCID token exchange failed: ${escapeHtml(tokenBody.error_description || tokenBody.error || "unknown error")}`,
      { status: 502, headers: { "Set-Cookie": clearOauthStateCookieHeader() } }
    );
  }

  // /authenticate scope returns the ORCID iD + name directly in the token
  // response — no separate userinfo call needed. The ORCID access token
  // itself is discarded here: this Worker only needs the confirmed
  // identity, not ongoing ORCID API access on the user's behalf.
  const sessionToken = await createSessionToken(env, { orcid: tokenBody.orcid, name: tokenBody.name });

  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8" });
  headers.append("Set-Cookie", clearOauthStateCookieHeader());
  headers.append("Set-Cookie", sessionCookieHeader(sessionToken, SESSION_TTL_SECONDS));

  return new Response(
    `<!doctype html><html><body>
      <h1>ORCID sign-in confirmed (${escapeHtml(env.STAGE)})</h1>
      <p>ORCID iD: ${escapeHtml(tokenBody.orcid)}</p>
      <p>Name: ${escapeHtml(tokenBody.name || "(not provided)")}</p>
      <p>Signed in — session cookie set. Check <a href="/me">/me</a> to confirm.</p>
    </body></html>`,
    { status: 200, headers }
  );
}

async function handleMe(request, env) {
  const session = await verifySessionToken(env, getCookie(request, SESSION_COOKIE));

  if (!session) {
    return Response.json({ signedIn: false }, { status: 401 });
  }

  return Response.json({ signedIn: true, orcid: session.orcid, name: session.name });
}

function handleLogout() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearSessionCookieHeader() },
  });
}

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

function trimToLength(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) || null : null;
}

async function requireSession(request, env) {
  const session = await verifySessionToken(env, getCookie(request, SESSION_COOKIE));
  return session; // null if not signed in / expired / tampered
}

// The single primitive event from the build order: an ORCID-identified
// person flags a PMID as of interest to others. One hardcoded event_type
// on purpose — a generic multi-type endpoint is a later step, once
// richer judgment types are actually being built (design doc section 5).
async function handleCreateEvent(request, env) {
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ error: "sign in required" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid JSON body");
  }

  const pmid = typeof body.pmid === "string" ? body.pmid.trim() : "";
  if (!PMID_PATTERN.test(pmid)) {
    return badRequest("pmid must be a numeric PubMed ID");
  }

  if (!ALLOWED_SOURCE_TOOLS.includes(body.source_tool)) {
    return badRequest(`source_tool must be one of: ${ALLOWED_SOURCE_TOOLS.join(", ")}`);
  }

  const topicId = trimToLength(body.topic_id, 100);
  const cachedTitle = trimToLength(body.cached_title, 500);
  const cachedJournal = trimToLength(body.cached_journal, 300);

  // cached_title/cached_journal are display-only, written once at
  // emission time from whatever the caller already fetched from PubMed
  // (D2) — this Worker never fetches article content itself.
  const row = await env.DB.prepare(
    `INSERT INTO judgment_events
       (orcid_id, pmid, event_type, schema_version, source_tool, topic_id, payload, cached_title, cached_journal)
     VALUES (?, ?, 'flag_interesting', 1, ?, ?, '{}', ?, ?)
     RETURNING *`
  )
    .bind(session.orcid, pmid, body.source_tool, topicId, cachedTitle, cachedJournal)
    .first();

  return Response.json({ event: row }, { status: 201 });
}

// Read-back for the same PMID — proves the write actually persisted
// (not just that RETURNING echoed it back in the same request) and
// doubles as the minimal read path a future frontend needs.
async function handleListEvents(request, env, url) {
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ error: "sign in required" }, { status: 401 });
  }

  const pmid = (url.searchParams.get("pmid") || "").trim();
  if (!PMID_PATTERN.test(pmid)) {
    return badRequest("pmid query param must be a numeric PubMed ID");
  }

  const { results } = await env.DB.prepare(
    `SELECT id, orcid_id, pmid, event_type, source_tool, topic_id, cached_title, cached_journal, created_at
     FROM judgment_events WHERE pmid = ? ORDER BY created_at DESC`
  )
    .bind(pmid)
    .all();

  return Response.json({ events: results });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        stage: env.STAGE,
        version: env.HUB_VERSION,
      });
    }

    if (url.pathname === "/auth/orcid/login") {
      return handleLogin(env);
    }

    if (url.pathname === "/auth/orcid/callback") {
      return handleCallback(request, env);
    }

    if (url.pathname === "/me") {
      return handleMe(request, env);
    }

    if (url.pathname === "/auth/logout") {
      return handleLogout();
    }

    if (url.pathname === "/events" && request.method === "POST") {
      return handleCreateEvent(request, env);
    }

    if (url.pathname === "/events" && request.method === "GET") {
      return handleListEvents(request, env, url);
    }

    return new Response("Not found", { status: 404 });
  },
};
