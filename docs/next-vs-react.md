# Next.js vs чистый React — на примере Ticket Desk

## Главный вопрос: в чём разница?

**Чистый React (CRA/Vite):** Клиентский SPA. Вся логика в браузере. Сервер отдаёт пустой HTML + JS-бандл.

**Next.js:** Фреймворк ПОВЕРХ React. Добавляет: сервер, роутинг, SSR/SSG, серверные компоненты, API, server actions.

---

## SSR (Server-Side Rendering) — на примере page.tsx

### Чистый React
```
Браузер → GET / → Сервер → <div id="root"></div> + bundle.js (500KB)
→ Браузер загружает JS → Выполняет → Делает fetch('/api/tickets') → Рисует список
```
**Проблемы:** белый экран 1-3 сек, SEO не видит контент, два roundtrip (HTML + API).

### Next.js (наш проект)
```
Браузер → GET / → Next.js сервер:
  1. Вызывает getAllTickets() НАПРЯМУЮ (без HTTP!)
  2. Рендерит React-компоненты в HTML
  3. Отправляет ГОТОВЫЙ HTML с данными
→ Браузер показывает HTML МГНОВЕННО → Hydration (подключение интерактивности)
```

**Конкретный файл: `src/app/page.tsx`**
```typescript
// Это SERVER Component — выполняется на сервере
export default async function HomePage({ searchParams }) {
  // Вызов НАПРЯМУЮ к store (файловая система!), а не через fetch
  const tickets = await getAllTickets({ status: params.status });
  // React рендерится в HTML НА СЕРВЕРЕ
  return <TicketList tickets={tickets} />;
}
```

---

## Server Components vs Client Components

### Server Components (по умолчанию в App Router)
- Выполняются **ТОЛЬКО на сервере**
- Могут читать файлы, обращаться к БД напрямую
- НЕ отправляют свой JS-код в браузер (меньше бандл)
- НЕ могут использовать useState, useEffect, onClick

**В нашем проекте:** `page.tsx`, `layout.tsx`, `TicketList.tsx`

### Client Components (`"use client"`)
- Выполняются **И на сервере (SSR), И в браузере**
- Могут использовать хуки, обработчики событий
- Их JS-код ОТПРАВЛЯЕТСЯ в браузер

**В нашем проекте:** `FilterBar.tsx`, `TicketForm.tsx`, `TicketDetail.tsx`

### Как они работают вместе?
```
page.tsx (Server) ──────────────────────────────────
  ├── <TicketForm /> (Client) ← интерактивная форма
  ├── <FilterBar />  (Client) ← useState, onChange
  └── <TicketList tickets={...} /> (Server) ← просто HTML
        └── <StatusBadge /> (Server) ← просто HTML
```

---

## Server Actions — для чего и как?

**Проблема в чистом React:**
1. Создаём форму
2. Пишем handleSubmit
3. Делаем fetch('/api/tickets', { method: 'POST', body: ... })
4. Создаём API endpoint
5. Парсим body, валидируем
6. Обновляем стейт/кеш

**В Next.js Server Actions — шаги 3-5 объединены:**

**Файл: `src/actions/tickets.ts`**
```typescript
'use server';  // ← Директива: эта функция выполняется ТОЛЬКО на сервере

export async function createTicketAction(prevState, formData) {
  const parsed = createTicketSchema.safeParse(raw);  // Валидация
  await storeCreate(parsed.data);                     // Запись в store
  revalidatePath('/');                                 // Обновить страницу
  return { success: true };
}
```

**Файл: `src/components/TicketForm.tsx`**
```typescript
'use client';

export function TicketForm() {
  const [state, formAction] = useActionState(createTicketAction, initial);
  return (
    // action={formAction} ← Next.js автоматически:
    // 1. Сериализует FormData
    // 2. Отправляет POST-запрос на специальный URL
    // 3. Десериализует на сервере
    // 4. Вызывает createTicketAction
    // 5. Возвращает результат
    <form action={formAction}>
      <input name="title" />
      <button>Создать</button>
    </form>
  );
}
```

**Бонус:** Работает даже с отключённым JavaScript (progressive enhancement)!

---

## API Routes — зачем они, если есть Server Actions?

**Server Actions** = для форм в Next.js приложении.
**API Routes** = для внешних клиентов (мобильные приложения, curl, скрипты).

**Файл: `src/app/api/tickets/route.ts`**
```typescript
// Стандартный REST endpoint
export async function GET(request: Request) {
  const tickets = await getAllTickets(filters);
  return Response.json(tickets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const ticket = await createTicket(body);
  return Response.json(ticket, { status: 201 });
}
```

**Тестирование через curl:**
```bash
# Получить все тикеты
curl http://localhost:8080/api/tickets

# Создать тикет
curl -X POST http://localhost:8080/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Bug","description":"Описание бага для тестирования API","priority":1}'
```

---

## App Router — файловая маршрутизация

В Next.js **файловая структура = маршруты**:

```
src/app/
├── page.tsx            → GET /
├── layout.tsx          → Обёртка для ВСЕХ страниц
├── not-found.tsx       → 404 страница
├── error.tsx           → Error boundary
├── healthz/
│   └── route.ts        → GET /healthz
├── tickets/
│   └── [id]/
│       └── page.tsx    → GET /tickets/:id
└── api/
    └── tickets/
        ├── route.ts    → GET/POST /api/tickets
        └── [id]/
            └── route.ts → GET/PATCH/DELETE /api/tickets/:id
```

- `page.tsx` → рендерит UI (React компонент)
- `route.ts` → обрабатывает HTTP (API endpoint)
- `[id]` → динамический сегмент (параметр из URL)
- `layout.tsx` → оборачивает все дочерние страницы

---

## Итого: что даёт Next.js в этом проекте

| Фича | Как используется | Файл |
|-------|-----------------|------|
| SSR | Список тикетов рендерится на сервере | `page.tsx` |
| Server Components | Прямой доступ к store без API | `page.tsx`, `tickets/[id]/page.tsx` |
| Client Components | Формы, фильтры, интерактивность | `FilterBar.tsx`, `TicketForm.tsx` |
| Server Actions | CRUD тикетов из форм | `actions/tickets.ts` |
| API Routes | REST API для внешних клиентов | `api/tickets/route.ts` |
| File-based routing | URL = структура папок | `src/app/` |
| Standalone output | Минимальный Docker-образ | `next.config.ts` |
