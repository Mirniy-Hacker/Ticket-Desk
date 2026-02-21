/**
 * Unit-тесты для JSON Store (src/lib/store.ts).
 *
 * Тестируем:
 *  - Автоматический seed при первом запуске
 *  - CRUD: create, read (getAll/getById), update, delete
 *  - Фильтрация по статусу и поиск
 *  - Атомарность (файл не повреждается)
 *
 * Стратегия: каждый тест использует УНИКАЛЬНЫЙ временный файл (DATA_PATH),
 * чтобы тесты не мешали друг другу.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Хелпер: создаём уникальный путь для каждого теста
function useTempDataPath(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticketdesk-test-'));
  const dataPath = path.join(tmpDir, 'db.json');
  process.env.DATA_PATH = dataPath;
  return tmpDir;
}

// Очищаем после всех тестов
const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Динамический import чтобы store читал DATA_PATH при каждом вызове
async function getStore() {
  // Используем динамический import с query string чтобы избежать кеширования модуля
  // В vitest это работает, т.к. store читает DATA_PATH через process.env при каждом вызове
  const store = await import('../src/lib/store');
  return store;
}

describe('Store — Auto-seed', () => {
  beforeEach(() => {
    const dir = useTempDataPath();
    tempDirs.push(dir);
  });

  it('создаёт seed-данные при первом обращении (10-20 тикетов)', async () => {
    const store = await getStore();
    const tickets = await store.getAllTickets();

    expect(tickets.length).toBeGreaterThanOrEqual(10);
    expect(tickets.length).toBeLessThanOrEqual(20);
  });

  it('каждый seed-тикет имеет валидную структуру', async () => {
    const store = await getStore();
    const tickets = await store.getAllTickets();

    for (const t of tickets) {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(['open', 'in_progress', 'done']).toContain(t.status);
      expect([1, 2, 3]).toContain(t.priority);
      expect(new Date(t.createdAt).getTime()).not.toBeNaN();
      expect(new Date(t.updatedAt).getTime()).not.toBeNaN();
    }
  });
});

describe('Store — Create', () => {
  beforeEach(() => {
    const dir = useTempDataPath();
    tempDirs.push(dir);
  });

  it('создаёт тикет и возвращает его с id/dates', async () => {
    const store = await getStore();
    const ticket = await store.createTicket({
      title: 'Тестовый тикет',
      description: 'Описание тестового тикета для проверки',
      priority: 2,
    });

    expect(ticket.id).toBeTruthy();
    expect(ticket.title).toBe('Тестовый тикет');
    expect(ticket.status).toBe('open');
    expect(ticket.priority).toBe(2);
    expect(ticket.createdAt).toBeTruthy();
  });

  it('созданный тикет появляется в списке', async () => {
    const store = await getStore();
    const before = await store.getAllTickets();
    const countBefore = before.length;

    await store.createTicket({
      title: 'Новый тикет в списке',
      description: 'Проверяем что он появится в getAllTickets',
      priority: 1,
    });

    const after = await store.getAllTickets();
    expect(after.length).toBe(countBefore + 1);
  });
});

describe('Store — Read (getById)', () => {
  beforeEach(() => {
    const dir = useTempDataPath();
    tempDirs.push(dir);
  });

  it('находит тикет по ID', async () => {
    const store = await getStore();
    const created = await store.createTicket({
      title: 'Найди меня',
      description: 'Тикет для тестирования getTicketById',
      priority: 3,
    });

    const found = await store.getTicketById(created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.title).toBe('Найди меня');
  });

  it('возвращает null для несуществующего ID', async () => {
    const store = await getStore();
    const found = await store.getTicketById('non-existent-id');
    expect(found).toBeNull();
  });
});

describe('Store — Update', () => {
  beforeEach(() => {
    const dir = useTempDataPath();
    tempDirs.push(dir);
  });

  it('обновляет поля тикета', async () => {
    const store = await getStore();
    const created = await store.createTicket({
      title: 'До обновления',
      description: 'Описание до обновления для теста',
      priority: 3,
    });

    const updated = await store.updateTicket(created.id, {
      title: 'После обновления',
      status: 'in_progress',
      priority: 1,
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('После обновления');
    expect(updated?.status).toBe('in_progress');
    expect(updated?.priority).toBe(1);
    // updatedAt должно измениться
    expect(updated?.updatedAt).not.toBe(created.updatedAt);
  });

  it('возвращает null при обновлении несуществующего тикета', async () => {
    const store = await getStore();
    const result = await store.updateTicket('non-existent', { title: 'Test' });
    expect(result).toBeNull();
  });
});

describe('Store — Delete', () => {
  beforeEach(() => {
    const dir = useTempDataPath();
    tempDirs.push(dir);
  });

  it('удаляет тикет и возвращает true', async () => {
    const store = await getStore();
    const created = await store.createTicket({
      title: 'Удали меня',
      description: 'Этот тикет будет удалён в тесте',
      priority: 2,
    });

    const deleted = await store.deleteTicket(created.id);
    expect(deleted).toBe(true);

    const found = await store.getTicketById(created.id);
    expect(found).toBeNull();
  });

  it('возвращает false при удалении несуществующего тикета', async () => {
    const store = await getStore();
    const deleted = await store.deleteTicket('non-existent');
    expect(deleted).toBe(false);
  });
});

describe('Store — Filter', () => {
  beforeEach(() => {
    const dir = useTempDataPath();
    tempDirs.push(dir);
  });

  it('фильтрует по статусу', async () => {
    const store = await getStore();

    // Создаём тикеты с разными статусами
    const t1 = await store.createTicket({ title: 'Open ticket', description: 'Тикет в статусе open для фильтра', priority: 1 });
    await store.createTicket({ title: 'Another ticket', description: 'Ещё один тикет для фильтрации', priority: 2 });
    await store.updateTicket(t1.id, { status: 'done' });

    const doneTickets = await store.getAllTickets({ status: 'done' });
    // Все возвращённые тикеты должны быть done
    for (const t of doneTickets) {
      expect(t.status).toBe('done');
    }
  });

  it('ищет по title и description (case-insensitive)', async () => {
    const store = await getStore();
    await store.createTicket({
      title: 'UniqueSearchTerm123',
      description: 'Тикет с уникальным заголовком для поиска',
      priority: 1,
    });

    const results = await store.getAllTickets({ search: 'uniquesearchterm' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((t) => t.title.includes('UniqueSearchTerm123'))).toBe(true);
  });

  it('"all" статус возвращает все тикеты', async () => {
    const store = await getStore();
    const all = await store.getAllTickets({ status: 'all' });
    const noFilter = await store.getAllTickets();
    expect(all.length).toBe(noFilter.length);
  });
});

describe('Store — Atomicity', () => {
  beforeEach(() => {
    const dir = useTempDataPath();
    tempDirs.push(dir);
  });

  it('файл остаётся валидным JSON после записи', async () => {
    const store = await getStore();
    await store.createTicket({
      title: 'Atomicity test',
      description: 'Проверяем что файл не повреждён после записи',
      priority: 1,
    });

    const dataPath = process.env.DATA_PATH!;
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.tickets).toBeDefined();
    expect(Array.isArray(parsed.tickets)).toBe(true);
  });

  it('параллельные записи не теряют данные', async () => {
    const store = await getStore();

    // Запускаем 5 параллельных create
    const promises = Array.from({ length: 5 }, (_, i) =>
      store.createTicket({
        title: `Parallel ticket ${i}`,
        description: `Тикет ${i}: тестирование параллельных записей`,
        priority: ((i % 3) + 1),
      })
    );
    await Promise.all(promises);

    const all = await store.getAllTickets();
    const parallelTickets = all.filter((t) => t.title.startsWith('Parallel ticket'));
    // Все 5 тикетов должны быть записаны (mutex защищает от потери)
    expect(parallelTickets.length).toBe(5);
  });
});
