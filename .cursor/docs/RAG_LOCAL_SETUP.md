# RAG система - Локальная настройка

## Статус

✅ RAG система полностью автономна и работает без внешних зависимостей (Docker, Qdrant и т.д.)

## Что сделано

1. **SQLite-based векторное хранилище** - полностью локальная база данных
2. **Удалены зависимости от Docker и Qdrant** - нет внешних сервисов
3. **Пересобраны нативные модули** - better-sqlite3 скомпилирован для Electron
4. **Исправлен динамический импорт** - DocumentProcessorService загружается корректно
5. **Полная реализация API** - все RAG операции работают

## Запуск приложения

```bash
cd electron-app
npm run start
```

## Расположение данных

Векторное хранилище находится в:
- **macOS**: `~/Library/Application Support/Underlator/rag-vectors/`
- **Windows**: `%APPDATA%/Underlator/rag-vectors/`
- **Linux**: `~/.config/Underlator/rag-vectors/`

## Архитектура

### Компоненты

1. **VectorStoreService (SQLite)** - локальное векторное хранилище
2. **DocumentProcessorService** - обработка PDF документов
3. **EmbeddingService** - генерация эмбеддингов через Ollama
4. **RAGHandlers** - IPC API для взаимодействия с React

### Поток данных

```
React UI → IPC → RAGHandlers → DocumentProcessorService
                                            ↓
                                    EmbeddingService
                                            ↓
                                    VectorStoreService (SQLite)
```

## Известные ограничения

⚠️ Для работы RAG системы требуется установленная модель эмбеддингов в Ollama (например, `nomic-embed-text`)

## Тестирование

Откройте приложение и перейдите в раздел "Tests" для проверки RAG функциональности:
- Загрузить и обработать PDF
- Список коллекций
- Статистика коллекции
- Поиск документов
- Генерация с RAG контекстом
- Удалить коллекцию
