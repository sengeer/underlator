/**
 * @module MarkdownRendererTypes
 * Типы для компонента MarkdownRenderer.
 */

/**
 * Пропсы для компонента MarkdownRenderer.
 */
export interface MarkdownRendererProps {
  /** Исходный markdown-контент, включающий возможные теги <think> */
  content: string | null;
  /** Дополнительный CSS-класс контейнера */
  className?: string;
  /** Инлайновые стили, применяемые к корневому контейнеру */
  style?: React.CSSProperties;
  /** Флаг отображения панели с внутренними размышлениями модели */
  showThinking?: boolean;
  /** Подпись в правой части заголовка (например, имя модели) */
  text?: string;
  /** Заглушка, отображаемая до появления основного контента */
  placeholder?: string;
}
