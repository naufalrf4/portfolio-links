# Links

Astro SSR link/profile frontend for `links.naufalrf.net`. Profile and analytics data come from Admin; live presence connects to the separate VPS WebSocket service.

## Local development

This app can be run from the monorepo workspace, or as its own repository after extraction:

```sh
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

The standalone repository includes snapshots of shared `@naufalrf/*` packages under `packages/`; their source commit is recorded in `packages/UPSTREAM-SNAPSHOT.md`. Keep service tokens server-side and local env files out of Git.

Run `bun run build` for the Cloudflare SSR build. See [DEPLOYMENT.md](./DEPLOYMENT.md) for Pages settings, runtime variables, and preview checks.
