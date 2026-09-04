FROM node:20-alpine AS base

# ---------- DEPS ----------
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma/schema.prisma ./prisma/

RUN pnpm install --frozen-lockfile

# ---------- BUILDER ----------
FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
RUN pnpm build

# ---------- RUNNER ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache \
    curl \
    python3 \
    py3-pip \
    ffmpeg \
    tini \
    && pip3 install --break-system-packages --no-cache-dir yt-dlp \
    && apk del python3 py3-pip

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/app/generated ./app/generated

# Install production-only native dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@9 --activate \
    && pnpm install --frozen-lockfile --prod \
    && pnpm store prune

# Create persistent data directories
RUN mkdir -p /data/downloads && chown nextjs:nodejs /data/downloads

USER nextjs

EXPOSE 3000

ENV DATABASE_URL="file:/data/nodebeat.db"
ENV DOWNLOADS_DIR="/data/downloads"

CMD ["tini", "--", "node", "server.js"]
