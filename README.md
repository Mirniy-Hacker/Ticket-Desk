# 🎫 Ticket Desk

> Учебный мини-проект для изучения **Next.js + NGINX + Docker + CI/CD (GitHub Actions)**.
> Всё работает **ЛОКАЛЬНО** — без VPS, доменов и платных сервисов.

---

## 📐 Архитектура

```
Браузер → :8080 → [NGINX] → :3000 → [Next.js App]
                     │                      │
                     │ gzip                  │ SSR / API / Server Actions
                     │ cache static          │
                     │ security headers      └─► /data/db.json (Docker Volume)
                     │ access logs
                     │
               docker compose
                     │
              ┌──────┼──────┐
              │      │      │
           nginx  next-app  traffic-gen (опционально)
```

### Кто за что отвечает

| Компонент | Зона ответственности |
|-----------|---------------------|
| **NGINX** | Принимает HTTP (порт 8080), проксирует на Next.js, gzip-сжатие, кеш статики `/_next/static`, security headers, логирование |
| **Next.js** | SSR страниц, Server Actions (формы), API Routes (`/api/tickets`), healthcheck `/healthz`, JSON store |
| **Docker Compose** | Оркестрация сервисов, сеть между контейнерами, volumes для персистентных данных |
| **GitHub Actions CI** | Lint → Typecheck → Test → Build на каждый PR |
| **GitHub Actions Publish** | Сборка Docker image → Push в GHCR на каждый merge в main |
| **GitHub Actions Deploy** | Pull image на локальный ПК через self-hosted runner → Healthcheck → Rollback |

---

## 🚀 Быстрый старт (локально)

### Требования
- Docker Desktop (Windows 10/11)
- Node.js ≥ 20.9 (для разработки без Docker)

### Запуск через Docker Compose
```powershell
# Клонировать репозиторий
git clone https://github.com/<your-user>/Ticket-Desk.git
cd Ticket-Desk

# Собрать и запустить (первый раз займёт 2-5 минут)
docker compose up --build

# Открыть в браузере
# http://localhost:8080
```

### Запуск для разработки (без Docker)
```powershell
npm install
npm run dev
# Открыть http://localhost:3000
```

---

## 📁 JSON Volume — где лежат данные

Данные хранятся в Docker **named volume** `tickets-data`:

```powershell
# Посмотреть где физически лежит volume
docker volume inspect ticket-desk_tickets-data

# Внутри контейнера данные по пути /data/db.json
docker compose exec next-app cat /data/db.json
```

**Важно:**
- `docker compose down` — данные **СОХРАНЯЮТСЯ**
- `docker compose down -v` — данные **УДАЛЯЮТСЯ** (volume удаляется)
- При первом запуске автоматически создаются 15 seed-тикетов

---

## 📋 Смотрим логи

```powershell
# Все сервисы
docker compose logs -f

# Только nginx (access + error logs)
docker compose logs -f nginx

# Только Next.js
docker compose logs -f next-app

# Последние 50 строк
docker compose logs --tail 50 next-app
```

---

## 🔍 Проверяем gzip и cache headers

### PowerShell
```powershell
# Проверка gzip
$response = Invoke-WebRequest -Uri "http://localhost:8080/" -Headers @{"Accept-Encoding"="gzip"}
$response.Headers["Content-Encoding"]  # Должно быть: gzip

# Проверка Cache-Control для статики
# Сначала найдите URL статики в HTML-ответе, затем:
$response = Invoke-WebRequest -Uri "http://localhost:8080/_next/static/chunks/main.js" -ErrorAction SilentlyContinue
$response.Headers["Cache-Control"]  # Должно быть: public, max-age=31536000, immutable

# Проверка security headers
$response = Invoke-WebRequest -Uri "http://localhost:8080/"
$response.Headers["X-Content-Type-Options"]  # nosniff
$response.Headers["X-Frame-Options"]         # SAMEORIGIN
$response.Headers["Referrer-Policy"]         # strict-origin-when-cross-origin
```

### curl (Git Bash / WSL)
```bash
# gzip
curl -H "Accept-Encoding: gzip" -sI http://localhost:8080/ | grep -i content-encoding

# Cache-Control на статике
curl -sI http://localhost:8080/_next/static/chunks/main.js | grep -i cache-control

# Security headers
curl -sI http://localhost:8080/ | grep -iE "x-content-type|x-frame|referrer"
```

