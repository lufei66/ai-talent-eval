# ---- Build Stage ----
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/tsconfig.json shared/
COPY server/package.json server/tsconfig.json server/

RUN npm ci

COPY shared/src shared/src/
COPY server/prisma server/prisma/
COPY server/src server/src/

RUN npm run build -w shared
RUN cd server && npx prisma generate
RUN npm run build -w server

# ---- Production Stage ----
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/package.json .
COPY --from=builder /app/server/dist server/dist/
COPY --from=builder /app/server/prisma server/prisma/

# 创建上传目录
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 3000

CMD npx prisma migrate deploy --schema=server/prisma/schema.prisma && node server/dist/index.js
