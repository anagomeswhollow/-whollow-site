// Runs on EVERY request to the Pages site before it's served.
// This is the actual barrier: it executes server-side (on Cloudflare's
// edge), so it can't be skipped by disabling JavaScript or viewing
// page source — unlike a password box implemented only in front-end JS.
//
// Requires two environment variables set in the Cloudflare Pages
// project settings (Settings → Environment variables):
//   SITE_PASSWORD  — the password visitors type in
//   AUTH_SECRET    — a long random string used to sign the session cookie
// See README.md for exact steps.

import { verifySession, getCookie, COOKIE } from "./_lib/auth.js";

// Paths that must stay reachable WITHOUT a valid session, otherwise
// nobody could ever reach the login form or its assets.
const PUBLIC_PATHS = new Set([
  "/login.html",
  "/api/login",
  "/css/style.css",
  "/favicon.ico",
]);

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (PUBLIC_PATHS.has(url.pathname)) {
    return next();
  }

  if (!env.AUTH_SECRET || !env.SITE_PASSWORD) {
    return new Response(
      "Site is not configured yet: missing SITE_PASSWORD / AUTH_SECRET environment variables. See README.md.",
      { status: 500 }
    );
  }

  const cookieValue = getCookie(request, COOKIE);
  const valid = await verifySession(cookieValue, env.AUTH_SECRET);

  if (valid) {
    return next();
  }

  const redirectTo = encodeURIComponent(url.pathname + url.search);
  return Response.redirect(`${url.origin}/login.html?redirect=${redirectTo}`, 302);
}
