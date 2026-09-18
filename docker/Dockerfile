# Заготовка образа web-режима Underlator (атом 1.1).
# Полная multi-stage сборка UI (react-app) + underlator-server — в последующих атомах.
# Этот файл фиксирует место поставки Docker и не обязан собирать рабочий UI.

FROM rust:1-bookworm AS builder
WORKDIR /src
# TODO: cargo build -p underlator-server --release
# TODO: скопировать static-сборку react-app

FROM debian:bookworm-slim
WORKDIR /app
# Volume данных чатов/метаданных: /data (см. docker-compose.yml).
# Реальный бинарь server появится, когда host и UI будут готовы.
CMD ["echo", "underlator-server image stub: not built yet"]
