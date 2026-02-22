# GitHub Actions и CI/CD — полное руководство на примере Ticket Desk

> Здесь **мини-теория + практика** по каждому ключевому понятию.
> Все примеры взяты прямо из этого репозитория.

---

## Содержание

1. [Что такое GitHub Actions](#1-что-такое-github-actions)
2. [Структура: Workflow → Job → Step](#2-структура-workflow--job--step)
3. [Где писать пайплайны](#3-где-писать-пайплайны)
4. [Как и откуда запускать](#4-как-и-откуда-запускать)
5. [CI/CD-ветки — где и зачем](#5-cicd-ветки--где-и-зачем)
6. [GHCR — GitHub Container Registry](#6-ghcr--github-container-registry)
7. [SSR в контексте CI/CD](#7-ssr-в-контексте-cicd)
8. [Server Actions в контексте CI/CD](#8-server-actions-в-контексте-cicd)
9. [Reverse Proxy в контексте CI/CD](#9-reverse-proxy-в-контексте-cicd)
10. [Полная картина: что за чем идёт](#10-полная-картина-что-за-чем-идёт)

---

## 1. Что такое GitHub Actions

### Теория

**GitHub Actions** — это встроенная система автоматизации GitHub.
Она позволяет запускать произвольный код (скрипты, команды) в ответ на события в репозитории.

**Зачем нужен:**
- Автоматически проверять каждый PR (нет ли ошибок, тестов)
- Собирать Docker-образ и публиковать его
- Деплоить приложение после мержа

**Ключевая идея:** вы описываете *что делать* в YAML-файле, GitHub сам запускает это на своих серверах (или на вашем ПК через self-hosted runner).

### Практика — смотрим на реальный workflow

```yaml
# .github/workflows/ci.yml
name: CI                   # Имя (отображается в GitHub UI)

on:                        # КОГДА запускать?
  pull_request:
    branches: [main]       # → при открытии PR в main

jobs:                      # Список работ
  node-ci:                 # Имя job
    runs-on: ubuntu-latest # На каком сервере выполнять
    steps:                 # Список шагов
      - uses: actions/checkout@v4        # Скачать код
      - uses: actions/setup-node@v4      # Установить Node.js
        with:
          node-version: "20.x"
      - run: npm ci                      # Установить зависимости
      - run: npm run lint                # Запустить lint
```

**Проверить вживую:**
1. Откройте любой PR в этом репозитории
2. Вкладка **Checks** → увидите запущенный CI workflow

---

## 2. Структура: Workflow → Job → Step

### Теория

```
Workflow (файл .yml)
  └── Job (выполняется на одном runner'е)
        └── Step (одна команда или action)
```

| Уровень | Что это | Пример |
|---------|---------|--------|
| **Workflow** | Весь файл `.yml` | `ci.yml`, `publish.yml`, `deploy-local.yml` |
| **Job** | Группа шагов на одном сервере | `node-ci`, `docker-build` |
| **Step** | Один шаг: команда или action | `npm run lint`, `docker/build-push-action@v6` |
| **Runner** | Сервер, где выполняется job | `ubuntu-latest` (облако GitHub) или self-hosted |
| **Action** | Готовый многоразовый шаг | `actions/checkout@v4` |

**Важно:** каждый **Job** стартует на ЧИСТОМ сервере.
Если у вас два job (`node-ci` и `docker-build`), то для каждого из них поднимается **отдельная VM**.

### Практика — параллельные jobs

В нашем `ci.yml` оба job запускаются **параллельно**:

```yaml
jobs:
  node-ci:          # Job 1: запускается параллельно
    runs-on: ubuntu-latest
    steps: ...

  docker-build:     # Job 2: запускается параллельно
    runs-on: ubuntu-latest
    steps: ...
```

Если нужна **последовательность** (сначала тесты, потом деплой):
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps: ...

  deploy:
    needs: test    # ← ждать завершения job "test"
    runs-on: ubuntu-latest
    steps: ...
```

---

## 3. Где писать пайплайны

### Теория

Все workflow-файлы должны быть в папке:
```
.github/workflows/
```

**Правила:**
- Расширение: `.yml` или `.yaml`
- Имя файла: любое (оно видно в GitHub UI)
- Один файл = один workflow (можно несколько jobs внутри)

### Практика — структура пайплайнов в этом проекте

```
.github/workflows/
├── ci.yml            ← Проверка кода при PR
├── publish.yml       ← Сборка + публикация Docker-образа
└── deploy-local.yml  ← Деплой на локальный ПК
```

**Как создать новый workflow:**
1. Создайте файл `.github/workflows/my-workflow.yml`
2. Закоммитьте в репозиторий
3. GitHub автоматически подхватит его

**Посмотреть в GitHub UI:**
Репозиторий → вкладка **Actions** → слева список всех workflows

---

## 4. Как и откуда запускать

### Теория — триггеры (события запуска)

Workflow может запускаться несколькими способами:

| Триггер | Синтаксис | Когда срабатывает |
|---------|-----------|-------------------|
| **Открытие PR** | `on: pull_request` | При создании/обновлении PR |
| **Push в ветку** | `on: push: branches: [main]` | При коммите/мерже в main |
| **Push тега** | `on: push: tags: ["v*.*.*"]` | При создании тега (релиз) |
| **Вручную** | `on: workflow_dispatch` | Кнопка "Run workflow" в GitHub |
| **Расписание** | `on: schedule: cron: "0 2 * * *"` | По крону (каждую ночь в 02:00) |

### Практика 1 — ручной запуск с параметром

Наш `deploy-local.yml` поддерживает ручной запуск:

```yaml
on:
  workflow_dispatch:        # Ручной запуск
    inputs:
      tag:
        description: "Image tag to deploy (default: latest)"
        required: false
        default: "latest"
```

**Как запустить вручную:**
1. Репозиторий → **Actions**
2. В левом меню: **Deploy Local**
3. Кнопка **Run workflow** (справа сверху)
4. Ввести тег → **Run workflow**

### Практика 2 — просмотр логов workflow

После запуска:
1. **Actions** → нажмите на run
2. Нажмите на job (например, "Deploy to Local Machine")
3. Разверните любой step — увидите вывод команд

---

## 5. CI/CD-ветки — где и зачем

### Теория

**CI/CD** — это практика, а не технология. Расшифровывается как:
- **CI** (Continuous Integration) — непрерывная интеграция: каждый коммит автоматически проверяется
- **CD** (Continuous Delivery/Deployment) — непрерывная доставка: после проверки автоматически деплоится

**Типовая стратегия веток:**

```
main (продакшен-ветка)
 ↑ merge PR
feature/my-fix  ← разработчик создаёт эту ветку
```

**Поток (flow) в нашем проекте:**

```
1. Разработчик создаёт ветку: git checkout -b feature/add-priority
2. Пишет код, делает коммиты
3. Открывает PR в main
   → Срабатывает ci.yml: lint + test + build + docker check
4. PR review + все проверки зелёные → MERGE в main
   → Срабатывает publish.yml: собирает и пушит Docker-образ в GHCR
   → Срабатывает deploy-local.yml: деплоит новый образ на ПК
5. Опционально: создаёт тег v1.0.0
   → publish.yml добавляет semver-теги к образу
```

### Практика — создать ветку и посмотреть CI

```bash
# 1. Создать ветку
git checkout -b feature/test-ci

# 2. Сделать изменение (например, в README)
echo "# test" >> README.md
git add README.md
git commit -m "test: trigger CI"

# 3. Запушить
git push origin feature/test-ci

# 4. Открыть PR на GitHub
# → CI запустится автоматически
```

**Где смотреть CI в PR:**
- Откройте PR → внизу страницы раздел **"Checks"**
- Зелёная галочка ✅ = все проверки прошли
- Красный крестик ❌ = что-то сломалось → можно мержить только если настроен branch protection

### Branch Protection (защита ветки)

Чтобы нельзя было мержить без прохождения CI:
1. GitHub → **Settings** → **Branches** → **Add rule**
2. Branch name pattern: `main`
3. ✅ Require status checks to pass before merging
4. Добавить: `Node.js CI`, `Docker Build Check`

---

## 6. GHCR — GitHub Container Registry

### Теория

**GHCR** (GitHub Container Registry) — это хранилище Docker-образов, встроенное в GitHub.
Адрес: `ghcr.io`

**Зачем нужен:**
- Хранить Docker-образы после сборки
- Скачивать образы при деплое
- Версионировать образы (теги)

**Аналогия:** GHCR — это как npm registry для пакетов, но для Docker-образов.

**Альтернативы:** Docker Hub, AWS ECR, Google Artifact Registry.
Мы используем GHCR потому что:
- Бесплатный для публичных репозиториев
- Встроен в GitHub — не нужны отдельные credentials
- Использует `GITHUB_TOKEN` (автоматически создаётся для каждого workflow run)

### На каком этапе CI/CD стоит GHCR

```
Код → CI (lint/test/build) → [GHCR] → Deploy
                              ↑
                        publish.yml пушит образ сюда
                              ↓
                        deploy-local.yml пуллит отсюда
```

**GHCR = хранилище между "собрать" и "задеплоить".**

### Практика 1 — смотрим publish.yml

```yaml
# .github/workflows/publish.yml

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}   # owner/repo (lowercase)

steps:
  # Шаг 1: Логин в GHCR через GITHUB_TOKEN
  - name: "🔑 Login to GitHub Container Registry"
    uses: docker/login-action@v3
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}  # Автоматически создаётся GitHub

  # Шаг 2: Генерация тегов
  - name: "🏷️ Generate Docker metadata"
    id: meta
    uses: docker/metadata-action@v5
    with:
      images: ghcr.io/${{ github.repository }}
      tags: |
        type=raw,value=latest,enable={{is_default_branch}}
        type=sha,prefix=sha-,format=short       # sha-abc1234
        type=semver,pattern={{version}}          # 1.0.0 (при теге v1.0.0)

  # Шаг 3: Сборка + пуш образа в GHCR
  - name: "🏗️ Build and push Docker image"
    uses: docker/build-push-action@v6
    with:
      context: .
      push: true                               # ← пушим в GHCR
      tags: ${{ steps.meta.outputs.tags }}
```

### Практика 2 — теги образа

После мержа PR в main, образ в GHCR будет доступен с тремя тегами:

```bash
# Тег latest (всегда указывает на последний main)
docker pull ghcr.io/owner/ticket-desk:latest

# Тег sha (конкретный коммит — неизменяемый)
docker pull ghcr.io/owner/ticket-desk:sha-abc1234

# Тег версии (при создании тега git v1.0.0)
docker pull ghcr.io/owner/ticket-desk:1.0.0
```

**Почему нужен sha-тег?**
`latest` изменяется при каждом деплое. Для **rollback** нужен конкретный образ — sha-тег точно указывает на конкретный коммит.

### Практика 3 — смотрим deploy-local.yml

```yaml
# deploy-local.yml: пуллим образ из GHCR

env:
  TICKETDESK_IMAGE: "ghcr.io/owner/ticket-desk:latest"

steps:
  - name: "🔑 Login to GHCR"
    run: docker login ghcr.io -u ${{ github.actor }} --password-stdin

  - name: "🚀 Pull and start"
    run: |
      docker compose pull next-app    # ← пуллим из GHCR
      docker compose up -d
```

**Цепочка:**
```
GitHub Actions (publish.yml) → docker push → GHCR
GHCR ← docker pull ← GitHub Actions (deploy-local.yml)
```

### Где посмотреть опубликованные образы

- GitHub → ваш репозиторий → правая панель **"Packages"**
- Или: `https://github.com/<owner>?tab=packages`
- Или в командной строке: `docker pull ghcr.io/<owner>/<repo>:latest`

---

## 7. SSR в контексте CI/CD

### Теория

**SSR** (Server-Side Rendering) — это когда HTML-страница генерируется **на сервере** перед отправкой браузеру.

В нашем проекте: Next.js рендерит список тикетов на сервере, браузер получает готовый HTML.

**Подробнее:** [`docs/next-vs-react.md`](next-vs-react.md)

### На каком этапе CI/CD стоит SSR

SSR — это **runtime** (работает когда приложение уже задеплоено).
В CI/CD SSR влияет на этапы:

```
CI (npm run build)
  └─ Next.js компилирует SSR-страницы
  └─ Если SSR-страница сломана → build падает → PR заблокирован ✅

Docker (Stage 2: builder)
  └─ RUN npm run build → тот же процесс в контейнере

Runtime (после деплоя)
  └─ Браузер → nginx → Next.js → рендерит HTML → браузер
```

### Практика — как CI ловит SSR-ошибки

```typescript
// src/app/page.tsx — SSR-страница
export default async function HomePage() {
  // Если здесь будет ошибка TypeScript:
  const tickets: string = await getAllTickets(); // ← ошибка типа!
  return <TicketList tickets={tickets} />;
}
```

В CI сработают ДВА шага:
1. **Typecheck** (`npm run typecheck`) — поймает ошибку типа
2. **Build** (`npm run build`) — сборка упадёт при рендере страницы

---

## 8. Server Actions в контексте CI/CD

### Теория

**Server Actions** — функции Next.js, которые выполняются **только на сервере**, вызываются из форм на клиенте.

В нашем проекте: `src/actions/tickets.ts` — создание, обновление, удаление тикетов.

**Подробнее:** [`docs/next-vs-react.md`](next-vs-react.md)

### На каком этапе CI/CD стоит Server Actions

```
Разработка
  └─ Server Action = обычная TypeScript-функция с директивой 'use server'
  └─ TypeScript проверяет типы, ESLint проверяет стиль

CI Pipeline
  ├─ Lint: проверяет код action'а
  ├─ Typecheck: проверяет типы аргументов и возвращаемых значений
  └─ Build: Next.js создаёт специальные endpoint'ы для каждого action'а

Docker
  └─ Билд включает server actions в standalone-output

Runtime
  └─ Браузер отправляет POST → Next.js вызывает action → обновляет данные
```

### Практика — что проверяет CI

```typescript
// src/actions/tickets.ts
'use server';

export async function createTicketAction(prevState: ActionState, formData: FormData) {
  const raw = {
    title: formData.get('title'),      // TypeScript знает тип: FormDataEntryValue | null
    priority: Number(formData.get('priority')),
  };

  const parsed = createTicketSchema.safeParse(raw);  // Zod-валидация
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await storeCreate(parsed.data);
  revalidatePath('/');
  return { success: true };
}
```

**Тест действия через curl (после деплоя):**
```bash
# Server Actions вызываются как POST-запросы
# Но удобнее тестировать через API Routes:
curl -X POST http://localhost:8080/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Тест","description":"Проверка API","priority":1}'
```

---

## 9. Reverse Proxy в контексте CI/CD

### Теория

**Reverse Proxy** — сервер-посредник, который принимает запросы от пользователей и передаёт их приложению.

В нашем проекте: NGINX принимает запросы на порту 8080, добавляет gzip/cache/security headers, и проксирует на Next.js (порт 3000 внутри Docker-сети).

**Подробнее:** [`docs/nginx-explained.md`](nginx-explained.md)

### На каком этапе CI/CD стоит Reverse Proxy

```
CI Pipeline
  └─ НЕ проверяет nginx напрямую
  └─ docker-build job проверяет что Dockerfile собирается
     (nginx запускается через docker compose, не через Dockerfile)

Docker Compose (docker-compose.yml)
  ├─ nginx: image: nginx:1.27-alpine (готовый образ, не собирается)
  ├─ nginx читает ./nginx/nginx.conf
  └─ nginx depends_on next-app (ждёт healthcheck)

Деплой (deploy-local.yml)
  └─ docker compose up -d запускает ОБА: nginx + next-app
  └─ Healthcheck проверяет http://localhost:8080/healthz
     (именно через nginx, не напрямую к Next.js!)
```

### Архитектура запросов

```
Браузер
  │ HTTP :8080
  ▼
NGINX (контейнер)
  │ gzip + cache + headers
  │ proxy_pass http://next-app:3000
  ▼
Next.js (контейнер, порт 3000)
  │ SSR / Server Actions / API
  ▼
/data/db.json (Docker volume)
```

### Практика — healthcheck через nginx

```yaml
# deploy-local.yml: проверяем ЧЕРЕЗ nginx (порт 8080, не 3000)
$url = "http://localhost:8080/healthz"

# Это правильно! Проверяем всю цепочку:
# localhost:8080 → nginx → next-app:3000 → /healthz

# Если проверять напрямую http://localhost:3000/healthz,
# мы не знаем работает ли nginx.
```

---

## 10. Полная картина: что за чем идёт

### CI/CD Pipeline этого проекта

```
┌─────────────────────────────────────────────────────────────────────┐
│  РАЗРАБОТКА                                                          │
│                                                                      │
│  git checkout -b feature/my-fix                                      │
│  # пишем код: SSR-страницы, Server Actions, API routes              │
│  git commit && git push                                              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ git push → открыть PR в main
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CI (.github/workflows/ci.yml)          ТРИГГЕР: pull_request       │
│  Runs on: ubuntu-latest (облачный runner GitHub)                    │
│                                                                      │
│  Job 1: node-ci (параллельно с Job 2)                               │
│  ├─ npm ci                    # установить зависимости               │
│  ├─ npm run lint              # ESLint                               │
│  ├─ npm run typecheck         # tsc (SSR + Server Actions)          │
│  ├─ npm test                  # vitest unit-тесты                   │
│  └─ npm run build             # next build (SSR-рендер страниц)     │
│                                                                      │
│  Job 2: docker-build (параллельно с Job 1)                          │
│  └─ docker build . --no-push  # проверяем Dockerfile                │
│                                                                      │
│  Результат: ✅ или ❌ в PR → можно/нельзя мержить                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ merge PR в main
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PUBLISH (.github/workflows/publish.yml)  ТРИГГЕР: push main / tag  │
│  Runs on: ubuntu-latest                                              │
│                                                                      │
│  Job: build-and-push                                                 │
│  ├─ docker buildx build . (multi-stage: deps → builder → runner)    │
│  ├─ docker push → ghcr.io/owner/ticket-desk:latest                  │
│  ├─ docker push → ghcr.io/owner/ticket-desk:sha-abc1234             │
│  └─ (при теге v1.0.0) docker push → ghcr.io/...:1.0.0              │
│                                                                      │
│  [GHCR] ← образ сохранён                                            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ publish завершён (или вручную)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DEPLOY (.github/workflows/deploy-local.yml)                        │
│  ТРИГГЕР: push main ИЛИ workflow_dispatch (вручную)                 │
│  Runs on: self-hosted, Windows, local-deploy (ВАШ ПК)              │
│                                                                      │
│  Job: deploy                                                         │
│  ├─ git checkout (для docker-compose.yml + nginx.conf)              │
│  ├─ docker login ghcr.io                                            │
│  ├─ docker compose pull next-app ← тянем образ из [GHCR]           │
│  ├─ docker compose up -d                                            │
│  │   ├─ nginx (reverse proxy, :8080)                                │
│  │   └─ next-app (SSR + Server Actions, :3000 внутри)              │
│  ├─ healthcheck http://localhost:8080/healthz (через nginx!)        │
│  ├─ ✅ healthcheck OK → сохранить тег как "last_good"               │
│  └─ ❌ healthcheck FAIL → rollback на previous tag                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Где живёт каждая технология

| Технология | Где в проекте | На каком этапе CI/CD |
|------------|--------------|----------------------|
| **GitHub Actions** | `.github/workflows/*.yml` | Запускает весь CI/CD |
| **CI (lint/test/build)** | `ci.yml` | При открытии PR |
| **GHCR** | `publish.yml` | После мержа в main |
| **SSR** | `src/app/page.tsx`, `tickets/[id]/page.tsx` | Проверяется при `npm run build` в CI |
| **Server Actions** | `src/actions/tickets.ts` | Проверяется при typecheck + build в CI |
| **Reverse Proxy (NGINX)** | `nginx/nginx.conf`, `docker-compose.yml` | Запускается при деплое |
| **Self-hosted Runner** | Ваш ПК (`deploy-local.yml`) | Выполняет деплой |

---

## Шпаргалка: быстрый старт

### Первый раз — настраиваем всё

```bash
# 1. Клонировать репозиторий
git clone https://github.com/<owner>/Ticket-Desk.git
cd Ticket-Desk

# 2. Проверить что локальный запуск работает
docker compose up --build
# Открыть http://localhost:8080

# 3. Установить self-hosted runner (для деплоя)
# → см. docs/runner-setup-windows.md

# 4. Настроить branch protection (опционально)
# GitHub → Settings → Branches → Add rule → main
# ✅ Require status checks to pass
```

### Рабочий цикл (каждый день)

```bash
# 1. Создать ветку
git checkout -b feature/my-feature

# 2. Писать код
# ... изменить src/app/page.tsx, src/actions/tickets.ts и т.д.

# 3. Проверить локально
npm run lint && npm run typecheck && npm test && npm run build

# 4. Запушить и открыть PR
git push origin feature/my-feature
# GitHub UI → New pull request

# 5. Ждать CI → смотреть Checks во вкладке PR

# 6. После approve → Merge pull request
# → publish.yml автоматически собирает образ
# → deploy-local.yml автоматически деплоит

# 7. Посмотреть результат
# http://localhost:8080
```

### Ручной деплой конкретной версии

```
GitHub → Actions → Deploy Local → Run workflow
→ Ввести тег (например: sha-abc1234)
→ Run workflow
```

### Посмотреть логи деплоя

```powershell
# Логи NGINX (access + error)
docker compose logs -f nginx

# Логи Next.js
docker compose logs -f next-app

# Статус контейнеров
docker compose ps
```
