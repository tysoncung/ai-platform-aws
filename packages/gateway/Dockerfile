FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/gateway ./packages/gateway

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ai-platform-aws/gateway build

FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/gateway/package.json ./packages/gateway/
COPY --from=builder /app/packages/gateway/dist ./packages/gateway/dist

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3100
ENV PORT=3100
CMD ["node", "packages/gateway/dist/server.js"]
