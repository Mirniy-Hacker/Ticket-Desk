/**
 * Глобальный error boundary.
 * Next.js автоматически оборачивает страницы в этот компонент.
 * При ошибке рендеринга показывает fallback UI вместо белого экрана.
 *
 * "use client" обязателен для error boundary в App Router.
 */
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state__icon">⚠️</p>
      <h2>Что-то пошло не так</h2>
      <p className="empty-state__text">{error.message}</p>
      {error.digest && (
        <p className="empty-state__hint">
          ID ошибки: <code>{error.digest}</code>
        </p>
      )}
      <button onClick={reset} className="btn btn--primary">
        Попробовать снова
      </button>
    </div>
  );
}
