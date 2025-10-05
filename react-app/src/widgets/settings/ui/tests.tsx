/**
 * @module Tests
 * Компонент для тестирования.
 */

import '../styles/settings.scss';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import ButtonWrapperWithBackground from '../../../shared/ui/button-wrapper-with-background';
import Popup from '../../../shared/ui/popup';
import PopupWithSearch from '../../../shared/ui/popup-with-search';
import SelectorOption from '../../../shared/ui/selector-option';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import TextButton from '../../../shared/ui/text-button/text-button';
import {
  testListModels,
  testInstallModel,
  testGenerateText,
  testRemoveModel,
  testGetCatalog,
  testGetCatalogForceRefresh,
  testSearchModels,
  testGetModelInfo,
  runFullTest,
} from '../tests/ipc';

function Tests() {
  const [searchValue, setSearchValue] = useState('');
  const [translationKey, setTranslationKey] = useState('');

  const dispatch = useDispatch();

  const { translationLanguages } = useTranslationLanguages();
  const { values, handleChange, setValues } = useFormAndValidation();

  const isOpenTestListModelsPopup = useSelector((state) =>
    isElementOpen(state, 'testListModelsPopup')
  );

  const isOpenTestListLanguagesPopup = useSelector((state) =>
    isElementOpen(state, 'testListLanguagesPopup')
  );

  useEffect(() => {
    setValues({ model: 'qwen3:0.6b', prompt: 'Сколько будет 2 + 2?' });
  }, [setValues]);

  return (
    <>
      <div className='settings__container'>
        <div className='settings__column'>
          <h2 className='settings__title'>{'Поля ввода для тестов IPC API'}</h2>
          <ButtonWrapperWithBackground>
            <TextAndIconButton
              text='Модель'
              style={{ marginLeft: '1rem' }}
              isDisabled>
              <NetworkIntelligenceIcon />
            </TextAndIconButton>
            <input
              className='settings__input settings__text'
              placeholder='qwen3:0.6b'
              type='text'
              id='model'
              name='model'
              value={values.model || ''}
              onChange={handleChange}
            />
          </ButtonWrapperWithBackground>
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
          <h2 className='settings__title'>{'Тестирование IPC API'}</h2>
          <div className='settings__btns-group'>
            <TextButton
              onClick={() => testListModels()}
              className='settings__button'>
              {'Список установленных моделей'}
            </TextButton>
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
              onClick={() => testGetModelInfo(values.model)}
              className='settings__button'>
              {'Получить информацию о модели'}
            </TextButton>
            <TextButton
              onClick={() => testInstallModel(values.model)}
              className='settings__button'>
              {'Установить ' + values.model}
            </TextButton>
            <TextButton
              onClick={() => testGenerateText(values.model, values.prompt)}
              className='settings__button'>
              {'Генерация ' + values.prompt}
            </TextButton>
            <TextButton
              onClick={() => testRemoveModel(values.model)}
              className='settings__button'>
              {'Удалить ' + values.model}
            </TextButton>
            <TextButton
              onClick={() => runFullTest(values.model, values.prompt)}
              className='settings__button'>
              {'Запуск полного тестирования'}
            </TextButton>
            <p className='settings__description'>
              {'Кнопки тестирования IPC API. Проверьте результаты в консоли.'}
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
