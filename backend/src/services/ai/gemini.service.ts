import { config } from '../../config/env';

export type GeminiErrorCategory =
  | 'timeout'
  | 'rate_limit'
  | 'server_error'
  | 'authentication'
  | 'invalid_request'
  | 'network_error'
  | 'unknown';

export interface GeminiGenerateOptions {
  model?: string;
  operation?: string;
  systemInstruction?: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export class GeminiService {
  private apiKey: string;
  private defaultQueryModel: string;
  private defaultRagModel: string;
  private defaultQueryTimeoutMs: number;
  private defaultRagTimeoutMs: number;
  private defaultMaxRetries: number;

  constructor() {
    this.apiKey = config.geminiApiKey;
    this.defaultQueryModel = config.queryAnalyzerModel || 'gemini-3.6-flash';
    this.defaultRagModel = config.ragGenerationModel || 'gemini-3.7-flash';
    this.defaultQueryTimeoutMs = config.geminiQueryTimeoutMs || 15000;
    this.defaultRagTimeoutMs = config.geminiGenerationTimeoutMs || 20000;
    this.defaultMaxRetries = config.geminiMaxRetries ?? 1;
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

  public getQueryAnalyzerModel(): string {
    return this.defaultQueryModel;
  }

  public getRagGenerationModel(): string {
    return this.defaultRagModel;
  }

  public getQueryTimeoutMs(): number {
    return this.defaultQueryTimeoutMs;
  }

  public getRagTimeoutMs(): number {
    return this.defaultRagTimeoutMs;
  }

  public getMaxRetries(): number {
    return this.defaultMaxRetries;
  }

  /**
   * Classifies an error into transient vs permanent categories
   */
  public classifyError(err: unknown, statusCode?: number): { category: GeminiErrorCategory; isTransient: boolean; message: string } {
    const message = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.name : '';

    if (errName === 'AbortError' || /timed?\s*out/i.test(message)) {
      return { category: 'timeout', isTransient: true, message: 'Request timed out' };
    }

    if (statusCode === 429 || /429|rate\s*limit|quota|high\s*demand|resource_exhausted/i.test(message)) {
      return { category: 'rate_limit', isTransient: true, message: 'Rate limit or high service demand' };
    }

    if (
      (statusCode !== undefined && statusCode >= 500 && statusCode < 600) ||
      /500|502|503|504|internal\s*error|service\s*unavailable|server\s*error/i.test(message)
    ) {
      return { category: 'server_error', isTransient: true, message: 'Temporary server failure' };
    }

    if (
      statusCode === 401 ||
      statusCode === 403 ||
      /api_key_invalid|permission_denied|unauthenticated|forbidden|invalid\s*api\s*key/i.test(message)
    ) {
      return { category: 'authentication', isTransient: false, message: 'Authentication or permission failure' };
    }

    if (
      statusCode === 400 ||
      statusCode === 404 ||
      /invalid_argument|not_found|model.*not\s*found|unsupported/i.test(message)
    ) {
      return { category: 'invalid_request', isTransient: false, message: 'Invalid request or unsupported model' };
    }

    if (/fetch\s*failed|econnrefused|enotfound|etimedout|network/i.test(message)) {
      return { category: 'network_error', isTransient: true, message: 'Network connectivity error' };
    }

    return { category: 'unknown', isTransient: false, message };
  }

  /**
   * Calls Gemini REST endpoint to generate text or structured JSON with bounded retry backoff
   */
  public async generateContent(
    prompt: string,
    options: GeminiGenerateOptions = {}
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured in backend environment');
    }

    const {
      model = this.defaultQueryModel,
      operation = 'content-generation',
      systemInstruction,
      responseMimeType = 'application/json',
      temperature = 0.1,
      maxOutputTokens = 1024,
      timeoutMs = this.defaultQueryTimeoutMs,
      maxRetries = this.defaultMaxRetries,
    } = options;

    const totalAttempts = 1 + Math.max(0, maxRetries);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
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
          const classification = this.classifyError(new Error(errMsg), response.status);

          console.warn(
            `[GeminiService] Request failed | model=${model} operation=${operation} attempt=${attempt}/${totalAttempts} reason=${classification.category} timeoutMs=${timeoutMs}`
          );

          if (!classification.isTransient || attempt >= totalAttempts) {
            throw new Error(`Gemini model ${model} returned error: ${errMsg}`);
          }

          // Short exponential backoff before retry (e.g. 500ms)
          const backoffMs = attempt * 500;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        const data = await response.json();
        const parts = (data?.candidates?.[0]?.content?.parts || []) as Array<{ text?: string; thought?: boolean }>;
        const contentParts = parts.filter((p) => !p.thought && typeof p.text === 'string');
        const textResponse = (contentParts.length > 0 ? contentParts : parts).map((p) => p.text || '').join('').trim();

        if (!textResponse) {
          throw new Error(`Empty response returned by Gemini model ${model}`);
        }

        console.info(
          `[GeminiService] Request succeeded | model=${model} operation=${operation} attempt=${attempt}`
        );

        return textResponse.trim();
      } catch (err: unknown) {
        const classification = this.classifyError(err);
        lastError = err instanceof Error ? err : new Error(String(err));

        console.warn(
          `[GeminiService] Request failed | model=${model} operation=${operation} attempt=${attempt}/${totalAttempts} reason=${classification.category} timeoutMs=${timeoutMs}`
        );

        if (!classification.isTransient || attempt >= totalAttempts) {
          throw lastError;
        }

        const backoffMs = attempt * 500;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError || new Error(`Gemini request failed after ${totalAttempts} attempts`);
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
      model: this.defaultRagModel,
      operation: 'grounded-answer',
      systemInstruction: systemTone,
      responseMimeType: 'text/plain',
      temperature: 0.2,
      maxOutputTokens: 1024,
      timeoutMs: this.defaultRagTimeoutMs,
    });
  }
}

export const geminiService = new GeminiService();
