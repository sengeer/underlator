//! Use-cases поверхности `catalog`: get / search / getModelInfo.

use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use crate::domain::catalog::dto::{
    CatalogFilters, CatalogModelType, CatalogSortBy, CompatibilityStatus, GetCatalogRequest,
    GetModelInfoRequest, GetModelInfoResult, ModelCatalog, OllamaModelInfo, SortOrder,
};
use crate::domain::catalog::static_library_models;
use crate::domain::error::CoreError;
use crate::domain::iso8601::{millis_to_iso8601, unix_millis_now};
use crate::domain::model::dto::OllamaModel;
use crate::ports::CatalogLibrary;
use crate::ports::LlmProvider;

const CACHE_TTL: Duration = Duration::from_secs(60 * 60);

/// Исполняемые use-cases каталога: локальный список + библиотека + кэш.
pub struct CatalogService {
    provider: Arc<dyn LlmProvider>,
    library: Arc<dyn CatalogLibrary>,
    cache: Mutex<Option<(ModelCatalog, Instant)>>,
}

impl CatalogService {
    /// Собирает сервис из провайдера и источника библиотеки.
    pub fn new(provider: Arc<dyn LlmProvider>, library: Arc<dyn CatalogLibrary>) -> Self {
        Self {
            provider,
            library,
            cache: Mutex::new(None),
        }
    }

    /// Снимок каталога: merge локальных и библиотечных карточек, дедуп по `name`.
    pub async fn get(&self, request: GetCatalogRequest) -> Result<ModelCatalog, CoreError> {
        let force = request.force_refresh.unwrap_or(false);
        if !force && let Some(cached) = self.cached() {
            return Ok(cached);
        }
        let local = match self.provider.list_models().await {
            Ok(listed) => listed
                .models
                .into_iter()
                .enumerate()
                .map(local_card)
                .collect(),
            Err(_) => Vec::new(),
        };
        let library = match self.library.fetch_models().await {
            Ok(cards) => cards,
            Err(_) => static_library_models(),
        };
        let catalog = merge_catalog(local, library);
        self.store_cache(catalog.clone());
        Ok(catalog)
    }

    /// Фильтрация снимка каталога в памяти.
    pub async fn search(&self, filters: CatalogFilters) -> Result<ModelCatalog, CoreError> {
        let snapshot = self
            .get(GetCatalogRequest {
                force_refresh: None,
            })
            .await?;
        Ok(apply_filters(snapshot, &filters))
    }

    /// Карточка по точному `name`, иначе `contains`; нет — `null`.
    pub async fn get_model_info(
        &self,
        request: GetModelInfoRequest,
    ) -> Result<GetModelInfoResult, CoreError> {
        let snapshot = self
            .get(GetCatalogRequest {
                force_refresh: None,
            })
            .await?;
        let exact = snapshot
            .ollama
            .iter()
            .find(|card| card.name == request.model_name)
            .cloned();
        if exact.is_some() {
            return Ok(exact);
        }
        Ok(snapshot
            .ollama
            .into_iter()
            .find(|card| card.name.contains(&request.model_name)))
    }

    fn cached(&self) -> Option<ModelCatalog> {
        let guard = match self.cache.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        match guard.as_ref() {
            Some((catalog, at)) if at.elapsed() < CACHE_TTL => Some(catalog.clone()),
            _ => None,
        }
    }

    fn store_cache(&self, catalog: ModelCatalog) {
        let mut guard = match self.cache.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        *guard = Some((catalog, Instant::now()));
    }
}

fn local_card((index, model): (usize, OllamaModel)) -> OllamaModelInfo {
    OllamaModelInfo {
        id: format!("local-{}-{index}", model.name),
        display_name: model.name.clone(),
        description: Some(format!("Локально установленная модель {}", model.name)),
        version: Some("latest".to_owned()),
        created_at: model.modified_at.clone(),
        modified_at: model.modified_at.clone(),
        model_type: CatalogModelType::Ollama,
        format: model
            .details
            .as_ref()
            .map(|d| d.format.clone())
            .unwrap_or_else(|| "gguf".to_owned()),
        parameter_size: model
            .details
            .as_ref()
            .map(|d| d.parameter_size.clone())
            .unwrap_or_else(|| "Unknown".to_owned()),
        quantization_level: model
            .details
            .as_ref()
            .map(|d| d.quantization_level.clone())
            .unwrap_or_else(|| "Unknown".to_owned()),
        digest: model.digest,
        tags: Some(vec!["local".to_owned(), "installed".to_owned()]),
        compatibility_status: Some(CompatibilityStatus::Unknown),
        compatibility_messages: None,
        name: model.name,
        size: model.size,
    }
}

