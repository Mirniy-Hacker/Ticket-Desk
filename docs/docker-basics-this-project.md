# Docker Basics — на примере Ticket Desk

## Dockerfile: Multi-Stage Build

### Зачем multi-stage?

Без multi-stage:
```dockerfile
FROM node:20
COPY . .
RUN npm ci && npm run build
CMD ["node", ".next/standalone/server.js"]
# Размер: ~800MB (node_modules, исходники, devDependencies — всё внутри)
```

С multi-stage (наш Dockerfile):
```dockerfile
FROM node:20-alpine AS deps      # Stage 1: только npm ci
FROM node:20-alpine AS builder   # Stage 2: build (использует deps)
FROM node:20-alpine AS runner    # Stage 3: только результат build
# Размер: ~150MB (только standalone + public + static)
```

**Ключевая идея:** каждый `FROM` начинает с ЧИСТОГО образа.
`COPY --from=builder` копирует ТОЛЬКО нужные файлы из предыдущей стадии.

### Почему alpine?
- `node:20` = ~350MB (Debian)
- `node:20-alpine` = ~50MB (Alpine Linux)
- Alpine — минимальный Linux дистрибутив

### Standalone output
`output: 'standalone'` в next.config.ts заставляет Next.js создать:
- `server.js` — HTTP-сервер
- Минимальный `/node_modules/` с ТОЛЬКО нужными зависимостями (trace)

Без standalone: нужны ВСЕ node_modules (сотни MB).

---

## Non-Root User (безопасность)

```dockerfile
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
```

**Зачем?** Если контейнер скомпрометирован (RCE-уязвимость), атакующий получит
права `nextjs` (обычный пользователь), а НЕ `root`.

Без `USER nextjs` — процесс работает от root внутри контейнера.
Это опасно, т.к. root в контейнере может иметь доступ к host-системе
(при неправильной конфигурации Docker daemon).

---

## Ports и EXPOSE

```dockerfile
EXPOSE 3000
ENV PORT=3000
```

**EXPOSE** — это ДОКУМЕНТАЦИЯ. Он НЕ открывает порт!
Реальное открытие порта происходит в `docker-compose.yml`:
```yaml
ports:
  - "8080:80"   # HOST:CONTAINER
```

В нашей архитектуре:
- Next.js слушает порт 3000 **внутри контейнера** (не виден с host)
- NGINX слушает порт 80 **внутри контейнера**, маппится на 8080 host
- Только NGINX доступен с host (http://localhost:8080)

---

## Volumes — персистентные данные

### Проблема
Контейнеры **stateless**: данные внутри контейнера теряются при пересоздании.

### Решение: Docker Volumes
```yaml
volumes:
  tickets-data:    # Named volume
    driver: local

services:
  next-app:
    volumes:
      - tickets-data:/data   # Монтируем volume в /data внутри контейнера
```

**Куда физически пишутся данные на Windows?**
```powershell
docker volume inspect ticket-desk_tickets-data
# → Mountpoint: /var/lib/docker/volumes/ticket-desk_tickets-data/_data
# (Это путь внутри WSL2 VM, не напрямую на Windows)
```

**Жизненный цикл:**
| Команда | Данные |
|---------|--------|
| `docker compose stop` | ✅ Сохранены |
| `docker compose down` | ✅ Сохранены |
| `docker compose down -v` | ❌ УДАЛЕНЫ! |
| `docker volume rm ticket-desk_tickets-data` | ❌ УДАЛЕНЫ! |

---

## Сети Docker

```yaml
# Docker Compose АВТОМАТИЧЕСКИ создаёт сеть
# Имя: ticket-desk_default (по имени проекта)
```

Контейнеры в одной compose-сети видят друг друга **по имени сервиса**:
- NGINX обращается к `next-app:3000` (не localhost!)
- Traffic-gen обращается к `nginx:80`

**Изоляция:** контейнеры НЕ видят другие compose-проекты.
Каждый `docker compose up` создаёт СВОЮ сеть.

---

## Docker Stats — мониторинг ресурсов

```powershell
# Реалтайм-мониторинг (CPU, RAM, Network, I/O)
docker stats

# Одноразовый snapshot
docker stats --no-stream

# Только наши контейнеры
docker stats ticket-desk-nginx-1 ticket-desk-next-app-1
```

Пример вывода:
```
CONTAINER            CPU %     MEM USAGE / LIMIT     NET I/O
ticket-desk-nginx    0.01%     5MiB / 512MiB         1.2kB / 3.4kB
ticket-desk-next     0.15%     85MiB / 512MiB        3.4kB / 1.2kB
```

---

## Ограничения ресурсов

### В docker-compose.yml (уже настроено)
```yaml
deploy:
  resources:
    limits:
      memory: 512M   # Максимум RAM
      cpus: "1.0"    # Максимум 1 CPU core
```

### Через docker run (для справки)
```powershell
docker run --memory=512m --cpus=1.0 ticketdesk:latest
```

### Зачем ограничивать?
- **Защита от утечек памяти:** если Next.js "утечёт" RAM, контейнер будет OOM-killed,
  а не съест всю память host-системы.
- **Предсказуемость:** знаем сколько ресурсов нужно.

---

## Полезные Docker-команды для этого проекта

```powershell
# ── Сборка и запуск ──
docker compose up --build          # Собрать + запустить
docker compose up -d               # Запустить в фоне (detached)
docker compose down                # Остановить
docker compose restart next-app    # Перезапустить один сервис

# ── Диагностика ──
docker compose ps                  # Статус контейнеров
docker compose logs -f nginx       # Логи nginx (follow)
docker compose exec next-app sh    # Зайти в контейнер
docker compose top                 # Процессы внутри контейнеров

# ── Образы ──
docker images | findstr ticketdesk  # Наши образы
docker image prune                  # Удалить неиспользуемые
docker system df                    # Сколько места занимает Docker

# ── Volumes ──
docker volume ls                   # Все volumes
docker volume inspect ticket-desk_tickets-data

# ── Сеть ──
docker network ls                  # Все сети
docker network inspect ticket-desk_default  # Наша сеть
```

---

## Dockerfile vs docker-compose.yml

| Аспект | Dockerfile | docker-compose.yml |
|--------|-----------|-------------------|
| Что определяет | Как СОБРАТЬ один image | Как ЗАПУСТИТЬ несколько контейнеров |
| Содержит | FROM, COPY, RUN, CMD | services, volumes, networks, ports |
| Результат | Docker image | Работающая система |
| Аналогия | Рецепт блюда | Меню ресторана |
