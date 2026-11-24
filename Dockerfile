# Build on the native host; the final stage targets the deployment platform.
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev && npm cache clean --force

FROM --platform=$TARGETPLATFORM node:24-bookworm-slim

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=build --chown=10001:10001 /app/package.json ./package.json
COPY --from=build --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/dist ./dist

USER 10001:10001
EXPOSE 3000

CMD ["node", "dist/main.js"]
