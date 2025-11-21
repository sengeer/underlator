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
import { addNotification } from '../../../shared/models/notifications-slice';
import { selectProviderSettings } from '../../../shared/models/provider-settings-slice';
import ButtonWrapperWithBackground from '../../../shared/ui/button-wrapper-with-background';
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
  testQueryDocuments,
  testGetCollectionStats,
  testListCollections,
  testDeleteCollection,
  testProcessingProgress,
  testGenerateWithRagContext,
} from '../tests/rag-ipc';

function Tests() {
  const [chatId, setChatId] = useState('');

  const dispatch = useDispatch();

  const { provider, settings } = useSelector(selectProviderSettings);

  const { values, handleChange, setValues } = useFormAndValidation();

  useEffect(() => {
    setValues({ prompt: 'Сколько будет 2 + 2?' });
  }, [setValues]);

  return (
    <>
      <div className='settings__container'>
        <div className='settings__column settings__column_type_tests'>
          <h2 className='text-heading-l settings__title'>
            {'Поля ввода для тестов IPC API'}
          </h2>
          <ButtonWrapperWithBackground>
            <TextAndIconButton
              text='Промпт'
              style={{ marginLeft: '1rem' }}
              isDisabled>
              <NetworkIntelligenceIcon />
            </TextAndIconButton>
            <input
              className='text-body-m settings__input settings__text'
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
              className='text-body-m settings__input settings__text'
              placeholder='chat_xxxxxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
              type='text'
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
          </ButtonWrapperWithBackground>
          <h2 className='text-heading-l settings__title'>
            {'Тестирование Model IPC API'}
          </h2>
          <div className='settings__btns-group'>
            <TextButton
              onClick={() => testListModels()}
              className='text-body-m settings__button'>
              {'Список установленных моделей'}
            </TextButton>
            <TextButton
              onClick={() => testInstallModel(settings[provider]?.model)}
              className='text-body-m settings__button'>
              {'Установить ' + settings[provider]?.model}
            </TextButton>
            <TextButton
              onClick={() =>
                testGenerateText(
                  settings[provider]?.model,
                  values.prompt as string
                )
              }
              className='text-body-m settings__button'>
              {`Генерация «${values.prompt}»`}
            </TextButton>
            <TextButton
              onClick={() => testRemoveModel(settings[provider]?.model)}
              className='text-body-m settings__button'>
              {'Удалить ' + settings[provider]?.model}
            </TextButton>
            <p className='text-body-m settings__text'>
              {
                'Кнопки тестирования Model IPC API. Проверьте результаты в консоли.'
              }
            </p>
            <h2 className='text-heading-l settings__title'>
              {'Тестирование Catalog IPC API'}
            </h2>
            <TextButton
              onClick={() => testGetCatalog()}
              className='text-body-m settings__button'>
              {'Получить каталог'}
            </TextButton>
            <TextButton
              onClick={() => testGetCatalogForceRefresh()}
              className='text-body-m settings__button'>
              {'Обновить каталог'}
            </TextButton>
            <TextButton
              onClick={() => testSearchModels()}
              className='text-body-m settings__button'>
              {'Поиск моделей'}
            </TextButton>
            <TextButton
              onClick={() => testGetModelInfo(settings[provider]?.model)}
              className='text-body-m settings__button'>
              {'Получить информацию о модели'}
            </TextButton>
            <p className='text-body-m settings__text'>
              {
                'Кнопки тестирования Catalog IPC API. Проверьте результаты в консоли.'
              }
            </p>
            <h2 className='text-heading-l settings__title'>
              {'Тестирование Chat IPC API'}
            </h2>
            <TextButton
              onClick={() =>
                testCreateChat('Тестовый чат', settings[provider]?.model)
              }
              className='text-body-m settings__button'>
              {'Создать чат'}
            </TextButton>
            <TextButton
              onClick={() => testListChats()}
              className='text-body-m settings__button'>
              {'Список чатов'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId ? testGetChat(chatId) : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Получить чат'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testUpdateChat(chatId, 'Обновленный чат')
                  : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Обновить чат'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testAddMessage(chatId, 'Тестовое сообщение')
                  : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Добавить сообщение'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testAddAssistantMessage(chatId, 'Тестовый ответ ассистента')
                  : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Добавить ответ ассистента'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId ? testDeleteChat(chatId, true) : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Удалить чат'}
            </TextButton>
            <p className='text-body-m settings__text'>
              {
                'Кнопки тестирования Chat IPC API. Проверьте результаты в консоли.'
              }
            </p>
            <h2 className='text-heading-l settings__title'>
              {'Тестирование RAG IPC API'}
            </h2>
            <TextButton
              onClick={() =>
                chatId
                  ? testUploadAndProcessDocument(chatId)
                  : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Загрузить и обработать PDF'}
            </TextButton>
            <TextButton
              onClick={() => testListCollections()}
              className='text-body-m settings__button'>
              {'Список коллекций'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testGetCollectionStats(chatId)
                  : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Статистика коллекции'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testQueryDocuments('тестовый запрос', chatId)
                  : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Поиск документов'}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId
                  ? testGenerateWithRagContext(
                      (values.prompt as string) || 'тестовый запрос',
                      chatId,
                      settings[provider]?.model
                    )
                  : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {`Генерация «${values.prompt}» с RAG контекстом`}
            </TextButton>
            <TextButton
              onClick={() =>
                chatId ? testDeleteCollection(chatId) : alert('Введите Chat ID')
              }
              className='text-body-m settings__button'>
              {'Удалить коллекцию'}
            </TextButton>
            <TextButton
              onClick={() => testProcessingProgress()}
              className='text-body-m settings__button'>
              {'Подписка на прогресс обработки'}
            </TextButton>
            <p className='text-body-m settings__text'>
              {
                'Кнопки тестирования RAG IPC API. Проверьте результаты в консоли.'
              }
            </p>
            <h2 className='text-heading-l settings__title'>
              {'Тестирование UI'}
            </h2>
            <TextButton
              onClick={() =>
                dispatch(
                  addNotification({
                    type: 'info',

                    message: 'Сообщение',
                  })
                )
              }
              className='text-body-m settings__button'>
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
              className='text-body-m settings__button'>
              {'Вызвать Toast-ошибку'}
            </TextButton>
          </div>
        </div>
      </div>
    </>
  );
}

export default Tests;
