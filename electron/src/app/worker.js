// This file (worker.js) contains all the logic for loading the model and running predictions.
const { parentPort } = require('worker_threads');
const path = require('path');

class TranslationPipeline {
  // NOTE: Replace this with your own task and model
  static task = 'translation';
  static model = 'Xenova/nllb-200-distilled-600M';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Dynamically import the Transformers.js library
      let { pipeline, env } = await import('@xenova/transformers');

      // NOTE: Uncomment this to change the cache directory
      // env.cacheDir = './.cache';

      // Search model locally
      env.localModelPath = path.join(__dirname, 'models');
      env.allowRemoteModels = false;

      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

// Message handler for workflow
parentPort.on('message', async (event) => {
  try {
    let translator = await TranslationPipeline.getInstance((x) => {
      parentPort.postMessage({ status: 'progress', data: x });
    });

    // We perform translation
    let output = await translator(event.text, {
      tgt_lang: event.tgt_lang,
      src_lang: event.src_lang,
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
    // We send an error if something goes wrong
    parentPort.postMessage({
      status: 'error',
      error: error.message,
    });
  }
});
