/**
 * @module TextTranslator
 * Компонент для перевода текста через LLM модели.
 *
 * Предоставляет полнофункциональный интерфейс для перевода текста между различными языками.
 * Интегрируется с системой управления языками, LLM моделями и Redux store для управления состоянием.
 * Поддерживает выбор языков перевода, ввод текста, генерацию перевода и копирование результата.
 *
 * Компонент использует модальные окна для выбора языков и автоматически синхронизирует
 * состояние с Redux store.
 *
 * @example
 * // Использование в Main компоненте
 * <TextTranslator isOpened={isOpenTextTranslationSection} />
 *
 * @example
 * // Условное отображение компонента
 * {isOpenTextTranslationSection && (
 *   <TextTranslator isOpened={true} />
 * )}
 */

import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BackspaceIcon from '../../../shared/assets/icons/backspace-icon';
import CheckIcon from '../../../shared/assets/icons/check-icon';
import CopyIcon from '../../../shared/assets/icons/copy-icon';
import GlobeIcon from '../../../shared/assets/icons/globe-icon';
import GlobeUkIcon from '../../../shared/assets/icons/globe-uk-icon';
import StopCircleIcon from '../../../shared/assets/icons/stop-circle-icon';
import SyncIcon from '../../../shared/assets/icons/sync-icon';
import TranslateIcon from '../../../shared/assets/icons/translate-icon';
import useCopying from '../../../shared/lib/hooks/use-copying';
import useModel from '../../../shared/lib/hooks/use-model';
import useTranslationLanguages from '../../../shared/lib/hooks/use-translation-languages';
import useWindowSize from '../../../shared/lib/hooks/use-window-size';
import stringifyGenerateResponse from '../../../shared/lib/utils/stringify-generate-response';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../../shared/models/element-state-slice';
import AnimatingWrapper from '../../../shared/ui/animating-wrapper';
import IconButton from '../../../shared/ui/icon-button';
import Popup from '../../../shared/ui/popup';
import SelectorOption from '../../../shared/ui/selector-option/';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button';
import '../styles/text-translator.scss';

/**
 * Основной компонент TextTranslator.
 *
 * Реализует интерфейс для перевода текста между различными языками через LLM модели.
 * Управляет состоянием ввода и вывода текста, выбором языков перевода и процессом генерации.
 * Интегрируется с Redux store для управления состоянием модальных окон и языков.
 *
 * Основные функции:
 * - Выбор исходного и целевого языков через модальные окна.
 * - Ввод текста для перевода с возможностью очистки.
 * - Генерация перевода через LLM модели с поддержкой streaming.
 * - Копирование результата перевода в буфер обмена.
 * - Переключение языков местами.
 * - Адаптивный дизайн для мобильных устройств.
 *
 * Компонент автоматически обновляет выходной текст при получении ответа от модели
 * и синхронизирует состояние с Redux store для управления видимостью модальных окон.
 *
 * @param props - Пропсы компонента.
 * @param props.isOpened - Открыт ли компонент перевода текста.
 * @returns JSX элемент с интерфейсом перевода текста.
 */
