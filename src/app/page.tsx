/**
 * Главная страница — список тикетов.
 *
 * Это SERVER Component:
 *  - Выполняется на сервере при каждом запросе
 *  - Может напрямую вызывать store (fs-операции)
 *  - Получает searchParams из URL для фильтрации
 *  - Отдаёт готовый HTML клиенту (SSR)
 *
 * Клиентские компоненты (FilterBar, TicketForm) встраиваются как "острова"
 * интерактивности внутри серверного HTML.
 */
import { Suspense } from 'react';
import { getAllTickets } from '@/lib/store';
import { TicketList } from '@/components/TicketList';
import { FilterBar } from '@/components/FilterBar';
import { TicketForm } from '@/components/TicketForm';
import type { TicketStatus } from '@/lib/types';

/**
 * force-dynamic — каждый запрос заново выполняет функцию (без кеша).
 * Нужно потому что данные меняются при каждом create/update/delete.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tickets = await getAllTickets({
    status: (params.status as TicketStatus | 'all') || 'all',
    search: params.search || '',
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Тикеты</h1>
          <p className="page-subtitle">
            Всего: <strong>{tickets.length}</strong>
          </p>
        </div>
        <TicketForm />
      </div>

      {/* Suspense нужен для FilterBar, т.к. useSearchParams требует Suspense boundary */}
      <Suspense fallback={<div className="filter-bar-skeleton" />}>
        <FilterBar />
      </Suspense>

      <TicketList tickets={tickets} />
    </>
  );
}
