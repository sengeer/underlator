const path = require('path');

class TranslationPipeline {
  // NOTE: Replace this with your own task and model.
  static task = 'translation';
  static model = 'opus-mt-en-ru';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Dynamically import the Transformers.js library.
      let { pipeline, env } = await import('@xenova/transformers');

      // NOTE: Uncomment this to change the cache directory.
      // env.cacheDir = './.cache';

      // Search model locally.
      env.localModelPath = path.join(__dirname, 'models');
      env.allowRemoteModels = false;

      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

module.exports = TranslationPipeline;