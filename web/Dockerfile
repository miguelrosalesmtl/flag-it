# Build once. The resulting image carries NO environment configuration —
# docker/entrypoint.sh writes config.json from env vars when the container starts,
# so the same image is promoted unchanged from staging to production.

FROM docker.io/library/node:26-alpine AS build
WORKDIR /app

# Node 26 no longer bundles corepack, so install pnpm directly. Pinned so the
# image build resolves the same dependency tree as local development.
RUN npm install -g pnpm@10.30.1

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# The dev fixture config must not ship to production; the entrypoint writes the
# real one at startup.
RUN rm -f dist/config.json dist/mockServiceWorker.js


FROM docker.io/library/nginx:1.29-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
