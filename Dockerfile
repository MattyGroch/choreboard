# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm ci

# Install client deps
COPY client/package*.json ./client/
RUN cd client && npm ci

# Copy source
COPY server/ ./server/
COPY client/ ./client/

# Build client
RUN cd client && npm run build

# Generate Prisma client & compile server
RUN cd server && npx prisma generate && npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/dist         ./server/dist
COPY --from=builder /app/server/prisma       ./server/prisma
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/client/dist         ./client/dist

EXPOSE 3001

CMD sh -c "cd server && npx prisma migrate deploy && node dist/index.js"
