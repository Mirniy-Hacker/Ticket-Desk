/**
 * Seed-данные: начальные тикеты при первом запуске.
 *
 * Если файл db.json не существует (первый запуск, или volume пуст),
 * store автоматически вызовет seedTickets() и запишет результат.
 * Тикеты выглядят реалистично — как в настоящем баг-трекере.
 */
import crypto from 'crypto';
import type { Ticket, TicketStatus, TicketPriority } from './types';

interface SeedItem {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
}

const SEED_DATA: SeedItem[] = [
  {
    title: 'Страница логина возвращает 500',
    description:
      'При попытке войти в систему с валидными учётными данными сервер отвечает 500 Internal Server Error. Воспроизводится стабильно. Логи показывают NPE в AuthService.validateToken().',
    status: 'open',
    priority: 1,
  },
  {
    title: 'Добавить загрузку аватарки профиля',
    description:
      'Пользователи хотят загружать свои аватарки. Нужно: форма загрузки, кроп до 256x256, хранение в S3-совместимом хранилище, отображение в шапке.',
    status: 'in_progress',
    priority: 2,
  },
  {
    title: 'Таблица заказов не сортируется по дате',
    description:
      'Клик по заголовку "Дата создания" не меняет сортировку. В консоли браузера ошибка: Cannot read property "sort" of undefined. Происходит только при пустом массиве фильтров.',
    status: 'open',
    priority: 2,
  },
  {
    title: 'Обновить зависимости до последних мажорных версий',
    description:
      'React 18 → 19, Next.js 14 → 15, TypeScript 5.3 → 5.7. Нужно пройти по breaking changes каждой библиотеки, обновить код, прогнать тесты.',
    status: 'in_progress',
    priority: 3,
  },
  {
    title: 'Утечка памяти в WebSocket-соединении',
    description:
      'После 2-3 часов работы с дашбордом вкладка потребляет >2 GB RAM. Heap snapshot показывает тысячи неочищенных обработчиков событий на WS. Нужно корректно отписываться при unmount.',
    status: 'open',
    priority: 1,
  },
  {
    title: 'Добавить тёмную тему',
    description:
      'Реализовать переключатель светлая/тёмная тема. Использовать CSS custom properties. Сохранять выбор в localStorage. Учитывать prefers-color-scheme.',
    status: 'done',
    priority: 3,
  },
  {
    title: 'API /users отдаёт пароли в ответе',
    description:
      'GET /api/users возвращает полный объект пользователя, включая хешированный пароль. Нужно срочно добавить DTO/сериализацию, исключающую sensitive-поля.',
    status: 'open',
    priority: 1,
  },
  {
    title: 'Настроить rate-limiting для API',
    description:
      'Текущее API не имеет ограничения частоты запросов. Добавить rate-limit middleware: 100 req/min для аутентифицированных, 20 req/min для анонимных. Использовать sliding window.',
    status: 'in_progress',
    priority: 2,
  },
  {
    title: 'CI падает на шаге lint',
    description:
      'После обновления ESLint до v9 CI-пайплайн стабильно падает. Ошибка: "Invalid configuration". Нужно мигрировать конфиг с .eslintrc на flat config (eslint.config.mjs).',
    status: 'done',
    priority: 2,
  },
  {
    title: 'Мобильная вёрстка корзины сломана',
    description:
      'На экранах <375px кнопка "Оформить заказ" уезжает за пределы viewport. Скролл горизонтальный. Нужно пересмотреть flex-контейнер и media queries.',
    status: 'open',
    priority: 2,
  },
  {
    title: 'Внедрить структурированные логи (JSON)',
    description:
      'Сейчас логи — plain text. Перевести на JSON-формат (pino/winston) для удобного парсинга в ELK/Grafana. Поля: timestamp, level, message, requestId, userId.',
    status: 'in_progress',
    priority: 3,
  },
  {
    title: 'Страница 404 не стилизована',
    description:
      'При переходе на несуществующий URL отображается стандартная Next.js-страница 404. Нужен кастомный дизайн в стиле приложения с кнопкой "На главную".',
    status: 'done',
    priority: 3,
  },
  {
    title: 'Оптимизировать SQL-запрос отчётов',
    description:
      'Формирование месячного отчёта занимает >30 секунд. EXPLAIN показывает full table scan на orders (2M строк). Нужны индексы по (created_at, status) и пагинация.',
    status: 'open',
    priority: 1,
  },
  {
    title: 'Написать E2E-тесты для checkout flow',
    description:
      'Покрыть Playwright-тестами: добавление товара → корзина → оформление → оплата (мок) → подтверждение. Минимум 3 сценария: успех, ошибка оплаты, пустая корзина.',
    status: 'in_progress',
    priority: 2,
  },
  {
    title: 'Docker-образ весит 1.2 GB',
    description:
      'Текущий Dockerfile копирует все node_modules. Перейти на multi-stage build + standalone output Next.js. Целевой размер: <200 MB.',
    status: 'done',
    priority: 3,
  },
];

/**
 * Генерирует начальный набор тикетов с реалистичными датами.
 * Даты распределены по последним 30 дням.
 */
export function seedTickets(): Ticket[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  return SEED_DATA.map((item, index) => {
    // Распределяем даты создания: от 30 дней назад до сегодня
    const daysAgo = SEED_DATA.length - index;
    const createdAt = new Date(now - daysAgo * DAY + Math.random() * DAY * 0.5);
    // updatedAt = createdAt + 0..3 дня (имитация работы над тикетом)
    const updatedAt = new Date(
      createdAt.getTime() + Math.floor(Math.random() * 3) * DAY
    );

    return {
      id: crypto.randomUUID(),
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  });
}
