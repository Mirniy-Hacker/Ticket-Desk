/**
 * TicketDetail — детальный вид тикета с формой редактирования и удаления.
 *
 * "use client" — потому что:
 *  - useActionState для управления формами
 *  - useState для переключения режима редактирования
 *  - confirm() для подтверждения удаления (браузерный API)
 */
'use client';

import { useActionState, useState } from 'react';
import { updateTicketAction, deleteTicketAction } from '@/actions/tickets';
import type { Ticket, ActionState } from '@/lib/types';
import { StatusBadge, PriorityIndicator } from './StatusBadge';
import Link from 'next/link';

interface TicketDetailProps {
  ticket: Ticket;
}

const initialState: ActionState = { success: false };

export function TicketDetail({ ticket }: TicketDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction, isUpdating] = useActionState(
    updateTicketAction,
    initialState
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteTicketAction,
    initialState
  );

  return (
    <div className="ticket-detail">
      {/* Навигация назад */}
      <Link href="/" className="ticket-detail__back">
        ← Назад к списку
      </Link>

      {/* Заголовок и метаданные */}
      <div className="ticket-detail__header">
        <h1 className="ticket-detail__title">{ticket.title}</h1>
        <div className="ticket-detail__meta">
          <StatusBadge status={ticket.status} />
          <PriorityIndicator priority={ticket.priority} />
        </div>
      </div>

      {/* Даты */}
      <div className="ticket-detail__dates">
        <span>
          Создан:{' '}
          <time dateTime={ticket.createdAt}>
            {new Date(ticket.createdAt).toLocaleString('ru-RU')}
          </time>
        </span>
        <span>
          Обновлён:{' '}
          <time dateTime={ticket.updatedAt}>
            {new Date(ticket.updatedAt).toLocaleString('ru-RU')}
          </time>
        </span>
      </div>

      {/* Описание */}
      <div className="ticket-detail__description">
        <h2>Описание</h2>
        <p>{ticket.description}</p>
      </div>

      {/* Сообщения */}
      {updateState.success && (
        <div className="alert alert--success">Тикет обновлён!</div>
      )}
      {updateState.error && (
        <div className="alert alert--error">{updateState.error}</div>
      )}
      {deleteState.error && (
        <div className="alert alert--error">{deleteState.error}</div>
      )}

      {/* Кнопки действий */}
      <div className="ticket-detail__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Отмена' : '✏️ Редактировать'}
        </button>

        {/* Форма удаления (отдельная форма с подтверждением) */}
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm('Удалить этот тикет? Это действие необратимо.')) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={ticket.id} />
          <button
            type="submit"
            className="btn btn--danger"
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаляем...' : '🗑️ Удалить'}
          </button>
        </form>
      </div>

      {/* Форма редактирования */}
      {isEditing && (
        <form action={updateAction} className="ticket-form ticket-form--edit">
          <input type="hidden" name="id" value={ticket.id} />

          <div className="form-group">
            <label htmlFor="edit-title" className="form-label">
              Заголовок
            </label>
            <input
              id="edit-title"
              name="title"
              type="text"
              required
              minLength={3}
              maxLength={200}
              className="form-input"
              defaultValue={ticket.title}
            />
            {updateState.fieldErrors?.title && (
              <p className="form-error">{updateState.fieldErrors.title[0]}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="edit-description" className="form-label">
              Описание
            </label>
            <textarea
              id="edit-description"
              name="description"
              required
              minLength={10}
              maxLength={5000}
              rows={6}
              className="form-input form-input--textarea"
              defaultValue={ticket.description}
            />
            {updateState.fieldErrors?.description && (
              <p className="form-error">
                {updateState.fieldErrors.description[0]}
              </p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-status" className="form-label">
                Статус
              </label>
              <select
                id="edit-status"
                name="status"
                className="form-select"
                defaultValue={ticket.status}
              >
                <option value="open">Открыт</option>
                <option value="in_progress">В работе</option>
                <option value="done">Готово</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-priority" className="form-label">
                Приоритет
              </label>
              <select
                id="edit-priority"
                name="priority"
                className="form-select"
                defaultValue={String(ticket.priority)}
              >
                <option value="1">🔴 Высокий</option>
                <option value="2">🟡 Средний</option>
                <option value="3">🟢 Низкий</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            disabled={isUpdating}
          >
            {isUpdating ? 'Сохраняем...' : 'Сохранить изменения'}
          </button>
        </form>
      )}
    </div>
  );
}
