/**
 * TicketList — список карточек тикетов.
 * Серверный компонент (без "use client"): получает tickets как props, рендерит.
 * Вся интерактивность (клик → переход) работает через <a> (стандартный HTML).
 */
import type { Ticket } from '@/lib/types';
import { StatusBadge, PriorityIndicator } from './StatusBadge';
import Link from 'next/link';

interface TicketListProps {
  tickets: Ticket[];
}

export function TicketList({ tickets }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__icon">📋</p>
        <p className="empty-state__text">Тикетов не найдено</p>
        <p className="empty-state__hint">
          Создайте новый тикет или измените фильтры
        </p>
      </div>
    );
  }

  return (
    <div className="ticket-list">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={`/tickets/${ticket.id}`}
          className="ticket-card"
        >
          <div className="ticket-card__header">
            <h3 className="ticket-card__title">{ticket.title}</h3>
            <PriorityIndicator priority={ticket.priority} />
          </div>
          <p className="ticket-card__description">
            {ticket.description.length > 120
              ? `${ticket.description.slice(0, 120)}...`
              : ticket.description}
          </p>
          <div className="ticket-card__footer">
            <StatusBadge status={ticket.status} />
            <time className="ticket-card__date" dateTime={ticket.updatedAt}>
              {new Date(ticket.updatedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </time>
          </div>
        </Link>
      ))}
    </div>
  );
}
