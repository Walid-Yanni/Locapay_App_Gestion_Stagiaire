# Site web LOCAPAY : compilation Vite puis service par nginx, qui relaie aussi /api vers l'API.
# Contexte de build : la racine du dépôt (voir docker-compose.prod.yml).
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @locapay/web...

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
# Vide par défaut : le navigateur appelle /api sur le même site (nginx relaie vers l'API).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @locapay/shared-types build && pnpm --filter @locapay/web build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
