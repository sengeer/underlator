// This file (worker.js) contains all the logic for loading the model and running predictions
const { parentPort } = require('worker_threads');
const TranslationPipeline = require('./model');

// Message handler for workflow
parentPort.on('message', async event => {
  try {
    let translator = await TranslationPipeline.getInstance(
      event.translate,
      x => {
        parentPort.postMessage({ status: 'progress', data: x });
      }
    );

    const output = await translator(event.text);
    const translatedText = output[0].translation_text;

    parentPort.postMessage({
      status: 'message',
      data: translatedText,
    });

    parentPort.postMessage({ status: 'complete' });
  } catch (error) {
    // We send an error if something goes wrong
    parentPort.postMessage({
      status: 'error',
      error: error.message,
    });
  }
});
