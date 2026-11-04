FROM node:24-alpine AS build

WORKDIR /wishApp

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run build

FROM node:24-alpine AS runner

WORKDIR /wishApp

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /wishApp/.next ./.next
COPY --from=build /wishApp/public ./public
COPY --from=build /wishApp/next.config.ts ./
COPY --from=build /wishApp/drizzle.config.ts ./
COPY --from=build /wishApp/drizzle ./drizzle
COPY --from=build /wishApp/src/lib/schema.ts ./src/lib/schema.ts

EXPOSE 3002

CMD ["sh", "-c", "npm run db:migrate && npm run start"]
