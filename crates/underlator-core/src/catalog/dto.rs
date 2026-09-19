//! DTO поверхности `catalog`, зеркало типов `catalog.ts` / `models.ts`.

use serde::{Deserialize, Serialize};

/// Запрос `catalog.get`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GetCatalogRequest {
    /// Принудительно обновить снимок каталога.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub force_refresh: Option<bool>,
}

/// Тип модели в фильтрах каталога.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CatalogModelType {
    /// Локальная / Ollama-модель.
    Ollama,
}

/// Статус модели в локальной системе.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelStatus {
    /// Модель доступна.
    Available,
    /// Идёт загрузка.
    Downloading,
    /// Идёт установка.
    Installing,
    /// Ошибка.
    Error,
    /// Не найдена.
    NotFound,
    /// Повреждена.
    Corrupted,
}

/// Поле сортировки каталога.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CatalogSortBy {
    /// По имени.
    Name,
    /// По размеру.
    Size,
    /// По числу скачиваний.
    Downloads,
    /// По рейтингу.
    Rating,
    /// По дате обновления.
    LastUpdated,
    /// По популярности.
    Popularity,
    /// По дате создания.
    CreatedAt,
}

/// Порядок сортировки.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    /// По возрастанию.
    Asc,
    /// По убыванию.
    Desc,
}

/// Фильтры `catalog.search` (`CatalogFilters`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CatalogFilters {
    /// Поисковый запрос.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
    /// Тип модели.
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub model_type: Option<CatalogModelType>,
    /// Статус в локальной системе.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_status: Option<ModelStatus>,
    /// Минимальный размер в байтах.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_size: Option<u64>,
    /// Максимальный размер в байтах.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_size: Option<u64>,
    /// Категория.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    /// Теги.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// Языки.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<Vec<String>>,
    /// Архитектура.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub architecture: Option<String>,
    /// Формат.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    /// Лицензия.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    /// Автор.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    /// Минимальный рейтинг.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_rating: Option<f64>,
    /// Минимум скачиваний.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_downloads: Option<u64>,
    /// Только рекомендуемые.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recommended_only: Option<bool>,
    /// Только доступные для установки.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub available_only: Option<bool>,
    /// Поле сортировки.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_by: Option<CatalogSortBy>,
    /// Порядок сортировки.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<SortOrder>,
    /// Лимит страницы.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    /// Смещение страницы.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
}

/// Статус совместимости модели с системой.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompatibilityStatus {
    /// Совместима.
    Ok,
    /// Недостаточно RAM.
    InsufficientRam,
    /// Недостаточно VRAM.
    InsufficientVram,
    /// Совместимость неизвестна.
    Unknown,
}

/// Карточка модели каталога (`OllamaModelInfo`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaModelInfo {
    /// Уникальный идентификатор.
    pub id: String,
    /// Название модели.
    pub name: String,
    /// Отображаемое имя.
    pub display_name: String,
    /// Описание.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Версия.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    /// Размер в байтах.
    pub size: u64,
    /// Дата создания.
    pub created_at: String,
    /// Дата изменения.
    pub modified_at: String,
    /// Дискриминатор типа (`ollama`).
    #[serde(rename = "type")]
    pub model_type: CatalogModelType,
    /// Формат.
    pub format: String,
    /// Размер параметров.
    pub parameter_size: String,
    /// Уровень квантизации.
    pub quantization_level: String,
    /// Дайджест.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub digest: Option<String>,
    /// Теги.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// Статус совместимости.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compatibility_status: Option<CompatibilityStatus>,
    /// Сообщения о совместимости.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compatibility_messages: Option<Vec<String>>,
}

/// Снимок каталога (`ModelCatalog`) — ответ `get` и `search`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCatalog {
    /// Карточки Ollama-моделей.
    pub ollama: Vec<OllamaModelInfo>,
    /// Общее количество моделей.
    pub total_count: u64,
    /// Время последнего обновления.
    pub last_updated: String,
}

/// Запрос `catalog.getModelInfo`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetModelInfoRequest {
    /// Имя модели для поиска карточки.
    pub model_name: String,
}

/// Ответ `catalog.getModelInfo`: карточка или `null`, если не найдена.
pub type GetModelInfoResult = Option<OllamaModelInfo>;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};

    fn roundtrip<T>(value: &T) -> Value
    where
        T: Serialize + serde::de::DeserializeOwned + PartialEq + std::fmt::Debug,
    {
        let json = serde_json::to_value(value).expect("сериализация");
        let back: T = serde_json::from_value(json.clone()).expect("десериализация");
        assert_eq!(value, &back);
        json
    }

    fn sample_card() -> OllamaModelInfo {
        OllamaModelInfo {
            id: "llama".to_owned(),
            name: "llama".to_owned(),
            display_name: "Llama".to_owned(),
            description: None,
            version: None,
            size: 1,
            created_at: "2026-01-01T00:00:00Z".to_owned(),
            modified_at: "2026-01-02T00:00:00Z".to_owned(),
            model_type: CatalogModelType::Ollama,
            format: "gguf".to_owned(),
            parameter_size: "7B".to_owned(),
            quantization_level: "Q4_0".to_owned(),
            digest: None,
            tags: None,
            compatibility_status: None,
            compatibility_messages: None,
        }
    }

    #[test]
    fn catalog_dto_json_keys_roundtrip() {
        let get = GetCatalogRequest {
            force_refresh: Some(true),
        };
        let get_json = roundtrip(&get);
        assert!(
            get_json.get("forceRefresh").is_some(),
            "ожидался ключ forceRefresh"
        );

        let card_json = roundtrip(&sample_card());
        assert!(
            card_json.get("displayName").is_some(),
            "ожидался ключ displayName"
        );
        assert!(
            card_json.get("parameterSize").is_some(),
            "ожидался ключ parameterSize"
        );

        let catalog = ModelCatalog {
            ollama: vec![sample_card()],
            total_count: 1,
            last_updated: "2026-01-03T00:00:00Z".to_owned(),
        };
        let catalog_json = roundtrip(&catalog);
        assert!(
            catalog_json.get("totalCount").is_some(),
            "ожидался ключ totalCount"
        );

        let info_req = GetModelInfoRequest {
            model_name: "llama".to_owned(),
        };
        let info_json = roundtrip(&info_req);
        assert!(
            info_json.get("modelName").is_some(),
            "ожидался ключ modelName"
        );
    }

    #[test]
    fn get_model_info_allows_null() {
        let none: GetModelInfoResult = None;
        let json = serde_json::to_value(none).expect("сериализация");
        assert_eq!(json, json!(null));
        let back: GetModelInfoResult = serde_json::from_value(json).expect("десериализация");
        assert!(back.is_none());
    }

    #[test]
    fn catalog_filters_include_search_fields() {
        let filters = CatalogFilters {
            search: Some("llama".to_owned()),
            model_type: Some(CatalogModelType::Ollama),
            local_status: Some(ModelStatus::Available),
            recommended_only: Some(true),
            available_only: Some(false),
            sort_by: Some(CatalogSortBy::LastUpdated),
            sort_order: Some(SortOrder::Desc),
            limit: Some(10),
            offset: Some(0),
            ..CatalogFilters::default()
        };
        let json = roundtrip(&filters);
        assert_eq!(json["type"], "ollama");
        assert_eq!(json["sortBy"], "lastUpdated");
        assert_eq!(json["localStatus"], "available");
    }
}