---

## 🔄 CI (Pull Request проверки)

**Файл:** `.github/workflows/ci.yml`

При открытии PR в `main` запускаются:

| Шаг | Команда | Что проверяет |
|-----|---------|---------------|
| Lint | `npm run lint` | Стиль кода (ESLint) |
| Typecheck | `npm run typecheck` | Ошибки типов (tsc) |
| Test | `npm test` | Unit-тесты store (vitest) |
| Build | `npm run build` | Сборка работает |
| Docker Build | `docker build .` | Dockerfile корректен |

**Где смотреть:** GitHub → Pull Request → вкладка "Checks"

---

## 📦 Publish в GHCR

**Файл:** `.github/workflows/publish.yml`

При merge в `main` или push тега `v*.*.*`:

1. Собирает Docker image
2. Пушит в `ghcr.io/<owner>/<repo>`
3. Теги: `latest`, `sha-<short>`, `1.0.0` (для semver-тегов)

**Где увидеть пакеты:**
- GitHub → ваш репозиторий → правая панель "Packages"
- Или: `https://github.com/<owner>?tab=packages`

**Настройка видимости (если нужно):**
1. GitHub → Settings → Developer settings → Personal access tokens — НЕ нужно для public repo
2. Для packages: GitHub → репозиторий → Settings → Actions → General → "Read and write permissions" для GITHUB_TOKEN

---

## 🖥️ Local Deploy (self-hosted runner)

**Файл:** `.github/workflows/deploy-local.yml`

### Почему нужен self-hosted runner (а не VPS)?

GitHub Actions runners (ubuntu-latest и т.д.) — это облачные VM GitHub.
Они НЕ МОГУТ деплоить на ваш локальный ПК, потому что:
- Не имеют доступа к вашей сети
- Не могут выполнять `docker compose up` на вашей машине
- Живут только время выполнения workflow и уничтожаются

**Self-hosted runner** — это агент, который:
1. Запускается на ВАШЕМ ПК
2. Подключается к GitHub через исходящее соединение (не нужен публичный IP)
3. Получает задания от GitHub Actions
4. Выполняет их локально (docker compose pull/up)

**Установка:** см. `docs/runner-setup-windows.md`

### Как работает деплой
1. GitHub отправляет задание на ваш self-hosted runner
2. Runner делает `git checkout` (для compose + nginx.conf)
3. `docker login ghcr.io` + `docker compose pull`
4. `docker compose up -d`
5. Healthcheck `http://localhost:8080/healthz`
6. Если fail → rollback на предыдущий тег из `.deploy/last_good_tag.txt`

---

## 🐛 Troubleshooting

### 1. 502 Bad Gateway от nginx
**Причина:** Next.js ещё не запустился или упал.
```powershell
docker compose logs next-app  # Смотрим логи Next.js
docker compose ps              # Проверяем статус (healthy/unhealthy)
```

### 2. Порт 8080 занят
```powershell
netstat -ano | findstr :8080
# Убить процесс или изменить порт в docker-compose.yml: "9090:80"
```

### 3. Нет прав на GHCR (403 при push)
- Проверить Settings → Actions → General → Workflow permissions: **Read and write**
- Для private repo: может потребоваться PAT с правом `write:packages`

### 4. node версия слишком старая
```powershell
node -v  # Должен быть ≥ 20.9.0
# Обновить: https://nodejs.org/
```

### 5. Volume не монтируется (Permission denied)
```powershell
# Проверить что Docker Desktop имеет доступ к дискам
# Docker Desktop → Settings → Resources → File Sharing
docker compose down -v  # Удалить volume и создать заново
docker compose up --build
```

### 6. `npm ci` падает (ERESOLVE)
```powershell
# Удалить lock-файл и зависимости
Remove-Item -Recurse node_modules, package-lock.json
npm install
```

### 7. Self-hosted runner offline
```powershell
# Проверить сервис
Get-Service actions.runner.*
# Перезапустить
Restart-Service actions.runner.*
```

### 8. Docker build зависает на `npm ci`
**Причина:** Кеш Docker стал неактуальным.
```powershell
docker compose build --no-cache
```

