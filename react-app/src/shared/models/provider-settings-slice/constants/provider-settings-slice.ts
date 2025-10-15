/**
 * @module ProviderSettingsSliceConstants
 * Константы для ProviderSettingsSlice.
 * Определяет константы для настроек провайдеров LLM.
 */

/**
 * Маппинг секций приложения к соответствующим режимам typeUse.
 * Определяет, какой режим использования модели должен быть активен для каждой секции.
 */
export const SECTION_TYPEUSE_MAPPING: Record<string, TypeUse> = {
  textTranslationSection: 'translation',
  pdfTranslationSection: 'contextualTranslation',
  chatSection: 'chat',
};
