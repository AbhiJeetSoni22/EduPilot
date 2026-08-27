import { config } from '../../../config/env';
import { EmbeddingProvider } from './embedding-provider.interface';

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private modelName: string;
  private dimensions: number;
  private maxBatchSize: number = 50;

  constructor() {
    this.apiKey = config.geminiApiKey;
    this.modelName = config.geminiEmbeddingModel || 'gemini-embedding-001';
    this.dimensions = config.geminiEmbeddingDimensions || 768;
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

  public getDimensions(): number {
    return this.dimensions;
  }

  public getModelName(): string {
    return this.modelName;
  }

  /**
   * Embed a single query string for semantic vector search
   */
  public async embedQuery(text: string): Promise<number[]> {
    if (!text || !text.trim()) {
      throw new Error('Cannot generate embedding for empty query text');
    }

    if (!this.isConfigured()) {
      return this.generateDeterministicMockEmbedding(text);
    }

    try {
      const modelIdentifier = this.normalizeModelIdentifier(this.modelName);
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelIdentifier}:embedContent?key=${this.apiKey}`;

      const payload: Record<string, unknown> = {
        model: modelIdentifier,
        content: {
          parts: [{ text: text.trim() }],
        },
      };

      if (this.dimensions) {
        payload.outputDimensionality = this.dimensions;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        throw new Error(`Gemini embedContent returned error: ${errMsg}`);
      }

      const data = await response.json();
      const values: number[] = data?.embedding?.values;

      if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Gemini API returned an invalid or empty embedding vector');
      }

      this.validateDimensions(values);
      return values;
    } catch (err: unknown) {
      if (process.env.ENABLE_EMBEDDING_FALLBACK === 'true') {
        return this.generateDeterministicMockEmbedding(text);
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Embed multiple document text chunks in efficient batches
   */
  public async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    if (!this.isConfigured()) {
      return texts.map((t) => this.generateDeterministicMockEmbedding(t));
    }

    const allEmbeddings: number[][] = [];
    const modelIdentifier = this.normalizeModelIdentifier(this.modelName);

    // Process in batches of up to maxBatchSize (e.g. 50 chunks)
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      const batchTexts = texts.slice(i, i + this.maxBatchSize);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelIdentifier}:batchEmbedContents?key=${this.apiKey}`;

        const requests = batchTexts.map((txt) => {
          const item: Record<string, unknown> = {
            model: modelIdentifier,
            content: {
              parts: [{ text: txt.trim() }],
            },
          };
          if (this.dimensions) {
            item.outputDimensionality = this.dimensions;
          }
          return item;
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const errMsg = errorBody?.error?.message || `HTTP ${response.status}`;
          throw new Error(`Gemini batchEmbedContents returned error: ${errMsg}`);
        }

        const data = await response.json();
        const rawEmbeddings = data?.embeddings;

        if (!Array.isArray(rawEmbeddings) || rawEmbeddings.length !== batchTexts.length) {
          throw new Error(
            `Gemini batchEmbedContents returned ${rawEmbeddings?.length || 0} embeddings for ${batchTexts.length} inputs`
          );
        }

        for (let idx = 0; idx < rawEmbeddings.length; idx++) {
          const values: number[] = rawEmbeddings[idx]?.values;
          if (!Array.isArray(values)) {
            throw new Error(`Invalid embedding vector at batch index ${idx}`);
          }
          this.validateDimensions(values);
          allEmbeddings.push(values);
        }
      } catch (err: unknown) {
        if (process.env.ENABLE_EMBEDDING_FALLBACK === 'true') {
          const fallbacks = batchTexts.map((t) => this.generateDeterministicMockEmbedding(t));
          allEmbeddings.push(...fallbacks);
        } else {
          throw err instanceof Error ? err : new Error(String(err));
        }
      }
    }

    return allEmbeddings;
  }

  private validateDimensions(values: number[]): void {
    if (values.length !== this.dimensions) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.dimensions}, but received ${values.length}`
      );
    }
  }

  private normalizeModelIdentifier(model: string): string {
    return model.startsWith('models/') ? model : `models/${model}`;
  }

  /**
   * Generates a deterministic 768-dimensional normalized unit vector from text
   * for offline test environments and verified local test fixtures.
   */
  public generateDeterministicMockEmbedding(text: string): number[] {
    const dim = this.dimensions;
    const vector = new Array(dim).fill(0);
    const clean = text.toLowerCase().trim();

    // Deterministic pseudo-random seed from string hash
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }

    let sumSq = 0;
    for (let i = 0; i < dim; i++) {
      // Linear congruential generator per dimension
      const seed = Math.sin(hash + i * 97.13) * 10000;
      const val = seed - Math.floor(seed) - 0.5;
      vector[i] = val;
      sumSq += val * val;
    }

    // Normalize to unit vector for cosine similarity
    const norm = Math.sqrt(sumSq) || 1;
    for (let i = 0; i < dim; i++) {
      vector[i] = vector[i] / norm;
    }

    return vector;
  }
}

export const geminiEmbeddingProvider = new GeminiEmbeddingProvider();
