# ── Build stage ────────────────────────────────────────────────────────────────
# node:20-alpine is ~120 MB smaller than node:18-slim and gets active LTS support
FROM node:20-alpine AS base

# Best practice: run as non-root for security
RUN addgroup -S snowgroup && adduser -S snowuser -G snowgroup

WORKDIR /app

# Layer 1: dependencies (cached unless package.json changes)
COPY package*.json ./
RUN npm install --production --ignore-scripts && npm cache clean --force

# Layer 2: application source (only rebuilds when src/public change)
COPY public ./public
COPY src ./src
COPY .env.example ./

# Lock down ownership BEFORE switching users
RUN chown -R snowuser:snowgroup /app

USER snowuser

EXPOSE 3000

# Explicit host binding so the server is reachable from outside the container
ENV HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/status', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
