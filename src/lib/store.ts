/**
 * JSON Store — хранилище тикетов в файле.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ КЛЮЧЕВАЯ ИДЕЯ:                                                 │
 * │ В реальном проекте здесь была бы БД (Postgres, MongoDB и т.д.) │
 * │ Мы используем JSON-файл для простоты, но реализуем:            │
 * │  - Атомарную запись (temp file + rename)                       │
 * │  - Защиту от гонок (async mutex)                               │
 * │  - Автоматический seed при первом запуске                      │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * АТОМАРНАЯ ЗАПИСЬ:
 * Проблема: если приложение упадёт ПОСРЕДИ записи файла, данные будут повреждены.
 * Решение: пишем во временный файл, а затем атомарно переименовываем.
 * Переименование на одной файловой системе — атомарная операция в ОС.
 *
 * MUTEX (блокировка):
 * Проблема: два одновременных запроса читают файл, оба меняют данные, оба пишут.
 * Второй перезапишет изменения первого (lost update).
 * Решение: очередь — второй запрос ждёт, пока первый закончит запись.
 */
import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Ticket, TicketStore, TicketFilters, TicketPriority, TicketStatus } from './types';
import { seedTickets } from './seed';

// ────────────────────────────────────────────
// Async Mutex — простая очередь для сериализации записей
// ────────────────────────────────────────────
class AsyncMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  /**
   * Захватывает блокировку. Возвращает функцию release(), которую ОБЯЗАТЕЛЬНО
   * нужно вызвать после завершения операции (лучше в finally).
   */
  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const tryAcquire = () => {
        if (!this.locked) {
          this.locked = true;
          resolve(() => {
            this.locked = false;
            // Даём следующему в очереди право захватить блокировку
            const next = this.queue.shift();
            if (next) next();
          });
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }
}

const mutex = new AsyncMutex();

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

/**
 * Путь к файлу данных. Читается из env при КАЖДОМ вызове,
 * чтобы тесты могли менять DATA_PATH между тестами.
 */
function getDataPath(): string {
  return process.env.DATA_PATH || path.join(process.cwd(), 'data', 'db.json');
}

/**
 * Читает JSON-файл. Если файла нет — создаёт с seed-данными.
 * НЕ использует mutex (чтобы не вызвать deadlock при вызове из write-операций).
 * При конкурентном seeding — последний запишет финальную версию (atomicWrite гарантирует целостность).
 */
async function readStore(): Promise<TicketStore> {
  const dataPath = getDataPath();

  if (!existsSync(dataPath)) {
    console.log(`[store] Первый запуск: создаём ${dataPath} с seed-данными`);
    const store: TicketStore = { tickets: seedTickets() };
    await atomicWrite(store);
    return store;
  }

  const raw = await readFile(dataPath, 'utf-8');
  return JSON.parse(raw) as TicketStore;
}

/**
 * Атомарная запись: temp file → rename.
 * Если rename не сработает (crash), останется .tmp файл, но основной файл не повредится.
 */
async function atomicWrite(store: TicketStore): Promise<void> {
  const dataPath = getDataPath();
  const dir = path.dirname(dataPath);
  await mkdir(dir, { recursive: true });

  const tmpPath = `${dataPath}.${crypto.randomUUID().slice(0, 8)}.tmp`;
  await writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  await rename(tmpPath, dataPath);
}

// ────────────────────────────────────────────
// CRUD операции (экспортируемый API)
// ────────────────────────────────────────────

/**
 * Получить все тикеты с опциональной фильтрацией.
 * READ-операция: mutex НЕ нужен (JSON.parse создаёт копию).
 */
export async function getAllTickets(filters?: TicketFilters): Promise<Ticket[]> {
  const store = await readStore();
  let tickets = store.tickets;

  // Фильтр по статусу
  if (filters?.status && filters.status !== 'all') {
    tickets = tickets.filter((t) => t.status === filters.status);
  }

  // Поиск по title и description (case-insensitive)
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }

  // Сортировка: новые сверху
  return tickets.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Получить один тикет по ID. null если не найден. */
export async function getTicketById(id: string): Promise<Ticket | null> {
  const store = await readStore();
  return store.tickets.find((t) => t.id === id) ?? null;
}

/**
 * Создать тикет. WRITE-операция: защищена mutex.
 * Возвращает созданный тикет с сгенерированными id/dates.
 */
export async function createTicket(data: {
  title: string;
  description: string;
  priority: number;
}): Promise<Ticket> {
  const release = await mutex.acquire();
  try {
    const store = await readStore();
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      status: 'open',
      priority: data.priority as TicketPriority,
      createdAt: now,
      updatedAt: now,
    };
    store.tickets.push(ticket);
    await atomicWrite(store);
    console.log(`[store] Создан тикет ${ticket.id}: "${ticket.title}"`);
    return ticket;
  } finally {
    release();
  }
}

/**
 * Обновить тикет. WRITE-операция: защищена mutex.
 * Возвращает обновлённый тикет или null если не найден.
 */
export async function updateTicket(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
  }>
): Promise<Ticket | null> {
  const release = await mutex.acquire();
  try {
    const store = await readStore();
    const index = store.tickets.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const existing = store.tickets[index]!;
    const updated: Ticket = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    store.tickets[index] = updated;
    await atomicWrite(store);
    console.log(`[store] Обновлён тикет ${id}`);
    return updated;
  } finally {
    release();
  }
}

/**
 * Удалить тикет. WRITE-операция: защищена mutex.
 * Возвращает true если тикет был найден и удалён.
 */
export async function deleteTicket(id: string): Promise<boolean> {
  const release = await mutex.acquire();
  try {
    const store = await readStore();
    const index = store.tickets.findIndex((t) => t.id === id);
    if (index === -1) return false;

    store.tickets.splice(index, 1);
    await atomicWrite(store);
    console.log(`[store] Удалён тикет ${id}`);
    return true;
  } finally {
    release();
  }
}
