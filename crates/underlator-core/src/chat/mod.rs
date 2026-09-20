//! Домен `chat`: контракт и use-cases create / get / update / delete / list / addMessage.
//!
//! Атом 2.3: исполняемые сервисы через port [`store::ChatStore`].
//! Гексагональная раскладка атома 2.4 ещё не выполнена.

pub mod dto;
pub mod fs_store;
pub mod store;
pub mod use_cases;

pub use fs_store::FilesystemChatStore;
pub use store::{ChatStore, MemoryChatStore, StorageRoot};
pub use use_cases::ChatService;