### 9. Данные пропали после перезапуска
Проверить что НЕ использовали `-v` при остановке:
```powershell
# БЕЗОПАСНО: данные сохранятся
docker compose down
docker compose up -d

# ОПАСНО: удалит volume!
docker compose down -v
```

### 10. curl/Invoke-WebRequest не работает (SSL/proxy)
```powershell
# Отключить проверку сертификата (для localhost это ОК)
Invoke-WebRequest -Uri "http://localhost:8080/healthz" -UseBasicParsing -SkipCertificateCheck
```

### 11. container "next-app" is unhealthy
```powershell
# Посмотреть детальный healthcheck лог
docker inspect --format='{{json .State.Health}}' ticket-desk-next-app-1 | ConvertFrom-Json | Format-List
```

### 12. GHCR image pull fail на self-hosted runner
```powershell
# Проверить login
docker login ghcr.io -u YOUR_USERNAME
# Для private repo: использовать PAT вместо GITHUB_TOKEN
```

---

## 📚 Дополнительная документация

- [docs/nginx-explained.md](docs/nginx-explained.md) — зачем nginx, gzip, cache, security
- [docs/next-vs-react.md](docs/next-vs-react.md) — SSR, Server Actions, API routes на примерах проекта
- [docs/docker-basics-this-project.md](docs/docker-basics-this-project.md) — Dockerfile, volumes, сети, ресурсы
- [docs/runner-setup-windows.md](docs/runner-setup-windows.md) — установка self-hosted runner на Windows

---

## 🛠️ NPM Scripts

| Скрипт | Команда | Описание |
|--------|---------|----------|
| `dev` | `next dev` | Запуск dev-сервера с HMR |
| `build` | `next build` | Production-сборка |
| `start` | `next start` | Запуск production-сервера |
| `lint` | `next lint` | Проверка ESLint |
| `typecheck` | `tsc --noEmit` | Проверка типов |
| `test` | `vitest run` | Запуск unit-тестов |
| `test:watch` | `vitest` | Тесты в watch-режиме |

---

## 📂 Структура проекта

```
Ticket-Desk/
├── .github/workflows/
│   ├── ci.yml              # CI на PR: lint/test/build
│   ├── publish.yml         # Build + Push в GHCR
│   └── deploy-local.yml    # Deploy на локальный ПК
├── docs/
│   ├── nginx-explained.md
│   ├── next-vs-react.md
│   ├── docker-basics-this-project.md
│   └── runner-setup-windows.md
├── nginx/
│   └── nginx.conf          # Конфиг reverse proxy
├── traffic-gen/
│   ├── Dockerfile
│   └── gen.sh              # Генератор трафика
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout (header/footer)
│   │   ├── page.tsx        # Главная (список тикетов)
│   │   ├── globals.css     # Все стили
│   │   ├── error.tsx       # Error boundary
│   │   ├── not-found.tsx   # 404 страница
│   │   ├── healthz/route.ts       # GET /healthz
│   │   ├── api/tickets/route.ts   # GET/POST /api/tickets
│   │   ├── api/tickets/[id]/route.ts  # GET/PATCH/DELETE
│   │   └── tickets/[id]/page.tsx  # Страница тикета
│   ├── actions/
│   │   └── tickets.ts      # Server Actions (create/update/delete)
│   ├── components/
│   │   ├── FilterBar.tsx    # Фильтр + поиск
│   │   ├── TicketForm.tsx   # Форма создания
│   │   ├── TicketList.tsx   # Список карточек
│   │   ├── TicketDetail.tsx # Просмотр + редактирование
│   │   └── StatusBadge.tsx  # Бейджи статуса/приоритета
│   └── lib/
│       ├── types.ts         # TypeScript типы
│       ├── schemas.ts       # Zod-схемы валидации
│       ├── store.ts         # JSON store (CRUD + mutex)
│       ├── seed.ts          # Начальные данные (15 тикетов)
│       └── request-id.ts    # Request ID утилиты
├── __tests__/
│   └── store.test.ts        # Unit-тесты store
├── Dockerfile               # Multi-stage build
├── docker-compose.yml       # Оркестрация сервисов
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md                # ← Вы здесь
```
