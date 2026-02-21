# NGINX Explained — зачем nginx перед Next.js

## Зачем вообще reverse proxy?

Next.js **может** работать самостоятельно (node server.js на порту 3000).
Но в production перед ним почти всегда ставят **reverse proxy** (nginx, Caddy, Traefik).

### Что даёт nginx, чего нет у голого Next.js?

| Возможность | Next.js standalone | NGINX |
|------------|-------------------|-------|
| Отдача HTML/SSR | ✅ | Проксирует |
| Gzip-сжатие | ❌ (нужен middleware) | ✅ Встроенный, быстрый (C-код) |
| Cache-Control для статики | Частично | ✅ Полный контроль |
| Security headers | ❌ Вручную в каждом route | ✅ Одно место для всех |
| Rate limiting | ❌ | ✅ |
| SSL termination | ❌ | ✅ |
| Access logs | Базовые | ✅ Детальные, кастомизируемые |
| Производительность | ~10k req/s | ~50k+ req/s для статики |

---

## Gzip — сжатие ответов

### Что это?
Gzip уменьшает размер HTTP-ответов на **60-80%** для текстовых данных (HTML, CSS, JS, JSON).

### Как работает в нашем nginx.conf?
```nginx
gzip on;              # Включить сжатие
gzip_vary on;         # Добавить Vary: Accept-Encoding (для кеширующих proxy)
gzip_proxied any;     # Сжимать даже проксированные ответы
gzip_comp_level 6;    # Уровень сжатия 1-9 (6 = хороший баланс скорость/размер)
gzip_min_length 256;  # Не сжимать файлы <256 байт (overhead > выигрыш)
gzip_types ...;       # Какие MIME-типы сжимать
```

### Как проверить?
```powershell
$r = Invoke-WebRequest http://localhost:8080/ -Headers @{"Accept-Encoding"="gzip"}
$r.Headers["Content-Encoding"]  # → "gzip"
```

---

## Cache-Control для статики (/_next/static)

### Почему immutable?
Next.js генерирует файлы с **content-hash** в имени:
```
/_next/static/chunks/main-a1b2c3.js
```
Если код изменится → hash изменится → другое имя файла → другой URL.

Это значит **старый URL НИКОГДА не изменится**. Поэтому безопасно кешировать на год:
```nginx
add_header Cache-Control "public, max-age=31536000, immutable";
```

- `public` — кешировать можно везде (браузер, CDN)
- `max-age=31536000` — 365 дней
- `immutable` — не делать revalidation запросов (экономит roundtrip)

---

## Security Headers

```nginx
# Запрещает браузеру "угадывать" MIME-тип файла.
# Без этого: загруженный .txt может быть интерпретирован как .html → XSS атака.
add_header X-Content-Type-Options "nosniff" always;

# Запрещает отображение страницы во frame/iframe другого сайта.
# Защита от clickjacking: злоумышленник не сможет "обернуть" ваш сайт.
add_header X-Frame-Options "SAMEORIGIN" always;

# Контролирует Referer header при переходе на другой сайт.
# "strict-origin-when-cross-origin" = отправлять полный URL только same-origin,
# для cross-origin — только origin (без path/query).
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**`always`** — добавлять header ДАЖЕ для ошибочных ответов (4xx, 5xx).

---

## proxy_buffering off — зачем?

```nginx
proxy_buffering off;
```

### Проблема с включённым буферированием:
1. Next.js начинает отправлять SSR HTML **потоком** (streaming)
2. NGINX буферизует ВЕСЬ ответ (ждёт завершения)
3. Только потом отправляет клиенту
4. Пользователь видит **белый экран** пока весь HTML не сгенерируется

### С выключенным буферированием:
1. Next.js отправляет первые байты HTML
2. NGINX **сразу** пересылает их клиенту
3. Пользователь видит шапку/скелетон **мгновенно**

Это особенно важно для **React Server Components (RSC)** streaming.

---

## Upstream keepalive

```nginx
upstream nextapp {
    server next-app:3000;
    keepalive 32;
}
```

### Зачем?
Без `keepalive` NGINX создаёт **новое TCP-соединение** на каждый запрос к Next.js:
```
nginx → [TCP handshake] → next-app → response → [close]
nginx → [TCP handshake] → next-app → response → [close]
```

С `keepalive 32` — NGINX переиспользует **до 32 открытых соединений**:
```
nginx → [reuse] → next-app → response → [keep open]
nginx → [reuse] → next-app → response → [keep open]
```

Экономит ~1-2ms на каждый запрос (TCP handshake).

---

## Типовые ошибки

### 502 Bad Gateway
**Причина:** NGINX не может подключиться к upstream (next-app:3000).
- Next.js контейнер не запустился
- Next.js упал (OOM, ошибка в коде)
- Неправильное имя сервиса в upstream (проверить docker compose)

**Диагностика:**
```powershell
docker compose ps        # Статус контейнеров
docker compose logs next-app  # Логи Next.js
```

### 504 Gateway Timeout
**Причина:** Next.js отвечает слишком долго (>60 сек по умолчанию).
- Тяжёлый запрос к store (маловероятно с JSON)
- Deadlock в mutex (баг)
- Node.js event loop заблокирован

**Решение:** Добавить в nginx.conf:
```nginx
proxy_read_timeout 120s;
```

### 413 Request Entity Too Large
**Причина:** Тело запроса > 1MB (дефолтный лимит nginx).
**Решение:**
```nginx
client_max_body_size 10m;  # Увеличить до 10MB
```
