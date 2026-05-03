# ─── Stage 1: Dependencies ────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/

RUN npm ci --workspace=frontend

# ─── Stage 2: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/frontend/node_modules frontend/node_modules
COPY frontend/ frontend/
COPY package.json package-lock.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN cd frontend && npm run build

# ─── Stage 3: Production ─────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js standalone output
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static frontend/.next/static
COPY --from=builder /app/frontend/public frontend/public 2>/dev/null || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "frontend/server.js"]
