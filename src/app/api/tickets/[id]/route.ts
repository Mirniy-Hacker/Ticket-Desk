/**
 * API Route: операции с конкретным тикетом.
 * GET    /api/tickets/[id] — получить тикет
 * PATCH  /api/tickets/[id] — обновить поля
 * DELETE /api/tickets/[id] — удалить
 */
import { getTicketById, updateTicket, deleteTicket } from '@/lib/store';
import { updateTicketSchema } from '@/lib/schemas';
import { generateRequestId, errorResponse, successResponse } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/tickets/:id */
export async function GET(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const ticket = await getTicketById(id);
    if (!ticket) {
      return errorResponse(`Тикет ${id} не найден`, 404, requestId);
    }
    return successResponse(ticket, requestId);
  } catch (err) {
    console.error(`[${requestId}]`, err);
    return errorResponse('Внутренняя ошибка сервера', 500, requestId);
  }
}

/** PATCH /api/tickets/:id */
export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();

    const parsed = updateTicketSchema.safeParse(body);
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

    const ticket = await updateTicket(id, {
      ...parsed.data,
      priority: parsed.data.priority as 1 | 2 | 3 | undefined,
    });
    if (!ticket) {
      return errorResponse(`Тикет ${id} не найден`, 404, requestId);
    }

    return successResponse(ticket, requestId);
  } catch (err) {
    console.error(`[${requestId}]`, err);
    return errorResponse('Внутренняя ошибка сервера', 500, requestId);
  }
}

/** DELETE /api/tickets/:id */
export async function DELETE(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  const requestId = generateRequestId();
  try {
    const { id } = await context.params;
    const deleted = await deleteTicket(id);
    if (!deleted) {
      return errorResponse(`Тикет ${id} не найден`, 404, requestId);
    }
    return successResponse({ deleted: true }, requestId);
  } catch (err) {
    console.error(`[${requestId}]`, err);
    return errorResponse('Внутренняя ошибка сервера', 500, requestId);
  }
}
