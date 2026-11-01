# syntax=docker/dockerfile:1.7
FROM docker.io/oven/bun:1.4.3 AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY packages ./packages
RUN --mount=type=cache,id=links-bun-install,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM docker.io/oven/bun:1.4.3 AS prod-deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
COPY packages ./packages
RUN --mount=type=cache,id=links-bun-install,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile

FROM docker.io/oven/bun:1.4.3 AS dev
WORKDIR /app
CMD ["sh", "-lc", "bun install --frozen-lockfile && bun run dev"]

FROM docker.io/library/node:22-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3002
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages ./packages
COPY --from=builder /app/dist ./dist
EXPOSE 3002
CMD ["node", "./dist/server/entry.mjs"]
