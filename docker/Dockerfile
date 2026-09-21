# Multi-stage образ web-режима Underlator: static `react-app` + `underlator-server`.
# Контекст сборки — корень репозитория (см. docker-compose.yml).

FROM node:22-bookworm AS ui
WORKDIR /src/react-app
COPY react-app/package.json react-app/package-lock.json ./
RUN npm ci --ignore-scripts
COPY react-app ./
RUN npm run lingui:compile && npm run build

FROM rust:1-bookworm AS rust
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
RUN cargo build -p underlator-server --release

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=rust /src/target/release/underlator-server /app/underlator-server
COPY --from=ui /src/react-app/dist /app/static
ENV UNDERLATOR_STATIC_DIR=/app/static
ENV UNDERLATOR_BIND=0.0.0.0:8080
ENV UNDERLATOR_DATA_DIR=/data
EXPOSE 8080
VOLUME /data
CMD ["/app/underlator-server"]
