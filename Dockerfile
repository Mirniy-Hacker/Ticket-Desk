# ============================================================
# Dockerfile — multi-stage build для Next.js
# ============================================================
#
# ┌────────────────────────────────────────────────────────────┐
# │ ЗАЧЕМ multi-stage?                                         │
# │ Stage 1 (deps):    устанавливаем node_modules              │
# │ Stage 2 (builder): собираем Next.js (node_modules + код)   │
# │ Stage 3 (runner):  только standalone output + public       │
# │                                                            │
# │ Итог: ~150 MB вместо ~800+ MB если копировать всё.         │
# │ В runner-стадии НЕТ исходников, devDependencies, .git.     │
# └────────────────────────────────────────────────────────────┘

# ─── Stage 1: Dependencies ───────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Копируем ТОЛЬКО файлы, нужные для npm ci.
# Если package.json не менялся, Docker использует кеш этого слоя.
COPY package.json package-lock.json* ./
RUN npm ci

# ─── Stage 2: Builder ───────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем node_modules из предыдущего стейджа
COPY --from=deps /app/node_modules ./node_modules
# Копируем исходный код
COPY . .

# Собираем Next.js с output: 'standalone'
# Результат: .next/standalone/ — автономный сервер
RUN npm run build

# ─── Stage 3: Runner (production) ───────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Метаданные: не влияют на работу, но полезны для docker inspect
LABEL maintainer="Ticket Desk <ticket-desk@example.com>"
LABEL org.opencontainers.image.source="https://github.com/owner/ticket-desk"

ENV NODE_ENV=production

# Создаём непривилегированного пользователя (БЕЗОПАСНОСТЬ).
# Если контейнер будет скомпрометирован, атакующий получит
# права обычного пользователя, а не root.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Директория для данных (JSON store).
# Chown, чтобы пользователь nextjs мог писать.
RUN mkdir -p /data && chown nextjs:nodejs /data

# Копируем билд-артефакты из builder-стадии.
# public — статика (robots.txt и т.д.)
# standalone — server.js + минимальный node_modules
# static — JS/CSS бандлы (для /_next/static)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Переключаемся на непривилегированного пользователя
USER nextjs

# Документируем порт (информационно; реально порт задаётся CMD/ENV)
EXPOSE 3000

ENV PORT=3000
# HOSTNAME 0.0.0.0 — слушать ВСЕ интерфейсы (нужно для Docker networking)
ENV HOSTNAME="0.0.0.0"
# Путь к JSON-файлу данных (volume монтируется сюда)
ENV DATA_PATH=/data/db.json

# Запуск standalone-сервера
CMD ["node", "server.js"]
