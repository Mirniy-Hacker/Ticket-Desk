/**
 * Страница тикета — детальный просмотр + редактирование + удаление.
 *
 * Server Component: загружает тикет из store на сервере,
 * передаёт данные в клиентский TicketDetail.
 *
 * Если тикет не найден — вызываем notFound() (Next.js покажет 404 страницу).
 */
import { notFound } from 'next/navigation';
import { getTicketById } from '@/lib/store';
import { TicketDetail } from '@/components/TicketDetail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: PageProps) {
  const { id } = await params;
  const ticket = await getTicketById(id);

  if (!ticket) {
    notFound();
  }

  return <TicketDetail ticket={ticket} />;
}
