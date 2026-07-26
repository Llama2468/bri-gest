// bri-gest connected-hub Worker.
//
// Phase 1: prove the deploy pipeline works (/health) and get ORCID OAuth
// working end-to-end against the sandbox registry, token exchange
// happening here server-side per D1 (confidential client — the secret
// never reaches a frontend). See CONNECTED-HUB-DESIGN.md section 5 for
// the build order this deliberately stops short of: no judgment-event
// emission, no session/D1 writes yet. That's Phase 2.

const STATE_COOKIE = "orcid_oauth_state";

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
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
      "Set-Cookie": `${STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/auth/orcid`,
    },
  });
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieState = getCookie(request, STATE_COOKIE);
  const clearCookie = `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/auth/orcid`;

  if (oauthError) {
    return new Response(`ORCID login failed: ${escapeHtml(oauthError)}`, {
      status: 400,
      headers: { "Set-Cookie": clearCookie },
    });
  }

  // Missing/mismatched state means this isn't a request we initiated —
  // reject rather than proceed to token exchange.
  if (!code || !state || !cookieState || state !== cookieState) {
    return new Response("Invalid or missing OAuth state — please try logging in again.", {
      status: 400,
      headers: { "Set-Cookie": clearCookie },
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
      { status: 502, headers: { "Set-Cookie": clearCookie } }
    );
  }

  // /authenticate scope returns the ORCID iD + name directly in the token
  // response — no separate userinfo call needed. The access token itself
  // is discarded here: this phase only confirms identity, it doesn't open
  // a session or write anything (Phase 2).
  return new Response(
    `<!doctype html><html><body>
      <h1>ORCID sign-in confirmed (${escapeHtml(env.STAGE)})</h1>
      <p>ORCID iD: ${escapeHtml(tokenBody.orcid)}</p>
      <p>Name: ${escapeHtml(tokenBody.name || "(not provided)")}</p>
    </body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": clearCookie },
    }
  );
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

    return new Response("Not found", { status: 404 });
  },
};
