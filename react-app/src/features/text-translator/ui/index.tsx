import React from 'react';
import GlobeIcon from 'shared/assets/icons/globe-icon';
import GlobeUkIcon from 'shared/assets/icons/globe-uk-icon';
import SyncIconL from 'shared/assets/icons/sync-icon-l';
import TranslateIconM from 'shared/assets/icons/translate-icon-m';
import { useTranslate } from 'shared/lib/hooks/use-translate';
import { useTranslateStatus } from 'shared/lib/hooks/use-translate-status';
import IconButton from 'shared/ui/icon-button';
import Loader from 'shared/ui/loader';
import TextAndIconButton from 'shared/ui/text-and-icon-button';
import './index.scss';

function TextTranslator({ isOpened }: { isOpened: boolean }) {
  const { progressItems, output } = useTranslateStatus();

  const {
    translateLanguage,
    input,
    setInput,
    toggleTranslateLanguage,
    translate,
  } = useTranslate();

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
