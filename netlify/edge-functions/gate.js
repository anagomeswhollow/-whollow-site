// Netlify Edge Function — the real password barrier.
// Runs on Netlify's edge for every request before any file is served,
// so it can't be bypassed by disabling JS or viewing page source.
//
// Requires two environment variables set in Netlify (Site settings →
// Environment variables), with scope set to include "Functions":
//   SITE_PASSWORD  — the password visitors type in
//   AUTH_SECRET    — a long random string used to sign the session cookie
// See README.md for exact steps. Note: Netlify Edge Functions must read
// these via the global `Netlify.env` API, not `Deno.env` — Deno.env is
// not reliably populated with your dashboard vars in production.

const COOKIE_NAME = "whollow_auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const PUBLIC_PATHS = new Set([
  "/login.html",
  "/css/style.css",
  "/favicon.ico",
]);

function toBase64Url(bytes) {
  let str = "";
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(sig);
}

async function signSession(secret) {
  const ts = Date.now().toString();
  const sig = await hmac(secret, ts);
  return `${ts}.${sig}`;
}

async function verifySession(value, secret) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [ts, sig] = parts;
  const expected = await hmac(secret, ts);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  const age = (Date.now() - Number(ts)) / 1000;
  return age >= 0 && age <= MAX_AGE_SECONDS;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function buildSetCookie(value) {
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

async function handleLogin(request, secret, password) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const submitted = (body && body.password) || "";
  if (submitted !== password) {
    return new Response(JSON.stringify({ error: "Incorrect password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const session = await signSession(secret);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildSetCookie(session),
    },
  });
}

async function handleRequest(request, context) {
  const url = new URL(request.url);
  const path = url.pathname;

  const secret = Netlify.env.get("AUTH_SECRET");
  const password = Netlify.env.get("SITE_PASSWORD");

  if (path === "/api/login") {
    if (!secret || !password) {
      return new Response(
        JSON.stringify({ error: "Server not configured. Set SITE_PASSWORD and AUTH_SECRET (Functions scope)." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    return handleLogin(request, secret, password);
  }

  if (PUBLIC_PATHS.has(path)) {
    return context.next();
  }

  if (!secret || !password) {
    return new Response(
      "Site is not configured yet: missing SITE_PASSWORD / AUTH_SECRET environment variables (Functions scope). See README.md.",
      { status: 500 }
    );
  }

  const cookieValue = getCookie(request, COOKIE_NAME);
  const valid = await verifySession(cookieValue, secret);

  if (valid) {
    return context.next();
  }

  const redirectTo = encodeURIComponent(path + url.search);
  return Response.redirect(`${url.origin}/login.html?redirect=${redirectTo}`, 302);
}

export default async (request, context) => {
  // Top-level safety net: if anything above throws for any reason
  // (env hiccup, unexpected input, a platform-level fluke), fail with a
  // plain, readable error instead of Netlify's generic "edge function has
  // crashed" page — and never silently let the request through unchecked.
  try {
    return await handleRequest(request, context);
  } catch (err) {
    return new Response(
      "Something went wrong loading this page. Please refresh — if this keeps happening, the site owner needs to check the Edge Functions logs in Netlify.\n\n" +
        (err && err.message ? `Detail: ${err.message}` : ""),
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }
};

export const config = { path: "/*" };
