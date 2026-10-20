FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --ignore-scripts
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @drioz/web
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["npm","run","start","-w","@drioz/web"]
