// This file (worker.js) contains all the logic for loading the model and running predictions.
const { parentPort } = require('worker_threads');
const TranslationPipeline = require('./model');

// Message handler for workflow.
parentPort.on('message', async (event) => {
  try {
    let translator = await TranslationPipeline.getInstance(
      event.translate,
      (x) => {
        parentPort.postMessage({ status: 'progress', data: x });
      }
    );

    const texts = event.text.split(event.delimiter);
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text.trim()) {
        parentPort.postMessage({
          status: 'chunk',
          data: { idx: i, text: '' },
        });
        continue;
      }
      const output = await translator(text);
      const translatedText = output[0].translation_text;
      parentPort.postMessage({
        status: 'chunk',
        data: { idx: i, text: translatedText },
      });
    }

    parentPort.postMessage({ status: 'complete' });
  } catch (error) {
    // We send an error if something goes wrong.
    parentPort.postMessage({
      status: 'error',
      error: error.message,
    });
  }
});
