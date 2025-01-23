import React from 'react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LanguageSelectorPopup from 'widgets/language-selector-popup';
import SideNavigate from 'widgets/side-navigate';
import GlobeIcon from 'shared/assets/icons/globe-icon';
import GlobeUkIcon from 'shared/assets/icons/globe-uk-icon';
import {
  openElement,
  closeElement,
  isElementOpen,
} from 'shared/model/element-state-slice';
import Loader from 'shared/ui/loader';
import TextAndIconButton from 'shared/ui/text-and-icon-button';
import './index.scss';

function TextTranslator() {
  // Model loading
  const [progressItems, setProgressItems] = useState<Progress>({
    file: '',
    progress: 0,
  });

  // Inputs and outputs
  const [input, setInput] = useState('I like to translate.');
  const [selectedSourceLanguageKey, setSelectedSourceLanguageKey] =
    useState('English');
  const [selectedTargetLanguageKey, setSelectedTargetLanguageKey] =
    useState('Russian');
  const [sourceLanguage, setSourceLanguage] = useState('eng_Latn');
  const [targetLanguage, setTargetLanguage] = useState('rus_Cyrl');
  const [output, setOutput] = useState('');

  const dispatch = useDispatch();

  const isOpenSourceLanguageSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'sourceLanguageSelectorPopup')
  );

  const isOpenTargetLanguageSelectorPopup = useSelector((state) =>
    isElementOpen(state, 'targetLanguageSelectorPopup')
  );

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
        src_lang: sourceLanguage,
        tgt_lang: targetLanguage,
      });
    } catch (error) {
      console.error((error as Error).message);
    }
  };

  return (
    <main className='text-translator'>
      <SideNavigate />
      <div className='text-translator__container'>
        <TextAndIconButton
          text={selectedSourceLanguageKey}
          style={{ margin: '2rem auto 0' }}
          onClick={() => dispatch(openElement('sourceLanguageSelectorPopup'))}>
          <GlobeIcon color='var(--main)' />
        </TextAndIconButton>
        <LanguageSelectorPopup
          key='source-language-selector-popup'
          isOpened={isOpenSourceLanguageSelectorPopup}
          setOpened={() =>
            dispatch(closeElement('sourceLanguageSelectorPopup'))
          }
          setSelectedLanguageKey={setSelectedSourceLanguageKey}
          selectedLanguageValue={sourceLanguage}
          setSelectedLanguageValue={setSourceLanguage}
          defaultLanguage={'eng_Latn'}
        />
        <textarea
          className='text-translator__textarea'
          value={input}
          rows={3}
          onChange={(e) => setInput(e.target.value)}
        />
        <TextAndIconButton
          text={selectedTargetLanguageKey}
          style={{ margin: '2rem auto 0' }}
          onClick={() => dispatch(openElement('targetLanguageSelectorPopup'))}>
          <GlobeUkIcon color='var(--main)' />
        </TextAndIconButton>
        <LanguageSelectorPopup
          key='target-language-selector-popup'
          isOpened={isOpenTargetLanguageSelectorPopup}
          setOpened={() =>
            dispatch(closeElement('targetLanguageSelectorPopup'))
          }
          setSelectedLanguageKey={setSelectedTargetLanguageKey}
          selectedLanguageValue={targetLanguage}
          setSelectedLanguageValue={setTargetLanguage}
          defaultLanguage={'rus_Cyrl'}
        />
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
          onClick={translate}>
          <Loader isLoading={progressItems.file !== ''} />
        </TextAndIconButton>
      </div>
    </main>
  );
}

export default TextTranslator;
