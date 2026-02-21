/**
 * TicketForm — форма создания тикета.
 *
 * "use client" — потому что используем useActionState (React 19 хук).
 * useActionState управляет состоянием формы:
 *  - pending (отправка в процессе)
 *  - ошибки валидации
 *  - успешное создание
 *
 * Форма использует Server Action (createTicketAction) — функция выполняется
 * на СЕРВЕРЕ, но вызывается из клиентской формы.
 */
'use client';

import { useActionState, useState } from 'react';
import { createTicketAction } from '@/actions/tickets';
import type { ActionState } from '@/lib/types';

const initialState: ActionState = { success: false };

export function TicketForm() {
  const [state, formAction, isPending] = useActionState(createTicketAction, initialState);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ticket-form-wrapper">
      <button
        type="button"
        className="btn btn--primary ticket-form__toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕ Закрыть' : '+ Новый тикет'}
      </button>

      {isOpen && (
        <form action={formAction} className="ticket-form">
          {/* Сообщения об ошибках и успехе */}
          {state.error && !state.success && (
            <div className="alert alert--error">{state.error}</div>
          )}
          {state.success && (
            <div className="alert alert--success">Тикет создан!</div>
          )}

          <div className="form-group">
            <label htmlFor="create-title" className="form-label">
              Заголовок
            </label>
            <input
              id="create-title"
              name="title"
              type="text"
              required
              minLength={3}
              maxLength={200}
              className="form-input"
              placeholder="Краткое описание проблемы"
            />
            {state.fieldErrors?.title && (
              <p className="form-error">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="create-description" className="form-label">
              Описание
            </label>
            <textarea
              id="create-description"
              name="description"
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              className="form-input form-input--textarea"
              placeholder="Подробное описание: шаги воспроизведения, ожидаемое поведение, фактический результат"
            />
            {state.fieldErrors?.description && (
              <p className="form-error">{state.fieldErrors.description[0]}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="create-priority" className="form-label">
              Приоритет
            </label>
            <select
              id="create-priority"
              name="priority"
              required
              className="form-select"
              defaultValue="2"
            >
              <option value="1">🔴 Высокий</option>
              <option value="2">🟡 Средний</option>
              <option value="3">🟢 Низкий</option>
            </select>
            {state.fieldErrors?.priority && (
              <p className="form-error">{state.fieldErrors.priority[0]}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            disabled={isPending}
          >
            {isPending ? 'Создаём...' : 'Создать тикет'}
          </button>
        </form>
      )}
    </div>
  );
}
