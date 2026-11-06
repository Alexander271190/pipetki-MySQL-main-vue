# ═══════════════════════════════════════════════════════════
# Stage 1: Сборка Vue 3 фронтенда
# ═══════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY frontend-vue/package*.json ./
RUN npm install --include=dev

COPY frontend-vue/ ./
RUN npm run build

# ═══════════════════════════════════════════════════════════
# Stage 2: Backend + встроенная статика фронта
# ═══════════════════════════════════════════════════════════
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Кладём собранный Vue (index.html + assets + public/) в ./frontend/
COPY --from=frontend-builder /frontend/dist/. ./frontend/

EXPOSE 3000
CMD ["node", "server.js"]
