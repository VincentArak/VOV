# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build ----
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first, so a source-only change reuses the install layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ----------------------------------------------------------------- serve ----
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# VOV is a client-side SPA: it holds its data in the browser's IndexedDB and
# talks to the GitHub API straight from the page, so this image serves static
# files only — no server-side state, nothing to persist in the container.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
