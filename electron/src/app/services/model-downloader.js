const fs = require('fs').promises;
const path = require('path');
const https = require('https');

/**
 * Service for downloading and managing machine translation models
 */

class ModelDownloader {
  // Configuration of available models
  static AVAILABLE_MODELS = {
    'opus-mt-en-ru': {
      name: 'opus-mt-en-ru',
      displayName: 'English to Russian',
      huggingfaceRepo: 'Xenova/opus-mt-en-ru',
      files: [
        'config.json',
        'generation_config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'vocab.json',
        'onnx/decoder_model_merged.onnx',
        'onnx/encoder_model.onnx',
      ],
    },
    'opus-mt-ru-en': {
      name: 'opus-mt-ru-en',
      displayName: 'Russian to English',
      huggingfaceRepo: 'Xenova/opus-mt-ru-en',
      files: [
        'config.json',
        'generation_config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'vocab.json',
        'onnx/decoder_model_merged.onnx',
        'onnx/encoder_model.onnx',
      ],
    },
  };

  /**
   * Cross-platform path to the models folder
   * @returns {string} - Path to the models folder
   */

  static getModelsPath() {
    // In development mode, use a local folder
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // In dev mode, use folder relative to electron/src/app
      return path.join(__dirname, '..', 'models');
    }

