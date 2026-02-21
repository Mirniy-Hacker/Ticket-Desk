/**
 * API Route: GET /api/tickets — список тикетов, POST /api/tickets — создать тикет.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ ЗАЧЕМ API Routes если есть Server Actions?                      │
 * │ Server Actions удобны для форм (form submission).               │
 * │ API Routes нужны для:                                           │
 * │  - Внешних клиентов (мобильные приложения, curl, Postman)       │
 * │  - Программного доступа (скрипты, интеграции)                   │
 * │  - REST-совместимости                                           │
 * │ В этом проекте ЕСТЬ ОБА — для обучения.                        │
 * └──────────────────────────────────────────────────────────────────┘
 */
import { getAllTickets, createTicket } from '@/lib/store';
import { createTicketSchema } from '@/lib/schemas';
import { generateRequestId, errorResponse, successResponse } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tickets?status=open&search=login
 * Возвращает массив тикетов. Поддерживает фильтрацию и поиск.
 */
export async function GET(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const tickets = await getAllTickets({
      status: status as 'open' | 'in_progress' | 'done' | 'all' | undefined,
      search,
    });

    return successResponse(tickets, requestId);
  } catch (err) {
    console.error(`[${requestId}]`, err);
    return errorResponse('Внутренняя ошибка сервера', 500, requestId);
  }
}

/**
 * POST /api/tickets
 * Создаёт новый тикет. Тело: { title, description, priority }.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = generateRequestId();

  try {
    const body: unknown = await request.json();

    // Валидация через Zod
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return Response.json(
        { error: 'Ошибка валидации', fieldErrors, requestId },
        {
          status: 400,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    const ticket = await createTicket(parsed.data);
    return successResponse(ticket, requestId, 201);
  } catch (err) {
    console.error(`[${requestId}]`, err);
    return errorResponse('Внутренняя ошибка сервера', 500, requestId);
  }
}
