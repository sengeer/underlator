import { useState, useEffect } from 'react';

interface Progress {
  file: string;
  progress: number;
}

export function useTranslateStatus() {
  const [progressItems, setProgressItems] = useState<Progress>({
    file: '',
    progress: 0,
  });

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

  return {
    progressItems,
    output,
  };
}
