//! Точка входа docker/web-host (`underlator-server`).

use tracing::info;
use tracing_subscriber::EnvFilter;
use underlator_server::config::ServerConfig;
use underlator_server::router;
use underlator_server::state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let config = ServerConfig::from_env();
    if let Err(err) = config.ensure_bind_policy() {
        tracing::error!("{err}");
        std::process::exit(1);
    }
    let bind = config.bind.clone();
    let state = match AppState::from_config(&config) {
        Ok(state) => state,
        Err(err) => {
            tracing::error!("не удалось собрать AppState: {err}");
            std::process::exit(1);
        }
    };
    info!(%bind, "underlator-server слушает");
    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .unwrap_or_else(|err| {
            tracing::error!("не удалось занять `{bind}`: {err}");
            std::process::exit(1);
        });
    axum::serve(listener, router(state))
        .await
        .unwrap_or_else(|err| {
            tracing::error!("сервер завершился с ошибкой: {err}");
            std::process::exit(1);
        });
}
