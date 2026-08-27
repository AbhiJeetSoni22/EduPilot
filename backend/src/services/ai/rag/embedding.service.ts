import { EmbeddingProvider } from './embedding-provider.interface';
import { geminiEmbeddingProvider, GeminiEmbeddingProvider } from './gemini-embedding.provider';

export class EmbeddingService {
  private provider: EmbeddingProvider;

  constructor(provider?: EmbeddingProvider) {
    this.provider = provider || geminiEmbeddingProvider;
  }

  public setProvider(provider: EmbeddingProvider): void {
    this.provider = provider;
  }

  public getProvider(): EmbeddingProvider {
    return this.provider;
  }

  public async embedQuery(text: string): Promise<number[]> {
    return this.provider.embedQuery(text);
  }

  public async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.provider.embedDocuments(texts);
  }

  public getDimensions(): number {
    return this.provider.getDimensions();
  }

  public getModelName(): string {
    return this.provider.getModelName();
  }
}

export const embeddingService = new EmbeddingService();
export { EmbeddingProvider, GeminiEmbeddingProvider };
