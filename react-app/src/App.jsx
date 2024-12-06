import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import LanguageSelector from './components/LanguageSelector';
import Progress from './components/Progress';

function App() {
  // Model loading
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [error, setError] = useState(null);
  const [input, setInput] = useState('I like to translate.');
  const [sourceLanguage, setSourceLanguage] = useState('eng_Latn');
  const [targetLanguage, setTargetLanguage] = useState('rus_Cyrl');
  const [output, setOutput] = useState('');

  useEffect(() => {
    window.electron.onStatus((message) => {
      switch (message.status) {
        case 'progress':
          setProgressItems((prev) => [...prev, message.data]);
          break;
        case 'update':
          setOutput(message.output);
          break;
        case 'complete':
          setOutput(message.output[0].translation_text);
          break;
        case 'error':
          setError(message.error);
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
      setError(error.message);
    }
  };

  return (
    <HashRouter>
      <Routes>
        <Route
          path='/'
          element={
            <>
              <h2>ML-powered multilingual translation in React!</h2>

              <div className='container'>
                <div className='language-container'>
                  <LanguageSelector
                    type={'Source'}
                    defaultLanguage={'eng_Latn'}
                    onChange={(x) => setSourceLanguage(x.target.value)}
                  />
                  <LanguageSelector
                    type={'Target'}
                    defaultLanguage={'rus_Cyrl'}
                    onChange={(x) => setTargetLanguage(x.target.value)}
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
                {progressItems.map((data, index) => (
                  <div key={index}>
                    <Progress text={data.file} percentage={data.progress} />
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ color: 'red' }} className='error-message'>
                  {error}
                </div>
              )}
            </>
          }
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
