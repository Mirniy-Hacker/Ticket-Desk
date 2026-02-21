/**
 * Health-check endpoint.
 *
 * GET /healthz — отвечает 200 OK если сервер жив.
 * Используется:
 *  - Docker HEALTHCHECK (в docker-compose.yml)
 *  - NGINX depends_on condition
 *  - CI/CD deploy workflow для проверки после деплоя
 *
 * Cache-Control: no-store — ответ НИКОГДА не кешируется,
 * иначе healthcheck может получить "старый" 200 от кеша.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
