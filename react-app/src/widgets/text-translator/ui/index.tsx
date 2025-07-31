import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import BackspaceIcon from '../../../shared/assets/icons/backspace-icon';
import CheckIcon from '../../../shared/assets/icons/check-icon';
import CopyIcon from '../../../shared/assets/icons/copy-icon';
import GlobeIcon from '../../../shared/assets/icons/globe-icon';
import GlobeUkIcon from '../../../shared/assets/icons/globe-uk-icon';
import StopCircleIcon from '../../../shared/assets/icons/stop-circle-icon';
import SyncIcon from '../../../shared/assets/icons/sync-icon';
import TranslateIcon from '../../../shared/assets/icons/translate-icon';
import { useCopying } from '../../../shared/lib/hooks/use-copying';
import { useModel } from '../../../shared/lib/hooks/use-model';
import useWindowSize from '../../../shared/lib/hooks/use-window-size';
import stringifyGenerateResponse from '../../../shared/lib/utils/stringify-generate-response';
import { selectActiveProviderSettings } from '../../../shared/models/provider-settings-slice';
import AnimatingWrapper from '../../../shared/ui/animating-wrapper';
import DecorativeTextAndIconButton from '../../../shared/ui/decorative-text-and-icon-button';
import IconButton from '../../../shared/ui/icon-button';
import Loader from '../../../shared/ui/loader';
import TextAndIconButton from '../../../shared/ui/text-and-icon-button';
import './index.scss';

interface TextTranslator {
  isOpened: boolean;
}

function TextTranslator({ isOpened }: TextTranslator) {
  const {
    progressItems,
    generatedResponse,
    generate,
    translateLanguage,
    toggleTranslateLanguage,
    status,
  } = useModel();

  const { isCopied, handleCopy } = useCopying();
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');

  const { provider } = useSelector(selectActiveProviderSettings);

  const { t } = useLingui();

  function handleClear() {
    setInput('');
  }

  const { width } = useWindowSize();

  const hasSizeS = width <= 768;

  useEffect(() => {
    setOutput(stringifyGenerateResponse(generatedResponse));
  }, [generatedResponse]);

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
      <div className='text-translator__textarea-wrapper'>
        <textarea
          className='text-translator__textarea'
          value={input}
          placeholder={'en-ru' === translateLanguage ? 'hello' : 'привет'}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
        />
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
      <IconButton onClick={toggleTranslateLanguage}>
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
      <div className='text-translator__textarea-wrapper'>
        <textarea
          className='text-translator__textarea'
          value={output}
          placeholder={'en-ru' === translateLanguage ? 'привет' : 'hello'}
          rows={1}
          readOnly
        />
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
      {provider === 'Ollama' && status === 'process' ? (
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
          text={progressItems.file === '' ? t`translate` : progressItems.file}
          style={{
            margin: '0 auto 1rem',
            width: 'min-content',
            alignSelf: 'center',
          }}
          isDisabled={progressItems.file !== ''}
          onClick={() =>
            generate([input], { responseMode: 'stringChunk', think: false })
          }>
          {progressItems.file !== '' ? <Loader /> : <TranslateIcon />}
        </TextAndIconButton>
      )}
    </section>
  );
}

export default TextTranslator;
