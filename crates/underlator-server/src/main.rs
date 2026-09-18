//! Точка входа docker/web-host (`underlator-server`).

use tracing::info;
use underlator_server::{BIND_ADDR, router};

#[tokio::main]
async fn main() {
    info!(bind = BIND_ADDR, "каркас underlator-server");
    let listener = tokio::net::TcpListener::bind(BIND_ADDR)
        .await
        .expect("не удалось занять адрес каркаса");
    axum::serve(listener, router())
        .await
        .expect("сервер каркаса завершился с ошибкой");
}
