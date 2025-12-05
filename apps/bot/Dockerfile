# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/bot ./apps/bot
COPY packages ./packages

# Build the bot
RUN pnpm --filter @cozycore/bot build

# Production stage
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy built files and dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/bot/package.json ./apps/bot/
COPY --from=builder /app/apps/bot/dist ./apps/bot/dist
COPY --from=builder /app/packages ./packages

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

WORKDIR /app/apps/bot

CMD ["pnpm", "start"]
