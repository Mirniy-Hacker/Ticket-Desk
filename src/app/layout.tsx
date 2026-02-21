/**
 * Root Layout — корневой макет ВСЕХ страниц.
 *
 * В Next.js App Router layout.tsx оборачивает все дочерние страницы.
 * Здесь:
 *  - <html> и <body> теги (обязательны в root layout)
 *  - Подключение глобальных стилей (globals.css)
 *  - Шапка приложения (одинаковая на всех страницах)
 *
 * Этот файл — Server Component (по умолчанию, без "use client").
 * Значит он рендерится на СЕРВЕРЕ и отправляется как готовый HTML.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ticket Desk',
  description: 'Учебный баг-трекер: Next.js + NGINX + Docker + CI/CD',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        {/* Шапка — одинаковая на всех страницах */}
        <header className="header">
          <div className="container header__inner">
            <Link href="/" className="header__logo">
              🎫 Ticket Desk
            </Link>
            <nav className="header__nav">
              <span className="header__hint">
                Next.js + NGINX + Docker
              </span>
            </nav>
          </div>
        </header>

        {/* Основной контент — меняется в зависимости от страницы */}
        <main className="main">
          <div className="container">{children}</div>
        </main>

        <footer className="footer">
          <div className="container footer__inner">
            <span>Ticket Desk — учебный проект</span>
            <span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
