# syntax=docker/dockerfile:1
# Chhelebela Score — containerized Next.js (standalone output) for Dokploy/VPS.
# Node 22 is required for the built-in node:sqlite module.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    COMPARISON_DB_PATH=/data/comparisons.sqlite
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
    && mkdir -p /data \
    && chown nextjs:nodejs /data
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
