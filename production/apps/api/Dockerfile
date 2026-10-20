FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --ignore-scripts
COPY apps/api apps/api
RUN npm run build -w @drioz/api
ENV NODE_ENV=production
USER node
EXPOSE 4000
CMD ["node","apps/api/dist/main.js"]
