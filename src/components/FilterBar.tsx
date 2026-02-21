/**
 * FilterBar — панель фильтрации и поиска.
 *
 * "use client" — потому что:
 *  - Используем useState для debounce поиска
 *  - Используем useRouter для обновления URL search params
 *  - Обработчики событий (onChange) работают только в Client Components
 *
 * Почему фильтруем через URL params, а не через локальный state?
 * → Потому что данные загружаются на СЕРВЕРЕ (Server Component в page.tsx).
 *   Сервер читает searchParams из URL и фильтрует в store.
 *   Это значит: SSR всегда отдаёт уже отфильтрованный HTML.
 */
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || 'all';
  const currentSearch = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Обновляет URL search params (и тем самым вызывает перезагрузку данных на сервере).
   */
  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  /** Обработчик изменения статуса — мгновенная реакция */
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams('status', e.target.value);
  };

  /** Обработчик поиска — с debounce 300ms (чтобы не дёргать сервер на каждую букву) */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateParams('search', value);
    }, 300);
  };

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="filter-bar">
      <div className="filter-bar__group">
        <label htmlFor="status-filter" className="filter-bar__label">
          Статус
        </label>
        <select
          id="status-filter"
          className="filter-bar__select"
          value={currentStatus}
          onChange={handleStatusChange}
        >
          <option value="all">Все</option>
          <option value="open">Открытые</option>
          <option value="in_progress">В работе</option>
          <option value="done">Готовые</option>
        </select>
      </div>

      <div className="filter-bar__group filter-bar__group--search">
        <label htmlFor="search-input" className="filter-bar__label">
          Поиск
        </label>
        <input
          id="search-input"
          type="text"
          className="filter-bar__input"
          placeholder="Поиск по заголовку и описанию..."
          value={searchInput}
          onChange={handleSearchChange}
        />
      </div>
    </div>
  );
}
