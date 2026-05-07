ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS deps

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM deps AS builder

ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY frontend ./
RUN npm run build

FROM ${NODE_IMAGE} AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
