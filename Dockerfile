# Stage 1: Build de produção (TanStack Start + Nitro Bun preset)
FROM oven/bun:1-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

ENV NODE_ENV=production
ENV NITRO_PRESET=bun
RUN bun run build

# Stage 2: Runtime leve de produção
FROM oven/bun:1-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

CMD ["bun", ".output/server/index.mjs"]
