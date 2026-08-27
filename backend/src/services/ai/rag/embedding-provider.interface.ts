export interface EmbeddingProvider {
  /**
   * Generates a vector embedding for a single search query text.
   */
  embedQuery(text: string): Promise<number[]>;

  /**
   * Generates vector embeddings for multiple document chunks efficiently in batch.
   */
  embedDocuments(texts: string[]): Promise<number[][]>;

  /**
   * Returns the vector dimension size expected from this provider (e.g. 768).
   */
  getDimensions(): number;

  /**
   * Returns the model identifier used by the provider.
   */
  getModelName(): string;

  /**
   * Returns whether the provider has valid credentials/configuration.
   */
  isConfigured(): boolean;
}
