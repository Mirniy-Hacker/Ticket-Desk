/**
 * Server Actions — серверные функции, вызываемые из форм.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ ЧЕМ ОТЛИЧАЮТСЯ ОТ API Routes?                                  │
 * │ Server Actions:                                                 │
 * │  - Вызываются напрямую из JSX (<form action={createTicket}>)    │
 * │  - Next.js сам сериализует/десериализует данные                  │
 * │  - Автоматически работают без JS на клиенте (progressive)       │
 * │  - Идеальны для форм в Next.js                                  │
 * │ API Routes:                                                     │
 * │  - Стандартный REST (fetch/curl/Postman)                        │
 * │  - Для внешних клиентов и интеграций                            │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * 'use server' — ОБЯЗАТЕЛЬНАЯ директива. Без неё Next.js не поймёт,
 * что эти функции должны выполняться ТОЛЬКО на сервере.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createTicket as storeCreate,
  updateTicket as storeUpdate,
  deleteTicket as storeDelete,
} from '@/lib/store';
import { createTicketSchema, updateTicketSchema } from '@/lib/schemas';
import type { ActionState } from '@/lib/types';

/**
 * Создать тикет (вызывается из формы на главной странице).
 * prevState — предыдущее состояние (для useActionState).
 * formData — данные формы (name-атрибуты инпутов).
 */
export async function createTicketAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority'),
  };

  const parsed = createTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await storeCreate(parsed.data);
  } catch (err) {
    console.error('[action:create]', err);
    return { success: false, error: 'Не удалось создать тикет' };
  }

  // revalidatePath сбрасывает кеш страницы, чтобы она перерисовалась с новыми данными
  revalidatePath('/');
  return { success: true };
}

/**
 * Обновить тикет (вызывается из формы на странице тикета).
 */
export async function updateTicketAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { success: false, error: 'ID тикета обязателен' };
  }

  const raw = {
    title: formData.get('title') || undefined,
    description: formData.get('description') || undefined,
    status: formData.get('status') || undefined,
    priority: formData.get('priority') || undefined,
  };

  const parsed = updateTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const ticket = await storeUpdate(id, {
      ...parsed.data,
      priority: parsed.data.priority as 1 | 2 | 3 | undefined,
    });
    if (!ticket) {
      return { success: false, error: 'Тикет не найден' };
    }
  } catch (err) {
    console.error('[action:update]', err);
    return { success: false, error: 'Не удалось обновить тикет' };
  }

  revalidatePath('/');
  revalidatePath(`/tickets/${id}`);
  return { success: true };
}

/**
 * Удалить тикет. После удаления — redirect на главную.
 */
export async function deleteTicketAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { success: false, error: 'ID тикета обязателен' };
  }

  try {
    const deleted = await storeDelete(id);
    if (!deleted) {
      return { success: false, error: 'Тикет не найден' };
    }
  } catch (err) {
    console.error('[action:delete]', err);
    return { success: false, error: 'Не удалось удалить тикет' };
  }

  revalidatePath('/');
  redirect('/');
}