fn merge_catalog(local: Vec<OllamaModelInfo>, library: Vec<OllamaModelInfo>) -> ModelCatalog {
    let local_names: HashSet<String> = local.iter().map(|c| c.name.clone()).collect();
    let mut ollama = local;
    ollama.extend(
        library
            .into_iter()
            .filter(|card| !local_names.contains(&card.name)),
    );
    let total_count = ollama.len() as u64;
    ModelCatalog {
        ollama,
        total_count,
        last_updated: millis_to_iso8601(unix_millis_now()),
    }
}

fn apply_filters(mut catalog: ModelCatalog, filters: &CatalogFilters) -> ModelCatalog {
    catalog.ollama.retain(|card| matches_filters(card, filters));
    if let Some(sort_by) = filters.sort_by {
        let asc = matches!(filters.sort_order, Some(SortOrder::Asc));
        catalog.ollama.sort_by(|a, b| {
            let ord = match sort_by {
                CatalogSortBy::Name => a.name.cmp(&b.name),
                CatalogSortBy::Size => a.size.cmp(&b.size),
                CatalogSortBy::LastUpdated => a.modified_at.cmp(&b.modified_at),
                CatalogSortBy::CreatedAt => a.created_at.cmp(&b.created_at),
                CatalogSortBy::Downloads | CatalogSortBy::Rating | CatalogSortBy::Popularity => {
                    std::cmp::Ordering::Equal
                }
            };
            if asc { ord } else { ord.reverse() }
        });
    }
    catalog.total_count = catalog.ollama.len() as u64;
    let offset = filters.offset.unwrap_or(0) as usize;
    if let Some(limit) = filters.limit {
        let start = offset.min(catalog.ollama.len());
        let end = start
            .saturating_add(limit as usize)
            .min(catalog.ollama.len());
        catalog.ollama = catalog.ollama.drain(start..end).collect();
    } else if offset > 0 {
        let start = offset.min(catalog.ollama.len());
        catalog.ollama = catalog.ollama.drain(start..).collect();
    }
    catalog
}

