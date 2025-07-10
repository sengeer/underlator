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

    if (event.isBlockTranslation) {
      const texts = event.text.split(event.delimiter);
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (!text.trim()) {

          parentPort.postMessage({
            status: 'block-chunk',
            data: { idx: i, text: '' },
          });
          continue;
        }
        const output = await translator(text);
        const translatedText = output[0].translation_text;
        parentPort.postMessage({
          status: 'block-chunk',
          data: { idx: i, text: translatedText },
        });
      }
      parentPort.postMessage({ status: 'block-complete' });
    } else {
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
    }
  } catch (error) {
    // We send an error if something goes wrong.
    const status = event.isBlockTranslation ? 'block-error' : 'error';
    parentPort.postMessage({
      status: status,
      error: error.message,
    });
  }
});
