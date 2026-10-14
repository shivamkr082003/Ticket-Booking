# ── Stage 1: build ─────────────────────────────────────────
# This stage has Node + all devDependencies, but never ships to production.
FROM node:22-alpine AS build

WORKDIR /app

# Vite bakes VITE_* env vars into the JS bundle AT BUILD TIME (unlike the
# server, which reads env vars at runtime). So they must be passed in as
# build arguments, not regular container env vars.
ARG VITE_API_BASE_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
# Output lands in /app/dist (Vite's default build output folder)

# ── Stage 2: serve ─────────────────────────────────────────
# Fresh, minimal image — only the static files + nginx, nothing else.
FROM nginx:1.27-alpine

# SPA routing config: React Router needs every unknown path to fall back
# to index.html (otherwise refreshing /movies/123 gives a 404 from nginx).
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
