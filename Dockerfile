FROM node:24-alpine

WORKDIR /wishApp

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3002

CMD ["sh", "-c", "npm run db:migrate && npm run start"]
