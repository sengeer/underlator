import React from 'react';
import { useEffect, useState } from 'react';
import GlobeIcon from 'shared/assets/icons/globe-icon';
import GlobeUkIcon from 'shared/assets/icons/globe-uk-icon';
import SyncIconL from 'shared/assets/icons/sync-icon-l';
import TranslateIconM from 'shared/assets/icons/translate-icon-m';
import IconButton from 'shared/ui/icon-button';
import Loader from 'shared/ui/loader';
import TextAndIconButton from 'shared/ui/text-and-icon-button';
import './index.scss';

function TextTranslator({ isOpened }: { isOpened: boolean }) {
  // Model loading
  const [progressItems, setProgressItems] = useState<Progress>({
    file: '',
    progress: 0,
  });

  const [translateLanguage, setTranslateLanguage] = useState<'en-ru' | 'ru-en'>(
    'en-ru'
  );

  // Inputs and outputs
  const [input, setInput] = useState(
    'The quick brown fox jumps over the lazy dog.'
  );
  const [output, setOutput] = useState('');

  const toggleTranslateLanguage = () => {
    setTranslateLanguage((prev) => (prev === 'en-ru' ? 'ru-en' : 'en-ru'));
  };

  useEffect(() => {
    window.electron.onStatus((message) => {
      switch (message.status) {
        case 'progress':
          if (message.data) setProgressItems(message.data);
          break;
        case 'update':
          if (message.output) setOutput(message.output as string);
          break;
        case 'complete':
          if (
            Array.isArray(message.output) &&
            message.output[0]?.translation_text
          ) {
            setOutput(message.output[0].translation_text);
            setProgressItems({ file: '', progress: 0 });
          }
          break;
        case 'error':
          console.error(message.error);
          break;
      }
    });
  }, []);

  const translate = async () => {
    try {
      await window.electron.run({
        translate: translateLanguage,
        text: input,
      });
    } catch (error) {
      console.error((error as Error).message);
    }
  };

  return (
    <section
      className={`text-translator${isOpened ? ' text-translator_open' : ''}`}>
      {'en-ru' === translateLanguage ? (
        <TextAndIconButton
          text='English'
          style={{ margin: '1rem auto 0' }}
          isDisabled>
          <GlobeIcon color='var(--main)' />
        </TextAndIconButton>
      ) : (
        <TextAndIconButton
          text='Русский'
          style={{ margin: '1rem auto 0' }}
          isDisabled>
          <GlobeUkIcon color='var(--main)' />
        </TextAndIconButton>
      )}
      <textarea
        className='text-translator__textarea'
        value={input}
        rows={1}
        onChange={(e) => setInput(e.target.value)}
      />
      <IconButton onClick={toggleTranslateLanguage}>
        <SyncIconL color='var(--main)' />
      </IconButton>
      {'ru-en' === translateLanguage ? (
        <TextAndIconButton
          text='English'
          style={{ margin: '1rem auto 0' }}
          isDisabled>
          <GlobeIcon color='var(--main)' />
        </TextAndIconButton>
      ) : (
        <TextAndIconButton
          text='Русский'
          style={{ margin: '1rem auto 0' }}
          isDisabled>
          <GlobeUkIcon color='var(--main)' />
        </TextAndIconButton>
      )}
      <textarea
        className='text-translator__textarea'
        value={output}
        rows={1}
        readOnly
      />
      <TextAndIconButton
        text={progressItems.file === '' ? 'Перевести' : progressItems.file}
        style={{
          margin: '0 auto 1rem',
          width: 'min-content',
          alignSelf: 'center',
        }}
        isDisabled={progressItems.file !== ''}
        onClick={translate}>
        {progressItems.file !== '' ? <Loader /> : <TranslateIconM />}
      </TextAndIconButton>
    </section>
  );
}

export default TextTranslator;
