import React from 'react';
import { useEffect, useState } from 'react';
import GlobeIcon from 'shared/assets/icons/globe-icon';
import GlobeUkIcon from 'shared/assets/icons/globe-uk-icon';
import TranslateIconM from 'shared/assets/icons/translate-icon-m';
import Loader from 'shared/ui/loader';
import TextAndIconButton from 'shared/ui/text-and-icon-button';
import './index.scss';

function TextTranslator({ isOpened }: { isOpened: boolean }) {
  // Model loading
  const [progressItems, setProgressItems] = useState<Progress>({
    file: '',
    progress: 0,
  });

  // Inputs and outputs
  const [input, setInput] = useState('I like to translate.');
  const [output, setOutput] = useState('');

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
        text: input,
      });
    } catch (error) {
      console.error((error as Error).message);
    }
  };

  return (
    <section
      className={`text-translator${isOpened ? ' text-translator_open' : ''}`}>
      <TextAndIconButton
        text='English'
        style={{ margin: '2rem auto 0' }}
        isDisabled>
        <GlobeIcon color='var(--main)' />
      </TextAndIconButton>
      <textarea
        className='text-translator__textarea'
        value={input}
        rows={3}
        onChange={(e) => setInput(e.target.value)}
      />
      <TextAndIconButton
        text='Русский'
        style={{ margin: '2rem auto 0' }}
        isDisabled>
        <GlobeUkIcon color='var(--main)' />
      </TextAndIconButton>
      <textarea
        className='text-translator__textarea'
        value={output}
        rows={3}
        readOnly
      />
      <TextAndIconButton
        text={progressItems.file === '' ? 'Translate' : progressItems.file}
        style={{
          margin: '0 auto 2rem',
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
