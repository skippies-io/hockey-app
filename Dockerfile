FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8787
ARG GIT_SHA="unknown"
ENV GIT_SHA=$GIT_SHA

EXPOSE 8787

CMD ["node", "server/index.mjs"]
