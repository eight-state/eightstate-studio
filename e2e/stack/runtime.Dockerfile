# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS agents-builder
WORKDIR /agents
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
COPY --from=agents package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY --from=agents . .
RUN pnpm typecheck && pnpm build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=agents-builder /agents/.mastra/output ./.mastra/output
# Keep the clean agent server bundle, but replace its published Studio artifact
# with the exact host-built EightState Studio artifact under test.
COPY --from=studio_dist / ./.mastra/output/studio
ENV MASTRA_STUDIO_PATH=/app/.mastra/output/studio
ENV PORT=4111
EXPOSE 4111
CMD ["node", ".mastra/output/index.mjs"]
