/**
 * @module Tests
 * Компонент для тестирования.
 */

import '../styles/settings.scss';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ForumIcon from '../../../shared/assets/icons/forum-icon';
import NetworkIntelligenceIcon from '../../../shared/assets/icons/network-intelligence-icon';
import useFormAndValidation from '../../../shared/lib/hooks/use-form-and-validation';
import useTranslationLanguages from '../../../shared/lib/hooks/use-translation-languages';
import MODELS from '../../../shared/lib/mocks/jsons/model-list.json';
import {
  openElement,
  closeElement,
  isElementOpen,
} from '../../../shared/models/element-state-slice';
import { addNotification } from '../../../shared/models/notifications-slice';
import { selectProviderSettings } from '../../../shared/models/provider-settings-slice';
import ButtonWrapperWithBackground from '../../../shared/ui/button-wrapper-with-background';
import Popup from '../../../shared/ui/popup';
import PopupWithSearch from '../../../shared/ui/popup-with-search';
import SelectorOption from '../../../shared/ui/selector-option';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button/text-button';
import {
  testCreateChat,
  testListChats,
  testGetChat,
  testUpdateChat,
  testAddMessage,
  testAddAssistantMessage,
  testDeleteChat,
} from '../tests/chat-ipc';
import {
  testListModels,
  testInstallModel,
  testGenerateText,
  testRemoveModel,
  testGetCatalog,
  testGetCatalogForceRefresh,
  testSearchModels,
  testGetModelInfo,
} from '../tests/model-ipc';
import {
  testUploadAndProcessDocument,
  testProcessDocument,
  testQueryDocuments,
  testGetCollectionStats,
  testListCollections,
  testDeleteCollection,
  testProcessingProgress,
  testGenerateWithRagContext,
} from '../tests/rag-ipc';

