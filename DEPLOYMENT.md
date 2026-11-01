# Cloudflare Pages deployment

This repository is deployed as a standalone Cloudflare Pages project for `links.naufalrf.net`.

## Build settings

- Build command: `bun install --frozen-lockfile && bun run build`
- Build output: `dist`
- Bun version: `BUN_VERSION=1.4.3` is pinned in `wrangler.toml`; `packageManager` is also pinned in `package.json`.
- Wrangler project: `naufalrf-links` (`wrangler.toml`)

`CF_PAGES=1` selects the Cloudflare adapter. Without that Pages build variable, the app selects Astro's Node standalone adapter for the parent repository's VPS rollback Compose service. The included `Dockerfile` expects the parent repository as its build context; build it through the root Compose file, not from this repo directory.

Non-secret values in `wrangler.toml` are the source of truth for both Preview and Production. Set `ADMIN_INTERNAL_API_TOKEN` as a Pages secret; never commit its value.

Set these for both Preview and Production, using the correct URL for each environment:

| Variable | Kind | Purpose |
|---|---|---|
| `ADMIN_API_URL` | server variable | `https://admin.naufalrf.net`; SSR and analytics API proxy target. |
| `ADMIN_INTERNAL_API_TOKEN` | secret | Least-privilege Admin token for server-side log shipping. Never expose to browser code. |
| `SITE_URL` | build/runtime variable | `https://links.naufalrf.net`; Astro site and sitemap origin. The Links page canonical and JSON-LD URLs currently point directly to the production hostname. |
| `PUBLIC_CURSOR_WS_URL` | public value | `wss://presence.naufalrf.net/ws`. |

Astro Cloudflare selects a `SESSION` KV driver by default, but this app does not call Astro's server session API and local Pages SSR passed without that binding. Keep it unconfigured unless a route starts using `Astro.session`; if that changes, declare the KV binding in Wrangler config and verify Preview. Add each exact Preview origin to Admin's public-origin list and Live Presence's origin allowlist before testing cross-host calls; keep these allowlists explicit. Local Wrangler secrets belong in `.dev.vars`; the file is ignored by Git.

Verify profile and analytics API behavior, runtime Admin configuration, canonical URLs, and Presence websocket connection on Preview before changing DNS.
