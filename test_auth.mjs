// Local sanity check for the password-gate logic in functions/_lib/auth.js.
// Not part of the deployed site — just run `node test_auth.mjs` locally
// any time you touch the auth code, to confirm sessions sign/verify
// correctly and that tampered/expired/wrong-secret cookies are rejected.
//
// Run: node test_auth.mjs

import { signSession, verifySession, buildSetCookie, getCookie, COOKIE } from './functions/_lib/auth.js';

const secret = "test-secret-123";
let failures = 0;

function check(label, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}: got ${actual}, expected ${expected}`);
  if (!pass) failures++;
}

const session = await signSession(secret);
check("valid session verifies with correct secret", await verifySession(session, secret), true);
check("valid session rejected with wrong secret", await verifySession(session, "wrong-secret"), false);

const tampered = session.slice(0, -1) + (session.slice(-1) === "a" ? "b" : "a");
check("tampered signature is rejected", await verifySession(tampered, secret), false);
check("null cookie is rejected", await verifySession(null, secret), false);

const setCookieHeader = buildSetCookie(session);
const fakeRequest = {
  headers: { get: (h) => (h === "Cookie" ? `${COOKIE}=${encodeURIComponent(session)}` : null) },
};
check("cookie round-trips through getCookie()", getCookie(fakeRequest, COOKIE), session);

// Simulate a 40-day-old session (older than the 30-day Max-Age).
const oldTs = (Date.now() - 40 * 24 * 60 * 60 * 1000).toString();
const key = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
);
const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(oldTs));
const toB64Url = (bytes) => {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const oldSession = `${oldTs}.${toB64Url(sig)}`;
check("40-day-old session is expired", await verifySession(oldSession, secret), false);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
