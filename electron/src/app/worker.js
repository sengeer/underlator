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

    // We perform translation.
    let output = await translator(event.text, {
      callback_function: (x) => {
        parentPort.postMessage({
          status: 'update',
          output: translator.tokenizer.decode(x[0].output_token_ids, {
            skip_special_tokens: true,
          }),
        });
      },
    });

    // We send result
    parentPort.postMessage({
      status: 'complete',
      output: output,
    });
  } catch (error) {
    // We send an error if something goes wrong.
    parentPort.postMessage({
      status: 'error',
      error: error.message,
    });
  }
});