function Tests() {
  const [searchValue, setSearchValue] = useState('');
  const [translationKey, setTranslationKey] = useState('');
  const [chatId, setChatId] = useState('');

  const dispatch = useDispatch();

  const { provider, settings } = useSelector(selectProviderSettings);

  const { translationLanguages } = useTranslationLanguages();
  const { values, handleChange, setValues } = useFormAndValidation();

  const isOpenTestListModelsPopup = useSelector((state) =>
    isElementOpen(state, 'testListModelsPopup')
  );

  const isOpenTestListLanguagesPopup = useSelector((state) =>
    isElementOpen(state, 'testListLanguagesPopup')
  );

  useEffect(() => {
    setValues({ prompt: 'Сколько будет 2 + 2?' });
  }, [setValues]);

  return (
    <>
      <div className='settings__container'>
        <div className='settings__column'>
          <h2 className='settings__title'>{'Поля ввода для тестов IPC API'}</h2>
          <ButtonWrapperWithBackground>
            <TextAndIconButton
              text='Промпт'
              style={{ marginLeft: '1rem' }}
              isDisabled>
              <NetworkIntelligenceIcon />
            </TextAndIconButton>
            <input
              className='settings__input settings__text'
              placeholder='Сколько будет 2 + 2?'
              type='text'
              id='prompt'
              name='prompt'
              value={values.prompt || ''}
              onChange={handleChange}
            />
          </ButtonWrapperWithBackground>
          <ButtonWrapperWithBackground>
            <TextAndIconButton
              text='Индентификатор чата'
              style={{ marginLeft: '1rem' }}
              isDisabled>
              <ForumIcon />
            </TextAndIconButton>
            <input
              className='settings__input settings__text'
              placeholder='chat_xxxxxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
              type='text'
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
          </ButtonWrapperWithBackground>
          <h2 className='settings__title'>{'Тестирование Model IPC API'}</h2>
          <div className='settings__btns-group'>
            <TextButton
              onClick={() => testListModels()}
              className='settings__button'>
              {'Список установленных моделей'}
            </TextButton>
            <TextButton
              onClick={() => testInstallModel(settings[provider]?.model)}
              className='settings__button'>
              {'Установить ' + settings[provider]?.model}
            </TextButton>
            <TextButton
              onClick={() =>
                testGenerateText(settings[provider]?.model, values.prompt)
              }
              className='settings__button'>
              {`Генерация «${values.prompt}»`}
            </TextButton>
            <TextButton
              onClick={() => testRemoveModel(settings[provider]?.model)}
              className='settings__button'>
              {'Удалить ' + settings[provider]?.model}
            </TextButton>
            <p className='settings__description'>
              {
                'Кнопки тестирования Model IPC API. Проверьте результаты в консоли.'
              }
            </p>
            <h2 className='settings__title'>
              {'Тестирование Catalog IPC API'}
            </h2>
            <TextButton
              onClick={() => testGetCatalog()}
              className='settings__button'>
              {'Получить каталог'}
            </TextButton>
            <TextButton
              onClick={() => testGetCatalogForceRefresh()}
              className='settings__button'>
              {'Обновить каталог'}
            </TextButton>
            <TextButton
              onClick={() => testSearchModels()}
              className='settings__button'>
              {'Поиск моделей'}
            </TextButton>
            <TextButton
              onClick={() => testGetModelInfo(settings[provider]?.model)}
              className='settings__button'>
              {'Получить информацию о модели'}
            </TextButton>
            <p className='settings__description'>
              {
                'Кнопки тестирования Catalog IPC API. Проверьте результаты в консоли.'
              }
            </p>
            <h2 className='settings__title'>{'Тестирование Chat IPC API'}</h2>
            <TextButton
              onClick={() =>
                testCreateChat('Тестовый чат', settings[provider]?.model)
              }
              className='settings__button'>
              {'Создать чат'}
            </TextButton>
            <TextButton
              onClick={() => testListChats()}
              className='settings__button'>
              {'Список чатов'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId ? testGetChat(chatId) : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Получить чат'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testUpdateChat(chatId, 'Обновленный чат')
                  : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Обновить чат'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testAddMessage(chatId, 'Тестовое сообщение')
                  : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Добавить сообщение'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testAddAssistantMessage(chatId, 'Тестовый ответ ассистента')
                  : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Добавить ответ ассистента'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId ? testDeleteChat(chatId, true) : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Удалить чат'}
            </TextButton>
            <p className='settings__description'>
              {
                'Кнопки тестирования Chat IPC API. Проверьте результаты в консоли.'
              }
            </p>
            <h2 className='settings__title'>{'Тестирование RAG IPC API'}</h2>
            <TextButton
              onClick={() =>
                chatId
                  ? testUploadAndProcessDocument(chatId)
                  : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Загрузить и обработать PDF'}
            </TextButton>
            <TextButton
              onClick={() => testListCollections()}
              className='settings__button'>
              {'Список коллекций'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testGetCollectionStats(chatId)
                  : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Статистика коллекции'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testQueryDocuments('тестовый запрос', chatId)
                  : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Поиск документов'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testGenerateWithRagContext(
                      values.prompt || 'тестовый запрос',
                      chatId,
                      settings[provider]?.model
                    )
                  : alert('Введите Chat ID')
              }
              className='settings__button'>
              {`Генерация «${values.prompt}» с RAG контекстом`}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId ? testDeleteCollection(chatId) : alert('Введите Chat ID')
              }
              className='settings__button'>
              {'Удалить коллекцию'}
            </TextButton>
            <TextButton
              onClick={() => testProcessingProgress()}
              className='settings__button'>
              {'Подписка на прогресс обработки'}
            </TextButton>
            <p className='settings__description'>
              {
                'Кнопки тестирования RAG IPC API. Проверьте результаты в консоли.'
              }
            </p>
            <h2 className='settings__title'>{'Тестирование UI'}</h2>
            <TextButton
              onClick={() =>
                dispatch(
                  addNotification({
                    type: 'info',

                    message: 'Сообщение',
                  })
                )
              }
              className='settings__button'>
              {'Вызвать Toast-уведомление'}
            </TextButton>
            <TextButton
              onClick={() =>
                dispatch(
                  addNotification({
                    type: 'error',

                    message: 'Ошибка',
                  })
                )
              }
              className='settings__button'>
              {'Вызвать Toast-ошибку'}
            </TextButton>
            <TextButton
              onClick={() => dispatch(openElement('testListModelsPopup'))}
              className='settings__button'>
              {'Открыть список моделей'}
            </TextButton>
            <TextButton
              onClick={() => dispatch(openElement('testListLanguagesPopup'))}
              className='settings__button'>
              {'Открыть список языков'}
            </TextButton>
          </div>
        </div>
      </div>

      <PopupWithSearch
        isOpened={isOpenTestListModelsPopup && Object.keys(MODELS).length > 1}
        setOpened={() => dispatch(closeElement('testListModelsPopup'))}
        styleWrapper={{ minWidth: '30.4352%' }}
        enableLazyLoading
        lazyLoadingThreshold={20}
        lazyLoadingMargin='100px'
        enableAnimation
        animationDuration={50}
        animationDelay={25}
        animationType='scaleIn'
        searchPlaceholder='Model...'
        searchDebounceMs={300}
        searchValue={searchValue}
        onSearchChange={setSearchValue}>
        {MODELS.data.ollama.map(({ name }) => (
          <SelectorOption
            key={name}
            state='available'
            text={name}
            onClick={() => {
              dispatch(closeElement('testListModelsPopup'));
            }}
          />
        ))}
      </PopupWithSearch>
      <Popup
        isOpened={isOpenTestListLanguagesPopup}
        setOpened={() => dispatch(closeElement('testListLanguagesPopup'))}
        styleWrapper={{ minWidth: '30.4352%' }}>
        {translationLanguages.map(({ language, code }) => (
          <SelectorOption
            key={code}
            state='simple'
            text={language}
            isActive={translationKey === language}
            onClick={() => {
              setTranslationKey(language);
              dispatch(closeElement('testListLanguagesPopup'));
            }}
          />
        ))}
      </Popup>
    </>
  );
}

export default Tests;
