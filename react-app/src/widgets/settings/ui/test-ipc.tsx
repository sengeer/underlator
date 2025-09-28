import '../styles/settings.scss';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import NetworkIntelligenceIcon from '../../../shared/assets/icons/network-intelligence-icon';
import useFormAndValidation from '../../../shared/lib/hooks/use-form-and-validation';
import { openElement } from '../../../shared/models/element-state-slice';
import ButtonWrapperWithBackground from '../../../shared/ui/button-wrapper-with-background';
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
} from '../tests/ipc-tester';

/**
 * @description Компонент для тестирования IPC API
 */
function TestIpc() {
  const { values, handleChange, setValues } = useFormAndValidation();

  const dispatch = useDispatch();

  useEffect(() => {
    setValues({ model: 'qwen3:0.6b', prompt: 'Сколько будет 2 + 2?' });
  }, [setValues]);

  return (
    <>
      {import.meta.env.DEV && (
        <div className='settings__container'>
          <div className='settings__column'>
            <h2 className='settings__title'>
              {'Поля ввода для тестов IPC API'}
            </h2>
            <ButtonWrapperWithBackground>
              <TextAndIconButton
                className='text-and-icon-button'
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
                className='text-and-icon-button'
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
                {'📋 Список установленных моделей'}
              </TextButton>
              <TextButton
                onClick={() => testGetCatalog()}
                className='settings__button'>
                {'📚 Получить каталог'}
              </TextButton>
              <TextButton
                onClick={() => testGetCatalogForceRefresh()}
                className='settings__button'>
                {'🔄 Обновить каталог'}
              </TextButton>
              <TextButton
                onClick={() => testSearchModels()}
                className='settings__button'>
                {'🔍 Поиск моделей'}
              </TextButton>
              <TextButton
                onClick={() => testGetModelInfo(values.model)}
                className='settings__button'>
                {'ℹ️ Получить информацию о модели'}
              </TextButton>
              <TextButton
                onClick={() => testInstallModel(values.model)}
                className='settings__button'>
                {'📥 Установить ' + values.model}
              </TextButton>
              <TextButton
                onClick={() => testGenerateText(values.model, values.prompt)}
                className='settings__button'>
                {'🤖 Генерация ' + values.prompt}
              </TextButton>
              <TextButton
                onClick={() => testRemoveModel(values.model)}
                className='settings__button'>
                {'🗑️ Удалить ' + values.model}
              </TextButton>
              <TextButton
                onClick={() => dispatch(openElement('testListModelsPopup'))}
                className='settings__button'>
                {'📋 Тестирование списка моделей'}
              </TextButton>
              <TextButton
                onClick={() => runFullTest(values.model, values.prompt)}
                className='settings__button'>
                {'🚀 Запуск полного тестирования'}
              </TextButton>
            </div>
            <p className='settings__description'>
              {
                'Кнопки тестирования Ollama IPC API. Проверьте результаты в консоли.'
              }
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default TestIpc;
