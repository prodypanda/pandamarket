# ─── Stage 1: Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY packages/ packages/
COPY backend/package.json backend/

# Install all dependencies (including devDependencies for build)
RUN npm ci --workspace=@pandamarket/backend --workspace=@pandamarket/types

# Copy source
COPY backend/ backend/
COPY packages/ packages/

# Build shared types + backend
RUN npm run build --workspace=@pandamarket/types 2>/dev/null || true
RUN npm run build --workspace=@pandamarket/backend

# ─── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 pandamarket

WORKDIR /app

# Copy package files for production install
COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY backend/package.json backend/

# Install production dependencies only
RUN npm ci --workspace=@pandamarket/backend --workspace=@pandamarket/types --omit=dev

# Copy built output
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/packages/types/dist packages/types/dist 2>/dev/null || true
COPY backend/data backend/data

# Copy migration SQL files
COPY backend/src/migrations/sql backend/src/migrations/sql

USER pandamarket

ENV NODE_ENV=production
ENV PD_PORT=9000

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

CMD ["node", "backend/dist/main.js"]
