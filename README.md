# whollow.io — deployment guide

## What this is

A two-page static portfolio (`index.html` = vision + visual outcome scrolldown,
`about.html` = about + contact) with a **real, server-side password gate** —
not a JavaScript popup that can be skipped by disabling JS or viewing page
source. The check runs on the host's edge, before any page is served.

It's built twice, for two different free hosts. Use whichever you deploy to
— you only need one:

| Host | Where the gate logic lives |
|---|---|
| **Netlify** (recommended below) | `netlify/edge-functions/gate.js` + `netlify.toml` |
| Cloudflare Pages | `functions/_middleware.js` + `functions/api/login.js` |

Both are genuinely free. Netlify's *built-in* password protection is a Pro
feature ($19+/mo), but Netlify Edge Functions are free on every plan
(1M invocations/month included), so the gate here is hand-built the same way
on both hosts rather than paid for. This only works on a host that runs
server-side code per request — if you instead drop this HTML as-is onto
plain GoDaddy web hosting, the gate won't function; there's no server behind
it to check the password.

---

## Option A — Netlify + GitHub (recommended)

### 1. Push the site to GitHub

1. Create a new repo on https://github.com (private is fine, doesn't matter
   — the site is gated regardless).
2. From this folder:
   ```
   git init
   git add .
   git commit -m "whollow.io site"
   git branch -M main
   git remote add origin https://github.com/<you>/whollow-site.git
   git push -u origin main
   ```

### 2. Connect Netlify to the repo

1. Create a free account at https://app.netlify.com.
2. **Add new site → Import an existing project → GitHub** → pick the repo.
3. Build settings: leave the build command blank, publish directory `.`
   (project root, where `index.html` lives). Netlify auto-detects
   `netlify/edge-functions/` and `netlify.toml`.
4. Deploy. You'll get a `*.netlify.app` URL to test with right away.

### 3. Set the two required environment variables

**Site settings → Environment variables → Add a variable**, add both, and
make sure the scope includes **Functions** (edge functions only read vars
scoped this way — this is the one step people miss):

| Variable | Value |
|---|---|
| `SITE_PASSWORD` | the password you want visitors to type |
| `AUTH_SECRET` | a long random string, e.g. generate one with `openssl rand -hex 32` |

Trigger a new deploy after adding these — env var changes need a fresh
deploy to take effect.

### 4. Point whollow.io at it (from GoDaddy)

1. In Netlify: **Domain settings → Add a domain** → enter `whollow.io`.
2. Netlify shows you DNS records to create (an A record or ALIAS for the
   root domain, a CNAME for `www`).
3. In GoDaddy: **My Products → DNS → Manage** → add those records
   (or switch to Netlify DNS entirely via nameservers, which Netlify will
   offer — simpler if you don't need GoDaddy for anything else).
4. Propagation: usually 10 minutes to a few hours. Netlify auto-provisions
   HTTPS once DNS resolves.

---

## Option B — Cloudflare Pages

If you'd rather use Cloudflare instead: same repo, connect it at
**Workers & Pages → Create → Pages → Connect to Git**, no build command,
root output directory. Set `SITE_PASSWORD` and `AUTH_SECRET` under
**Settings → Environment variables**, then point `whollow.io` at it either
by moving DNS to Cloudflare nameservers (simplest) or adding a CNAME/ALIAS
at GoDaddy to Cloudflare's provided target.

---

## Add your real content

- Replace every `[bracketed placeholder]` in `index.html` and `about.html`.
- Drop images into `images/` (see `images/README.txt` for suggested sizes)
  and swap the placeholder `<div class="frame">` blocks for `<img>` tags —
  the exact snippet is commented right above each placeholder in the HTML.
- Update contact links in `about.html` (`mailto:`, Instagram, LinkedIn, etc.)

## Change the password later

Update `SITE_PASSWORD` in your host's environment variables and redeploy.
No code changes needed.

## What's actually protected

The gate covers everything on the domain except the login page itself and
its CSS — including `/images/*` once you add real images there. A logged-in
visitor's browser sends the session cookie automatically on every request
(HTML, CSS, images alike), so nothing loads without it. Session cookie
lasts 30 days, then the password is required again.

## Local test before deploying

`node test_auth.mjs` runs the sign/verify logic standalone (valid session,
wrong secret, tampered cookie, expired session) so you can confirm the auth
code works before pushing — it doesn't touch either host, just the shared
crypto logic both versions are built on.
