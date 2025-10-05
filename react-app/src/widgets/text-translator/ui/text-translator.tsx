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
import '../styles/text-translator.scss';

interface TextTranslator {
  isOpened: boolean;
}

function TextTranslator({ isOpened }: TextTranslator) {
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

  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');

  const isOpenFirstLangSelectionPopupForTranslator = useSelector((state) =>
    isElementOpen(state, 'firstLangSelectionPopupForTranslator')
  );

  const isOpenSecondLangSelectionPopupForTranslator = useSelector((state) =>
    isElementOpen(state, 'secondLangSelectionPopupForTranslator')
  );

  function handleClear() {
    setInput('');
  }

  function handleTranslation() {
    generate(
      input,
      {
        responseMode: 'stringStream',
      },
      {
        think: false,
      }
    );
  }

  const { width } = useWindowSize();

  const hasSizeS = width <= 768;

  useEffect(() => {
    setOutput(stringifyGenerateResponse(generatedResponse));
  }, [generatedResponse]);

  return (
    <section
      className={`text-translator${isOpened ? ' text-translator_open' : ''}`}>
      <TextAndIconButton
        text={sourceLanguage}
        style={{ margin: '1rem auto 0' }}
        onClick={() =>
          dispatch(openElement('firstLangSelectionPopupForTranslator'))
        }>
        <GlobeUkIcon />
      </TextAndIconButton>
      <div className='text-translator__textarea-wrapper'>
        <textarea
          className='text-translator__textarea'
          value={input}
          placeholder={getPlaceholderByLanguage(sourceLanguage)}
          rows={1}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setInput(e.target.value)
          }
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
      <TextAndIconButton
        text={targetLanguage}
        style={{ margin: '1rem auto 0' }}
        onClick={() =>
          dispatch(openElement('secondLangSelectionPopupForTranslator'))
        }>
        <GlobeIcon />
      </TextAndIconButton>
      <div className='text-translator__textarea-wrapper'>
        <textarea
          className='text-translator__textarea'
          value={output}
          placeholder={getPlaceholderByLanguage(targetLanguage)}
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
      <Popup
        isOpened={isOpenFirstLangSelectionPopupForTranslator}
        setOpened={() =>
          dispatch(closeElement('firstLangSelectionPopupForTranslator'))
        }
        styleWrapper={{ minWidth: '30.4352%' }}>
        {translationLanguages.map(({ language, code }) => (
          <SelectorOption
            key={code}
            state='simple'
            text={language}
            isActive={sourceLanguage === language}
            onClick={() => {
              handleSourceLanguageSelection(language);
              dispatch(closeElement('firstLangSelectionPopupForTranslator'));
            }}
          />
        ))}
      </Popup>
      <Popup
        isOpened={isOpenSecondLangSelectionPopupForTranslator}
        setOpened={() =>
          dispatch(closeElement('secondLangSelectionPopupForTranslator'))
        }
        styleWrapper={{ minWidth: '30.4352%' }}>
        {translationLanguages.map(({ language, code }) => (
          <SelectorOption
            key={code}
            state='simple'
            text={language}
            isActive={targetLanguage === language}
            onClick={() => {
              handleTargetLanguageSelection(language);
              dispatch(closeElement('secondLangSelectionPopupForTranslator'));
            }}
          />
        ))}
      </Popup>
    </section>
  );
}

export default TextTranslator;
