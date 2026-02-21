/**
 * Утилиты для request-id.
 *
 * Request ID — уникальный идентификатор каждого HTTP-запроса.
 * Зачем: чтобы связать лог на сервере с ответом клиенту.
 * Если пользователь видит ошибку с ID "a1b2c3d4", разработчик ищет этот ID в логах.
 *
 * Это СТАНДАРТНАЯ практика в production-системах (X-Request-Id header).
 */
import crypto from 'crypto';

/** Генерирует короткий уникальный ID (8 символов из UUID) */
export function generateRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Создаёт JSON-ответ об ошибке с request-id.
 * Также пишет ошибку в console.error (попадёт в логи Docker).
 */
export function errorResponse(
  message: string,
  status: number,
  requestId: string
): Response {
  console.error(`[${requestId}] Error ${status}: ${message}`);
  return Response.json(
    { error: message, requestId },
    {
      status,
      headers: {
        'X-Request-Id': requestId,
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * Создаёт успешный JSON-ответ с request-id в заголовке.
 */
export function successResponse(
  data: unknown,
  requestId: string,
  status: number = 200
): Response {
  return Response.json(data, {
    status,
    headers: {
      'X-Request-Id': requestId,
    },
  });
}
