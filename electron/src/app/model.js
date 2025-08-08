const path = require('path');
const ModelDownloader = require('./services/model-downloader');

class TranslationPipeline {
  // NOTE: Replace this with your own task and model
  static task = 'translation';
  static model = 'opus-mt-en-ru';
  static instance = null;

  static async getInstance(
    translateLanguage = 'en-ru',
    progress_callback = null
  ) {
    const modelName = `opus-mt-${translateLanguage}`;

    if (
      this.instance === null ||
      this.model !== modelName
    ) {
      // Check availability of model before initialization
      const isModelAvailable =
        await ModelDownloader.checkModelAvailability(modelName);

      if (!isModelAvailable) {
        throw new Error(
          `Model ${modelName} is not available. Please download it first.`
        );
      }

      // Dynamically import the Transformers.js library
      let { pipeline, env } = await import('@huggingface/transformers');

      // Search model locally
      env.cacheDir = ModelDownloader.getModelsPath();
      env.allowRemoteModels = false;

      this.model = modelName;
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

module.exports = TranslationPipeline;
