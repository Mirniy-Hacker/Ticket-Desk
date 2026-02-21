/**
 * Zod-схемы для валидации входных данных.
 *
 * Zod используется потому что:
 * 1) Типобезопасность: из схемы автоматически выводятся TypeScript-типы
 * 2) Детальные ошибки: каждое поле получает своё сообщение
 * 3) Работает и на сервере (API routes, server actions), и можно переиспользовать на клиенте
 */
import { z } from 'zod';

/** Схема создания тикета — все поля обязательны */
export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Заголовок: минимум 3 символа')
    .max(200, 'Заголовок: максимум 200 символов'),
  description: z
    .string()
    .trim()
    .min(10, 'Описание: минимум 10 символов')
    .max(5000, 'Описание: максимум 5000 символов'),
  priority: z.coerce
    .number()
    .int()
    .min(1, 'Приоритет: от 1 до 3')
    .max(3, 'Приоритет: от 1 до 3'),
});

/** Схема обновления тикета — все поля опциональны */
export const updateTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Заголовок: минимум 3 символа')
    .max(200, 'Заголовок: максимум 200 символов')
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, 'Описание: минимум 10 символов')
    .max(5000, 'Описание: максимум 5000 символов')
    .optional(),
  status: z.enum(['open', 'in_progress', 'done'], {
    errorMap: () => ({ message: 'Статус: open | in_progress | done' }),
  }).optional(),
  priority: z.coerce
    .number()
    .int()
    .min(1, 'Приоритет: от 1 до 3')
    .max(3, 'Приоритет: от 1 до 3')
    .optional(),
});

/** Типы, выведённые из схем (чтобы не дублировать определения) */
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
