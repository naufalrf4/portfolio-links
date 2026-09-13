# AGENTS.md

Authoritative AI control contract for this repository.

## 1. Project Context

- **Name:** `apps/links-astro`
- **Purpose:** serve the public links/profile hub for the portfolio ecosystem
- **Architecture:** Astro 5 site with React support and Admin public API consumption
- **Execution Model:** runs independently from `apps/links-astro`; reads about/profile/link data from Admin public APIs
- **Critical Domains:** Admin public API compatibility, compact profile-card layout, dark-first shared design tokens
- **Styling:** Tailwind CSS 4 with shared dark-first design tokens from `@naufalrf/design-tokens`

## 4. Operational Command Set

- **Install:** `bun install`
- **Dev:** `bun run dev`
- Keep the page visually aligned with the shared dark-first design system from `@naufalrf/design-tokens`.
- **Test:** no dedicated automated test command is defined in `package.json`
- **Lint:** no lint command is defined in `package.json`

## 5. Git Workflow Rules

- **Branch Strategy:** not codified locally; default to the user's current branch unless instructed otherwise
- **Review Flow:** not codified locally; do not assume auto-PR work
- **Auto-Commit:** forbidden unless the user explicitly asks
- **Auto-Push:** forbidden unless the user explicitly asks
- **Push Identity:** use only the user's identity
- **Co-Authors:** forbidden unless the user explicitly asks otherwise
- **Ignored Local Agent Artifacts:** inherit `../../AGENTS.md`

## 6. Agent Behavior

- Read this file, `../../AGENTS.md`, `../../PROGRESS.md`, `../../.context/ui-design/legacy-phase2-baseline.md`, and relevant `../../.context/base/*` files before planning or coding.
- Do not guess missing API contracts or design rules that are not evidenced in repo files.
- Keep changes scoped to this app unless a shared Admin contract or shared rule explicitly requires a cross-app update.
- Preserve existing behavior unless the user asks for a change or a documented contradiction must be repaired.
- Update `../../.context/` and this file when a task reveals durable links-app knowledge.
- Append a factual entry to `../../PROGRESS.md` after meaningful milestones, decisions, or discoveries.
- Do not add co-author trailers, assistant attribution, or alternate authorship metadata on the user's behalf.
- Run `bun run build` after meaningful code changes and explicitly note that lint/test commands are not defined when relevant.

## 7. Authority Order

1. this file
2. `../../AGENTS.md`
3. `../../.context/`
4. explicit user instruction that does not contradict verified project truth
5. repository code, manifests, env examples, and configs in this app

## 8. Self-Learn and Learned Rules

- Self-learn: add a short factual rule here when a task reveals a recurring links-app quirk, API contract caveat, or layout constraint.
- `src/lib/api.ts` is the sole observed data client and talks only to Admin public endpoints.
- `src/pages/index.astro` defines the current visual shell and should stay aligned with the shared dark-first design system from `@naufalrf/design-tokens`.
- Social vs website link separation should use label/icon heuristics with normalized-URL deduplication rather than exact URL matching against `about.socialLinks`, because Admin link formatting can vary while still representing the same destination.
- Links telemetry should stay same-origin through `src/pages/api/analytics.ts`; keep pageview and click tracking local to the app instead of sending browser traffic straight to the Admin domain.
- `public/llms.txt` should follow the canonical section structure from `apps/public-astro/public/llms.txt`, but its content must stay specific to the links hub rather than duplicating the full portfolio narrative.
