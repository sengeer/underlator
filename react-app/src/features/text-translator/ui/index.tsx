import { useLingui } from '@lingui/react/macro';
import GlobeIcon from '../../../shared/assets/icons/globe-icon';
import GlobeUkIcon from '../../../shared/assets/icons/globe-uk-icon';
import SyncIconL from '../../../shared/assets/icons/sync-icon-l';
import TranslateIconM from '../../../shared/assets/icons/translate-icon-m';
import { useTranslate } from '../../../shared/lib/hooks/use-translate';
import { useTranslateStatus } from '../../../shared/lib/hooks/use-translate-status';
import DecorativeTextAndIconButton from '../../../shared/ui/decorative-text-and-icon-button';
import IconButton from '../../../shared/ui/icon-button';
import Loader from '../../../shared/ui/loader';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import './index.scss';

function TextTranslator({ isOpened }: { isOpened: boolean }) {
  const { progressItems, output } = useTranslateStatus();

  const { t } = useLingui();

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
        <DecorativeTextAndIconButton
          text={t`english`}
          style={{ margin: '1rem auto 0' }}>
          <GlobeIcon />
        </DecorativeTextAndIconButton>
      ) : (
        <DecorativeTextAndIconButton
          text={t`russian`}
          style={{ margin: '1rem auto 0' }}>
          <GlobeUkIcon />
        </DecorativeTextAndIconButton>
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
        <DecorativeTextAndIconButton
          text={t`english`}
          style={{ margin: '1rem auto 0' }}>
          <GlobeIcon />
        </DecorativeTextAndIconButton>
      ) : (
        <DecorativeTextAndIconButton
          text={t`russian`}
          style={{ margin: '1rem auto 0' }}>
          <GlobeUkIcon />
        </DecorativeTextAndIconButton>
      )}
      <textarea
        className='text-translator__textarea'
        value={output}
        rows={1}
        readOnly
      />
      <TextAndIconButton
        text={progressItems.file === '' ? t`translate` : progressItems.file}
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
