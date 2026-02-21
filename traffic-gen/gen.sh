#!/bin/sh
# ============================================================
# Traffic Generator — создаёт "живые" запросы для nginx логов
# ============================================================
#
# Запускается ТОЛЬКО с профилем traffic:
#   docker compose --profile traffic up -d
#
# Генерирует разнообразные запросы к разным эндпоинтам,
# чтобы в docker compose logs nginx были реальные access-логи.
# Безопасен: только GET-запросы (не создаёт/удаляет данные).

set -e

echo "=== Traffic Generator ==="
echo "Ожидаем готовности nginx..."

# Ждём пока nginx ответит на healthz
MAX_WAIT=60
WAITED=0
until wget -q --spider http://nginx:80/healthz 2>/dev/null; do
  sleep 2
  WAITED=$((WAITED + 2))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "ОШИБКА: nginx не ответил за ${MAX_WAIT}с"
    exit 1
  fi
  echo "  Ожидание... (${WAITED}с)"
done

echo "nginx готов! Начинаем генерацию трафика."
echo "Ctrl+C или docker compose --profile traffic stop — для остановки."
echo ""

# Бесконечный цикл запросов
COUNTER=0
while true; do
  COUNTER=$((COUNTER + 1))

  # Выбираем случайный эндпоинт
  RAND=$((COUNTER % 7))
  case $RAND in
    0) URL="http://nginx:80/" ;;
    1) URL="http://nginx:80/api/tickets" ;;
    2) URL="http://nginx:80/api/tickets?status=open" ;;
    3) URL="http://nginx:80/api/tickets?status=in_progress" ;;
    4) URL="http://nginx:80/api/tickets?search=login" ;;
    5) URL="http://nginx:80/healthz" ;;
    6) URL="http://nginx:80/does-not-exist-404" ;;
  esac

  # Выполняем запрос (тихо, без вывода тела)
  HTTP_CODE=$(wget --spider -S "$URL" 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
  echo "[#${COUNTER}] ${URL} → ${HTTP_CODE:-timeout}"

  # Случайная пауза 1-4 секунды
  SLEEP_TIME=$((COUNTER % 4 + 1))
  sleep $SLEEP_TIME
done
