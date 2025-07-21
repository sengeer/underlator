import { OLLAMA_API_BASE_URL } from '../../lib/constants';

// Generate prompt
export class OllamaApi {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || OLLAMA_API_BASE_URL;
  }

  generatePrompt = async (model: string, prompt: string) => {
    let error = null;

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
      }),
    }).catch((err) => {
      console.error(err);
      if ('detail' in err) {
        error = err.detail;
      }
      return null;
    });

    if (error) {
      throw error;
    }

    return res;
  };
}
