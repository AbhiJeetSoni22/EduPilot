import { config } from '../../config/env';

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export class GeminiService {
  private apiKey: string;
  private primaryModel: string;
  private fallbackModels: string[] = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

  constructor() {
    this.apiKey = config.geminiApiKey;
    this.primaryModel = config.geminiModel || 'gemini-1.5-flash';
  }

  public isConfigured(): boolean {
    const key = this.apiKey || config.geminiApiKey;
    return Boolean(
      key &&
      key.length > 20 &&
      !key.includes('placeholder') &&
      !key.includes('your_api_key') &&
      process.env.DISABLE_GEMINI !== 'true'
    );
  }

  /**
   * Calls Gemini REST endpoint to generate text or structured JSON
   */
  public async generateContent(
    prompt: string,
    options: GeminiGenerateOptions = {}
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured in backend environment');
    }

    const {
      systemInstruction,
      responseMimeType = 'application/json',
      temperature = 0.1,
      maxOutputTokens = 1024,
      timeoutMs = 6000,
    } = options;

    const candidateModels = [this.primaryModel, ...this.fallbackModels];
    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const payload: Record<string, unknown> = {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens,
            responseMimeType,
          },
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const errMsg = errorBody?.error?.message || `HTTP ${response.status}`;
          throw new Error(`Gemini model ${model} returned error: ${errMsg}`);
        }

        const data = await response.json();
        const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (typeof textResponse !== 'string' || !textResponse.trim()) {
          throw new Error(`Empty response returned by Gemini model ${model}`);
        }

        return textResponse.trim();
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Continue to fallback model if not an abort / critical error
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error(`Gemini request timed out after ${timeoutMs}ms`);
        }
      }
    }

    throw lastError || new Error('All Gemini models failed to generate content');
  }

  /**
   * Synthesize a factual, grounded natural-language answer given retrieved academic facts
   */
  public async generateGroundedAnswer(
    userQuestion: string,
    groundedContext: string,
    systemTone: string = 'You are the official EduPilot Academic Assistant. Answer authoritatively, clearly, and concisely based strictly on the provided verified academic facts. Do not invent any unverified information.'
  ): Promise<string> {
    const prompt = `VERIFIED INSTITUTIONAL FACTS:
${groundedContext}

STUDENT QUESTION:
${userQuestion}

Please provide a helpful, concise, bulleted answer referencing only the verified facts above.`;

    return this.generateContent(prompt, {
      systemInstruction: systemTone,
      responseMimeType: 'text/plain',
      temperature: 0.2,
      maxOutputTokens: 1024,
    });
  }
}

export const geminiService = new GeminiService();