fn matches_filters(card: &OllamaModelInfo, filters: &CatalogFilters) -> bool {
    if let Some(search) = &filters.search {
        let term = search.to_ascii_lowercase();
        let name_ok = card.name.to_ascii_lowercase().contains(&term);
        let display_ok = card.display_name.to_ascii_lowercase().contains(&term);
        let tags_ok = card.tags.as_ref().is_some_and(|tags| {
            tags.iter()
                .any(|tag| tag.to_ascii_lowercase().contains(&term))
        });
        let description_ok = term.len() >= 3
            && card.description.as_ref().is_some_and(|d| {
                let lower = d.to_ascii_lowercase();
                lower.contains(&term) && !lower.contains("из ollama")
            });
        if !(name_ok || display_ok || tags_ok || description_ok) {
            return false;
        }
    }
    if let Some(min) = filters.min_size
        && card.size < min
    {
        return false;
    }
    if let Some(max) = filters.max_size
        && card.size > max
    {
        return false;
    }
    if let Some(tags) = &filters.tags
        && !tags.is_empty()
    {
        let Some(card_tags) = &card.tags else {
            return false;
        };
        if !tags.iter().any(|t| card_tags.iter().any(|c| c == t)) {
            return false;
        }
    }
    if let Some(CatalogModelType::Ollama) = filters.model_type
        && card.model_type != CatalogModelType::Ollama
    {
        return false;
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    use async_trait::async_trait;

    use crate::domain::events::{GenerateProgress, InstallProgress};
    use crate::domain::model::dto::{
        GenerateRequest, InstallRequest, ListModelsResponse, RemoveRequest, UnarySuccess,
    };
    use crate::ports::{LlmProvider, ProviderStream};

    #[derive(Clone)]
    struct MockProvider {
        models: Vec<OllamaModel>,
        fail_list: bool,
    }

    #[async_trait]
    impl LlmProvider for MockProvider {
        fn provider_id(&self) -> &str {
            "ollama"
        }

        async fn generate_stream(
            &self,
            _request: &GenerateRequest,
        ) -> Result<ProviderStream<GenerateProgress>, CoreError> {
            Err(CoreError::ProviderUnsupported {
                id: "ollama".to_owned(),
                operation: "generate_stream".to_owned(),
            })
        }

        async fn stop(&self) -> Result<(), CoreError> {
            Ok(())
        }

        async fn list_models(&self) -> Result<ListModelsResponse, CoreError> {
            if self.fail_list {
                return Err(CoreError::HttpNetwork("down".to_owned()));
            }
            Ok(ListModelsResponse {
                models: self.models.clone(),
            })
        }

        async fn install_model(
            &self,
            _request: &InstallRequest,
        ) -> Result<ProviderStream<InstallProgress>, CoreError> {
            Err(CoreError::ProviderUnsupported {
                id: "ollama".to_owned(),
                operation: "install_model".to_owned(),
            })
        }

        async fn remove_model(&self, _request: &RemoveRequest) -> Result<UnarySuccess, CoreError> {
            Err(CoreError::ProviderUnsupported {
                id: "ollama".to_owned(),
                operation: "remove_model".to_owned(),
            })
        }
    }

    struct MockLibrary {
        cards: Vec<OllamaModelInfo>,
        fail: bool,
        fetches: Arc<AtomicUsize>,
    }

    #[async_trait]
    impl CatalogLibrary for MockLibrary {
        async fn fetch_models(&self) -> Result<Vec<OllamaModelInfo>, CoreError> {
            self.fetches.fetch_add(1, Ordering::SeqCst);
            if self.fail {
                return Err(CoreError::HttpNetwork("library down".to_owned()));
            }
            Ok(self.cards.clone())
        }
    }

    fn card(name: &str, size: u64) -> OllamaModelInfo {
        OllamaModelInfo {
            id: name.to_owned(),
            name: name.to_owned(),
            display_name: name.to_owned(),
            description: None,
            version: None,
            size,
            created_at: "2026-01-01T00:00:00.000Z".to_owned(),
            modified_at: "2026-01-02T00:00:00.000Z".to_owned(),
            model_type: CatalogModelType::Ollama,
            format: "gguf".to_owned(),
            parameter_size: "7B".to_owned(),
            quantization_level: "Q4_0".to_owned(),
            digest: None,
            tags: Some(vec!["library".to_owned()]),
            compatibility_status: None,
            compatibility_messages: None,
        }
    }

    fn local_llama() -> OllamaModel {
        OllamaModel {
            name: "llama".to_owned(),
            size: 10,
            modified_at: "2026-01-01T00:00:00Z".to_owned(),
            digest: None,
            details: None,
        }
    }

    #[tokio::test]
    async fn get_merges_local_over_library() {
        let fetches = Arc::new(AtomicUsize::new(0));
        let svc = CatalogService::new(
            Arc::new(MockProvider {
                models: vec![local_llama()],
                fail_list: false,
            }),
            Arc::new(MockLibrary {
                cards: vec![card("llama", 1), card("qwen3", 2)],
                fail: false,
                fetches: fetches.clone(),
            }),
        );
        let catalog = svc
            .get(GetCatalogRequest {
                force_refresh: None,
            })
            .await
            .expect("get");
        let names: Vec<_> = catalog.ollama.iter().map(|c| c.name.as_str()).collect();
        assert_eq!(names, ["llama", "qwen3"]);
        assert_eq!(catalog.total_count, 2);
        assert!(!catalog.last_updated.is_empty());
        let llama = catalog.ollama.iter().find(|c| c.name == "llama").unwrap();
        assert!(
            llama
                .tags
                .as_ref()
                .is_some_and(|t| t.iter().any(|x| x == "local")),
            "локальная карточка должна вытеснить библиотечную"
        );
    }

    #[tokio::test]
    async fn library_error_falls_back_to_static() {
        let svc = CatalogService::new(
            Arc::new(MockProvider {
                models: vec![local_llama()],
                fail_list: false,
            }),
            Arc::new(MockLibrary {
                cards: vec![],
                fail: true,
                fetches: Arc::new(AtomicUsize::new(0)),
            }),
        );
        let catalog = svc
            .get(GetCatalogRequest {
                force_refresh: Some(true),
            })
            .await
            .expect("get");
        let names: Vec<_> = catalog.ollama.iter().map(|c| c.name.as_str()).collect();
        assert!(names.contains(&"llama"));
        assert!(names.contains(&"qwen3"));
    }

    #[tokio::test]
    async fn local_list_failure_keeps_library() {
        let svc = CatalogService::new(
            Arc::new(MockProvider {
                models: vec![],
                fail_list: true,
            }),
            Arc::new(MockLibrary {
                cards: vec![card("qwen3", 2)],
                fail: false,
                fetches: Arc::new(AtomicUsize::new(0)),
            }),
        );
        let catalog = svc
            .get(GetCatalogRequest {
                force_refresh: Some(true),
            })
            .await
            .expect("get");
        assert_eq!(catalog.ollama.len(), 1);
        assert_eq!(catalog.ollama[0].name, "qwen3");
    }

    #[tokio::test]
    async fn cache_skips_library_until_force_refresh() {
        let fetches = Arc::new(AtomicUsize::new(0));
        let svc = CatalogService::new(
            Arc::new(MockProvider {
                models: vec![local_llama()],
                fail_list: false,
            }),
            Arc::new(MockLibrary {
                cards: vec![card("qwen3", 2)],
                fail: false,
                fetches: fetches.clone(),
            }),
        );
        svc.get(GetCatalogRequest {
            force_refresh: None,
        })
        .await
        .expect("first");
        svc.get(GetCatalogRequest {
            force_refresh: None,
        })
        .await
        .expect("cached");
        assert_eq!(fetches.load(Ordering::SeqCst), 1);
        svc.get(GetCatalogRequest {
            force_refresh: Some(true),
        })
        .await
        .expect("refresh");
        assert_eq!(fetches.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn search_filters_and_total_count() {
        let svc = CatalogService::new(
            Arc::new(MockProvider {
                models: vec![local_llama()],
                fail_list: false,
            }),
            Arc::new(MockLibrary {
                cards: vec![card("qwen3", 200), card("other", 5)],
                fail: false,
                fetches: Arc::new(AtomicUsize::new(0)),
            }),
        );
        let found = svc
            .search(CatalogFilters {
                search: Some("qwen".to_owned()),
                min_size: Some(10),
                max_size: Some(1000),
                tags: Some(vec!["library".to_owned()]),
                sort_by: Some(CatalogSortBy::Name),
                sort_order: Some(SortOrder::Asc),
                limit: Some(10),
                offset: Some(0),
                ..CatalogFilters::default()
            })
            .await
            .expect("search");
        assert_eq!(found.total_count, 1);
        assert_eq!(found.ollama[0].name, "qwen3");
    }

    #[tokio::test]
    async fn get_model_info_exact_contains_or_null() {
        let svc = CatalogService::new(
            Arc::new(MockProvider {
                models: vec![local_llama()],
                fail_list: false,
            }),
            Arc::new(MockLibrary {
                cards: vec![card("qwen3:latest", 2)],
                fail: false,
                fetches: Arc::new(AtomicUsize::new(0)),
            }),
        );
        let exact = svc
            .get_model_info(GetModelInfoRequest {
                model_name: "llama".to_owned(),
            })
            .await
            .expect("exact");
        assert_eq!(exact.unwrap().name, "llama");
        let contains = svc
            .get_model_info(GetModelInfoRequest {
                model_name: "qwen3".to_owned(),
            })
            .await
            .expect("contains");
        assert_eq!(contains.unwrap().name, "qwen3:latest");
        let missing = svc
            .get_model_info(GetModelInfoRequest {
                model_name: "nope".to_owned(),
            })
            .await
            .expect("null");
        assert!(missing.is_none());
    }
}
