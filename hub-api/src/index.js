// bri-gest connected-hub Worker.
//
// Phase 1 (done): deploy pipeline + ORCID OAuth against the sandbox
// registry. Phase 2, step 1 (this file, now): turn a confirmed ORCID
// identity into a session, so a later request (like the first
// judgment-event emission) knows who's making it without repeating the
// OAuth dance every time. Still no judgment-event emission or D1 writes
// here — that's next. See CONNECTED-HUB-DESIGN.md section 5.

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

    return new Response("Not found", { status: 404 });
  },
};
