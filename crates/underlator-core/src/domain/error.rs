//! Доменные ошибки ядра. Host-слой мапит их в свой транспорт.

use thiserror::Error;

/// Ошибка `underlator-core`.
#[derive(Debug, Error)]
pub enum CoreError {
    /// Внутренняя ошибка инфраструктуры каркаса (не use-case MVP).
    #[error("{0}")]
    Internal(String),
    /// Истекло время ожидания HTTP-операции.
    #[error("истекло время ожидания HTTP-запроса")]
    HttpTimeout,
    /// Сбой сети при исходящем HTTP (соединение, DNS, сброс).
    #[error("сетевой сбой HTTP: {0}")]
    HttpNetwork(String),
    /// Сервер вернул неуспешный HTTP-статус.
    #[error("HTTP-статус {status}: {snippet}")]
    HttpStatus {
        /// Код HTTP-статуса.
        status: u16,
        /// Усечённый фрагмент тела ответа (не полный промпт).
        snippet: String,
    },
    /// Исчерпан лимит повторных попыток unary-запроса.
    #[error("исчерпаны повторы HTTP-запроса после {attempts} попыток: {last}")]
    HttpRetryExhausted {
        /// Число выполненных попыток.
        attempts: u32,
        /// Последняя классифицированная ошибка.
        last: Box<CoreError>,
    },
    /// Обрыв потокового ответа после начала доставки кадров.
    #[error("обрыв HTTP-потока: {0}")]
    HttpStream(String),
    /// Некорректная конфигурация или сборка HTTP-запроса.
    #[error("ошибка конфигурации HTTP: {0}")]
    HttpConfig(String),
    /// Неизвестный идентификатор LLM-провайдера.
    #[error("неизвестный провайдер: {id}")]
    ProviderUnknown {
        /// Идентификатор из конфига.
        id: String,
    },
    /// Операция не поддерживается выбранным провайдером (облачный stub).
    #[error("операция {operation} не поддерживается провайдером {id}")]
    ProviderUnsupported {
        /// Идентификатор провайдера.
        id: String,
        /// Имя операции (`generate_stream`, `list_models`, …).
        operation: String,
    },
    /// Облачный провайдер запрошен без явного opt-in.
    #[error("облачный провайдер {id} отключён: требуется явный opt-in")]
    ProviderCloudDisabled {
        /// Идентификатор облачного провайдера.
        id: String,
    },
    /// Потоковая генерация прервана вызовом `stop`.
    #[error("генерация отменена")]
    ProviderCancelled,
    /// Ошибка валидации входных данных use-case.
    #[error("ошибка валидации: {message}")]
    Validation {
        /// Человекочитаемое описание нарушения.
        message: String,
    },
    /// Сущность не найдена по идентификатору.
    #[error("{entity} не найден: {id}")]
    NotFound {
        /// Тип сущности (`chat`, `model`, …).
        entity: String,
        /// Запрошенный идентификатор.
        id: String,
    },
    /// Удаление чата вызвано без `confirmed = true`.
    #[error("удаление не подтверждено")]
    DeleteNotConfirmed,
    /// Сбой хранилища чатов (чтение, запись, удаление).
    #[error("ошибка хранилища: {message}")]
    Storage {
        /// Описание сбоя файловой системы или адаптера store.
        message: String,
    },
}
