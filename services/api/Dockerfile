# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /build/api
COPY services/api/package.json services/api/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --ignore-scripts
WORKDIR /build/source
COPY services/api/src services/api/src
COPY packages packages
RUN /build/api/node_modules/.bin/esbuild services/api/src/server.ts --bundle --platform=node --format=esm --packages=external --target=node22 --outfile=/build/server.mjs

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 PRAMANA_DATA_DIR=/data
WORKDIR /app
COPY services/api/package.json services/api/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --omit=dev --ignore-scripts && npm cache clean --force && mkdir /data && chown node:node /data
COPY --from=build /build/server.mjs ./server.mjs
USER node
EXPOSE 3001
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
