/**
 * Кастомная 404 страница.
 * Next.js автоматически показывает её при вызове notFound().
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty-state">
      <p className="empty-state__icon">🔍</p>
      <h2>Страница не найдена</h2>
      <p className="empty-state__text">
        Запрошенный ресурс не существует или был удалён.
      </p>
      <Link href="/" className="btn btn--primary">
        На главную
      </Link>
    </div>
  );
}
