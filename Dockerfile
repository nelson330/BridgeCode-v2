# syntax=docker/dockerfile:1.6

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build front-end + back-end bundles with all devDependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer if package.json/bun.lock unchanged)
COPY package.json bunfig.toml biome.json ./
COPY bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build front-end (Vite outputs to dist/web) and back-end (bun build to dist/server)
RUN bun run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production runtime with only what's needed
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

# Bun + tini for proper signal handling in containers
RUN apk add --no-cache tini wget

ENV NODE_ENV=production
ENV MODE=hosted
ENV PORT=3000
ENV DATA_DIR=/var/data

# Run as non-root user
RUN addgroup -S app && adduser -S app -G app && mkdir -p /var/data && chown -R app:app /var/data /app
USER app

# Copy built artifacts.
# dist/entry.js is the pre-bundled backend (bun build --target bun, 248 modules
# bundled). dist/web holds the Vite-built frontend assets. Both are fully
# self-contained — no source files or tsconfig path aliases needed at runtime.
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/package.json ./

EXPOSE 3000

# Persistent disk is mounted here in production. On free tier (ephemeral disk)
# Render ignores the mount and the container owns /var/data which is wiped
# on every deploy. The auto-seed in src/entry.ts repopulates it.
VOLUME ["/var/data"]

# Health check (Render respects this if configured in the dashboard)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1

# Run the pre-bundled entry point (dist/entry.js) — it has all 248 modules
# resolved at build time, so no tsconfig paths or source files are needed.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "dist/entry.js"]