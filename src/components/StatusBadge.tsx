/**
 * StatusBadge — цветной бейдж статуса тикета.
 * Чистый компонент без состояния: получает status, рисует бейдж.
 */
import type { TicketStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${status}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * PriorityIndicator — точка приоритета с цветом.
 */
export function PriorityIndicator({ priority }: { priority: number }) {
  const labels: Record<number, string> = { 1: 'Высокий', 2: 'Средний', 3: 'Низкий' };
  return (
    <span className={`priority priority--${priority}`} title={`Приоритет: ${labels[priority] || priority}`}>
      {labels[priority] || `P${priority}`}
    </span>
  );
}
