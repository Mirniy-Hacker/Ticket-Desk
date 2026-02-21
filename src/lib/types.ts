/**
 * Типы данных Ticket Desk.
 *
 * Эти типы используются ВЕЗДЕ: store, API routes, server actions, компоненты.
 * Единственный источник истины (single source of truth) для структуры данных.
 */

/** Статусы тикета — строго ограниченный набор */
export type TicketStatus = 'open' | 'in_progress' | 'done';

/** Приоритет: 1 = высокий (критично), 2 = средний, 3 = низкий */
export type TicketPriority = 1 | 2 | 3;

/** Тикет — основная сущность приложения */
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Структура JSON-файла хранилища */
export interface TicketStore {
  tickets: Ticket[];
}

/** Фильтры для списка тикетов */
export interface TicketFilters {
  status?: TicketStatus | 'all';
  search?: string;
}

/** Результат server action — возвращается клиенту */
export interface ActionState {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Метки статусов для UI */
export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  done: 'Готово',
};

/** Метки приоритетов для UI */
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  1: 'Высокий',
  2: 'Средний',
  3: 'Низкий',
};
