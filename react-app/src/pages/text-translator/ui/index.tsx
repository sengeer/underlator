import React from 'react';
import { useEffect, useState } from 'react';
import SideNavigate from 'widgets/side-navigate';
import LanguageSelector from '../../../shared/ui/language-selector';
import ProgressBar from '../../../shared/ui/progress-bar';
import './index.scss';

function TextTranslator() {
  // Model loading
  const [progressItems, setProgressItems] = useState<Progress>({});

  const NODE_ENV = process.env.NODE_ENV;

  // Inputs and outputs
  const [input, setInput] = useState('I like to translate.');
  const [sourceLanguage, setSourceLanguage] = useState('eng_Latn');
  const [targetLanguage, setTargetLanguage] = useState('rus_Cyrl');
  const [output, setOutput] = useState('');

  useEffect(() => {
    NODE_ENV === 'development'
      ? null
      : window.electron.onStatus((message) => {
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
                setProgressItems({});
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
      NODE_ENV === 'development'
        ? null
        : await window.electron.run({
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
      <div className='container'>
        <div className='language-container'>
          <LanguageSelector
            type={'Source'}
            defaultLanguage={'eng_Latn'}
            onChange={(x: React.ChangeEvent<HTMLSelectElement>) =>
              setSourceLanguage(x.target.value)
            }
          />
          <LanguageSelector
            type={'Target'}
            defaultLanguage={'rus_Cyrl'}
            onChange={(x: React.ChangeEvent<HTMLSelectElement>) =>
              setTargetLanguage(x.target.value)
            }
          />
        </div>

        <div className='textbox-container'>
          <textarea
            value={input}
            rows={3}
            onChange={(e) => setInput(e.target.value)}></textarea>
          <textarea value={output} rows={3} readOnly></textarea>
        </div>
      </div>

      <button onClick={translate}>Translate</button>

      <div className='progress-bars-container'>
        <div>
          <ProgressBar
            text={progressItems.file}
            percentage={progressItems.progress}
          />
        </div>
      </div>
    </main>
  );
}

export default TextTranslator;
