# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/dashboard ./apps/dashboard
COPY packages ./packages

# Build arguments for Next.js public env vars
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_DISCORD_CLIENT_ID=$NEXT_PUBLIC_DISCORD_CLIENT_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build the dashboard
RUN pnpm --filter @cozycore/dashboard build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app/apps/dashboard

CMD ["node", "server.js"]
