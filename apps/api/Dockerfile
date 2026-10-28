# API LOCAPAY : Node 22 + Chromium système (génération des PDF par Puppeteer).
# Contexte de build : la racine du dépôt (voir docker-compose.prod.yml).
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-liberation openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# 1) Dépendances (couche mise en cache tant que les manifestes ne changent pas).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @locapay/api...

# 2) Code, client Prisma et compilation.
COPY prisma prisma
COPY scripts scripts
COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN pnpm --filter @locapay/shared-types build \
 && pnpm --filter @locapay/api prisma:generate \
 && pnpm --filter @locapay/api build

ENV NODE_ENV=production
USER node
WORKDIR /app/apps/api
EXPOSE 4000

# Applique les migrations en attente (aucune suppression de données), puis démarre l'API.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema ../../prisma/schema.prisma && node dist/server.js"]