function TextTranslator() {
  // Хуки для управления состоянием и функциональностью
  const { isCopied, handleCopy } = useCopying();
  const { status, generatedResponse, generate, stop } = useModel();
  const {
    sourceLanguage,
    targetLanguage,
    translationLanguages,
    getPlaceholderByLanguage,
    handleSourceLanguageSelection,
    handleTargetLanguageSelection,
    switchLanguages,
  } = useTranslationLanguages();

  const { t } = useLingui();
  const dispatch = useDispatch();

  // Локальное состояние для текста ввода и вывода
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');

  // Состояние модальных окон из Redux store
  const isOpenFirstLangSelectionPopupForTranslator = useSelector((state) =>
    isElementOpen(state, 'firstLangSelectionPopupForTranslator')
  );

  const isOpenSecondLangSelectionPopupForTranslator = useSelector((state) =>
    isElementOpen(state, 'secondLangSelectionPopupForTranslator')
  );

  /**
   * Очищает поле ввода текста.
   * Сбрасывает локальное состояние input в пустую строку.
   */
  function handleClear() {
    setInput('');
  }

  /**
   * Запускает процесс перевода текста.
   * Вызывает генерацию через LLM модель с настройками для streaming ответа.
   * Использует режим stringStream для получения текста по частям.
   */
  function handleTranslation() {
    generate(
      input,
      {
        responseMode: 'stringStream',
      },
      {
        think: false,
      }
    ).translate();
  }

  // Получение размеров окна для адаптивного дизайна
  const { width } = useWindowSize();

  const hasSizeS = width <= 768;

  /**
   * Автоматическое обновление выходного текста при получении ответа от модели.
   * Преобразует ответ модели в строковый формат для отображения в UI.
   */
  useEffect(() => {
    setOutput(stringifyGenerateResponse(generatedResponse));
  }, [generatedResponse]);

  return (
    <section className='text-translator'>
      {/* Кнопка выбора исходного языка */}
      <TextAndIconButton
        text={sourceLanguage}
        style={{ margin: '1rem auto 0' }}
        onClick={() =>
          dispatch(openElement('firstLangSelectionPopupForTranslator'))
        }>
        <GlobeUkIcon />
      </TextAndIconButton>

      {/* Поле ввода текста для перевода */}
      <div className='text-translator__textarea-wrapper'>
        <textarea
          className='text-heading-l text-translator__textarea'
          value={input}
          placeholder={getPlaceholderByLanguage(sourceLanguage)}
          rows={1}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setInput(e.target.value)
          }
        />
        {/* Кнопка очистки поля ввода */}
        <IconButton
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
          }}
          onClick={handleClear}
          isDisabled={input === ''}>
          <BackspaceIcon />
        </IconButton>
      </div>

      {/* Кнопка переключения языков местами */}
      <IconButton onClick={switchLanguages}>
        {hasSizeS ? (
          <SyncIcon
            style={{ transform: 'rotate(0.25turn)' }}
            color='var(--main)'
          />
        ) : (
          <SyncIcon
            width={48}
            height={48}
            style={{ transform: 'rotate(0.25turn)' }}
            color='var(--main)'
          />
        )}
      </IconButton>

      {/* Кнопка выбора целевого языка */}
      <TextAndIconButton
        text={targetLanguage}
        style={{ margin: '1rem auto 0' }}
        onClick={() =>
          dispatch(openElement('secondLangSelectionPopupForTranslator'))
        }>
        <GlobeIcon />
      </TextAndIconButton>

      {/* Поле вывода переведенного текста */}
      <div className='text-translator__textarea-wrapper'>
        <textarea
          className='text-heading-l text-translator__textarea'
          value={output}
          placeholder={getPlaceholderByLanguage(targetLanguage)}
          rows={1}
          readOnly
        />
        {/* Кнопка копирования результата */}
        <IconButton
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
          }}
          onClick={() => handleCopy(output)}
          isDisabled={output === '' || isCopied}>
          <AnimatingWrapper isShow={isCopied}>
            <CheckIcon />
          </AnimatingWrapper>
          <AnimatingWrapper isShow={!isCopied}>
            <CopyIcon />
          </AnimatingWrapper>
        </IconButton>
      </div>

      {/* Кнопка перевода или остановки процесса */}
      {status === 'process' ? (
        <TextAndIconButton
          text={t`stop`}
          style={{
            margin: '0 auto 1rem',
          }}
          onClick={stop}>
          <StopCircleIcon />
        </TextAndIconButton>
      ) : (
        <TextAndIconButton
          text={t`translate`}
          style={{
            margin: '0 auto 1rem',
          }}
          onClick={handleTranslation}>
          <TranslateIcon />
        </TextAndIconButton>
      )}

      {/* Модальное окно выбора исходного языка */}
      <Popup
        isOpened={isOpenFirstLangSelectionPopupForTranslator}
        setOpened={() =>
          dispatch(closeElement('firstLangSelectionPopupForTranslator'))
        }
        styleWrapper={{ minWidth: '30.4352%' }}>
        {translationLanguages.map(({ language, code }) => (
          <SelectorOption
            type='simple'
            key={code}
            onClick={() => {
              handleSourceLanguageSelection(language);
              dispatch(closeElement('firstLangSelectionPopupForTranslator'));
            }}>
            <TextButton
              text={language}
              isDisabled
              isActiveStyle={sourceLanguage === language}
            />
          </SelectorOption>
        ))}
      </Popup>

      {/* Модальное окно выбора целевого языка */}
      <Popup
        isOpened={isOpenSecondLangSelectionPopupForTranslator}
        setOpened={() =>
          dispatch(closeElement('secondLangSelectionPopupForTranslator'))
        }
        styleWrapper={{ minWidth: '30.4352%' }}>
        {translationLanguages.map(({ language, code }) => (
          <SelectorOption
            type='simple'
            key={code}
            onClick={() => {
              handleTargetLanguageSelection(language);
              dispatch(closeElement('secondLangSelectionPopupForTranslator'));
            }}>
            <TextButton
              text={language}
              isDisabled
              isActiveStyle={targetLanguage === language}
            />
          </SelectorOption>
        ))}
      </Popup>
    </section>
  );
}

export default TextTranslator;
