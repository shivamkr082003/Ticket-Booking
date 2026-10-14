# ── Base image ─────────────────────────────────────────────
# "alpine" is a minimal Linux distro (~5MB) instead of a full OS (~100s of MB).
# Smaller image = faster pulls/deploys and a smaller attack surface.
FROM node:22-alpine

WORKDIR /app

# ── Dependency layer (cached separately from source code) ───
# Copying only package*.json first means Docker only re-runs `npm install`
# when your dependencies actually change, not on every code edit.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Source code layer ─────────────────────────────────────
COPY . .

# ── Run as a non-root user ─────────────────────────────────
# By default containers run as root, which is unnecessary risk if the
# container is ever compromised. The node image ships a "node" user for this.
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Basic healthcheck so `docker ps` / orchestrators can tell if the app
# is actually responding, not just that the process is alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
