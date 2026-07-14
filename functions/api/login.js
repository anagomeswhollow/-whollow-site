import { signSession, buildSetCookie } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SITE_PASSWORD || !env.AUTH_SECRET) {
    return new Response(
      JSON.stringify({ error: "Server not configured. Set SITE_PASSWORD and AUTH_SECRET." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }

  const submitted = (body && body.password) || "";

  // Plain comparison is fine here: the password itself is never exposed
  // to the client (it only ever lives server-side as an env var), so
  // there's no timing-attack surface worth defending against for a
  // portfolio site.
  if (submitted !== env.SITE_PASSWORD) {
    return new Response(JSON.stringify({ error: "Incorrect password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await signSession(env.AUTH_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildSetCookie(session),
    },
  });
}
