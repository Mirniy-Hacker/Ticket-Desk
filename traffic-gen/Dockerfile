# Минимальный образ для генерации HTTP-трафика.
# Используем Alpine (5MB) + wget (уже встроен в Alpine).
FROM alpine:3.20

# Копируем скрипт генератора
COPY gen.sh /gen.sh
RUN chmod +x /gen.sh

# Запуск
CMD ["/bin/sh", "/gen.sh"]