    // In production mode, use resourcesPath
    if (process.platform === 'darwin') {
      // macOS: Underlator.app/Contents/Resources/app/src/app/models
      return path.join(process.resourcesPath, 'app', 'src', 'app', 'models');
    } else if (process.platform === 'win32') {
      // Windows: resources/app/src/app/models
      return path.join(process.resourcesPath, 'app', 'src', 'app', 'models');
    } else {
      // Linux: resources/app/src/app/models
      return path.join(process.resourcesPath, 'app', 'src', 'app', 'models');
    }
  }

  /**
   * Check availability of all model files
   * @param {string} modelName - Model name
   * @returns {Promise<boolean>} - If all model files exist, returns true
   */

  static async checkModelAvailability(modelName) {
    const modelConfig = this.AVAILABLE_MODELS[modelName];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const modelsPath = this.getModelsPath();
    const modelPath = path.join(modelsPath, modelName);

    try {
      // Checking existence of the model folder
      await fs.access(modelPath);

      // We check all necessary files
      for (const file of modelConfig.files) {
        const filePath = path.join(modelPath, file);
        await fs.access(filePath);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check availability of all available models
   * @returns {Promise<Object>} - An object with Boolean status of each model
   */

  static async checkAllModelsAvailability() {
    const results = {};

    for (const modelName of Object.keys(this.AVAILABLE_MODELS)) {
      results[modelName] = await this.checkModelAvailability(modelName);
    }

    return results;
  }

  /**
   * Downloads a file from HuggingFace Hub
   * @param {string} url - File URL
   * @param {string} filePath - Path to save file
   * @param {Function} onProgress - Callback for tracking progress
   * @returns {Promise<void>}
   */

  static async downloadFile(url, filePath, onProgress) {
    return new Promise((resolve, reject) => {
      // HTTP request processing
      const request = https.get(url, (response) => {
        // Recursively call itself with a new URL from Location header
        if (response.statusCode === 302 || response.statusCode === 301) {
          return this.downloadFile(
            response.headers.location,
            filePath,
            onProgress
          )
            .then(resolve)
            .catch(reject);
        }

        // Reject a promise for any statuses other than 200 OK
        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
          return;
        }

        // Determine file size
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        // Create a folder if it does not exist
        const dir = path.dirname(filePath);
        fs.mkdir(dir, { recursive: true })
          .then(() => {
            // Open a stream for writing to disk
            const fileStream = require('fs').createWriteStream(filePath);

            // Update downloaded byte counter and call onProgress by transmitting current data
            response.on('data', (chunk) => {
              downloadedSize += chunk.length;
              if (onProgress && totalSize) {
                onProgress({
                  downloadedSize,
                  totalSize,
                  progress: (downloadedSize / totalSize) * 100,
                });
              }
            });

            // Send HTTP response data to a file stream
            response.pipe(fileStream);

            // Completing download
            fileStream.on('finish', () => {
              fileStream.close();
              resolve();
            });

            fileStream.on('error', (error) => {
              // Delete a partially uploaded file
              fs.unlink(filePath).catch(() => {}); // Hide deletion errors
              reject(error);
            });
          })
          .catch(reject);
      });

      // After 60 seconds without response: destroy connection and reject promise with timeout error
      request.on('error', reject);
      request.setTimeout(60000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Downloads a model from HuggingFace Hub
   * @param {string} modelName - Model name
   * @param {Function} onProgress - Callback for tracking progress
   * @returns {Promise<void>}
   */

  static async downloadModel(modelName, onProgress) {
    // Checking existence of model in configuration
    const modelConfig = this.AVAILABLE_MODELS[modelName];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const modelsPath = this.getModelsPath();
    const modelPath = path.join(modelsPath, modelName);

    // Create a folder with the model
    await fs.mkdir(modelPath, { recursive: true });

    const encodedRepo = encodeURIComponent(modelConfig.huggingfaceRepo);
    const baseUrl = `https://huggingface.co/${encodedRepo}/resolve/main/`;

    const totalFiles = modelConfig.files.length;
    let completedFiles = 0;
    let totalDownloadedSize = 0;
    let totalModelSize = 0;

    // Get sizes of all files for progress
    const fileSizes = {};
    for (const file of modelConfig.files) {
      const fileUrl = new URL(file, baseUrl).toString();

      try {
        const size = await this.getFileSize(fileUrl);
        fileSizes[file] = size;
        totalModelSize += size;
      } catch (error) {
        console.warn(`Could not get size for ${file}:`, error.message);
        fileSizes[file] = 0;
      }
    }

    // Upload files sequentially
    for (const file of modelConfig.files) {
      const fileUrl = new URL(file, baseUrl).toString();

      const filePath = path.join(modelPath, file);

      // Calculating progress
      try {
        await this.downloadFile(fileUrl, filePath, (fileProgress) => {
          const previousFilesSize =
            totalDownloadedSize - (fileProgress.downloadedSize || 0);
          const overallDownloaded =
            previousFilesSize + (fileProgress.downloadedSize || 0);

          if (onProgress) {
            onProgress({
              modelName,
              currentFile: file,
              fileProgress: fileProgress.progress || 0,
              overallProgress:
                totalModelSize > 0
                  ? (overallDownloaded / totalModelSize) * 100
                  : 0,
              completedFiles,
              totalFiles,
              downloadedSize: overallDownloaded,
              totalSize: totalModelSize,
            });
          }
        });

        // Updating counters after uploading
        totalDownloadedSize += fileSizes[file] || 0;
        completedFiles++;

        // Final progress
        if (onProgress) {
          onProgress({
            modelName,
            currentFile: file,
            fileProgress: 100,
            overallProgress:
              totalModelSize > 0
                ? (totalDownloadedSize / totalModelSize) * 100
                : 0,
            completedFiles,
            totalFiles,
            downloadedSize: totalDownloadedSize,
            totalSize: totalModelSize,
          });
        }
      } catch (error) {
        // Delete a partially uploaded model in case of an error
        await fs.rmdir(modelPath, { recursive: true }).catch(() => {}); // Hide deletion errors

        throw new Error(`Failed to download ${file}: ${error.message}`);
      }
    }
  }

  /**
   * Get file size by URL
   * @param {string} url - File URL
   * @returns {Promise<number>} - File size in bytes
   */

  static async getFileSize(url) {
    const parsed = new URL(url);
    const httpModule = parsed.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      // HEAD request
      const request = httpModule.request(
        url,
        { method: 'HEAD' }, // Metadata only
        (response) => {
          // Recursively calls itself for a new URL from Location
          if (response.statusCode === 302 || response.statusCode === 301) {
            return this.getFileSize(response.headers.location)
              .then(resolve)
              .catch(reject);
          }

          // If successful, return size
          if (response.statusCode === 200) {
            const size = parseInt(response.headers['content-length'], 10);
            resolve(size || 0);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        }
      );

      // After 10 seconds without response: destroy connection and reject promise with timeout error
      request.on('error', reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Timeout getting file size'));
      });
      request.end();
    });
  }

  /**
   * Delete a model
   * @param {string} modelName - Model name
   * @returns {Promise<void>}
   */

  static async deleteModel(modelName) {
    if (!this.AVAILABLE_MODELS[modelName]) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const modelsPath = this.getModelsPath();
    const modelPath = path.join(modelsPath, modelName);

    try {
      await fs.rmdir(modelPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get a list of all available models
   * @returns {Object} - Configuration of all available models
   */

  static getAvailableModels() {
    return { ...this.AVAILABLE_MODELS };
  }

  /**
   * Formats file size
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size
   */

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = ModelDownloader;
