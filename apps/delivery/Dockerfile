FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/delivery/package.json ./apps/delivery/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/rule-engine/package.json ./packages/rule-engine/
RUN pnpm install --frozen-lockfile --filter @im-cms/delivery...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @im-cms/shared-types build
RUN pnpm --filter @im-cms/rule-engine build
RUN pnpm --filter @im-cms/delivery build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/delivery/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/delivery/package.json ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
