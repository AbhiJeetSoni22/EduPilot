import mongoose from 'mongoose';
import { KnowledgeChunk, IKnowledgeChunk, IChunkMetadata } from '../../../models/knowledge-chunk.model';
import { config } from '../../../config/env';

export interface VectorSearchFilters {
  department?: mongoose.Types.ObjectId | string;
  program?: mongoose.Types.ObjectId | string;
  semester?: number;
  subjectCode?: string;
  academicYear?: string;
  documentType?: string;
}

export interface VectorSearchOptions {
  limit?: number;
  numCandidates?: number;
  minScore?: number;
}

export interface VectorSearchResult {
  _id: string;
  documentId: string;
  text: string;
  chunkIndex: number;
  pageNumber?: number;
  metadata: IChunkMetadata;
  score: number;
}

export class VectorSearchService {
  private indexName = 'knowledge_chunks_vector_index';
  private expectedDimensions = config.geminiEmbeddingDimensions || 768;

  public getIndexName(): string {
    return this.indexName;
  }

  /**
   * Constructs the MongoDB Atlas $vectorSearch aggregation pipeline stage.
   */
  public buildVectorSearchStage(
    queryVector: number[],
    filters?: VectorSearchFilters,
    options: VectorSearchOptions = {}
  ): Record<string, unknown> {
    this.validateQueryVector(queryVector);

    const limit = options.limit || 5;
    const numCandidates = options.numCandidates || Math.max(limit * 10, 50);

    const vectorSearchStage: Record<string, unknown> = {
      index: this.indexName,
      path: 'embedding',
      queryVector,
      numCandidates,
      limit,
    };

    const filterObj = this.buildFilterObject(filters);
    if (filterObj && Object.keys(filterObj).length > 0) {
      vectorSearchStage.filter = filterObj;
    }

    return { $vectorSearch: vectorSearchStage };
  }

  /**
   * Constructs the MongoDB pre-filter object using available metadata filters.
   */
  public buildFilterObject(filters?: VectorSearchFilters): Record<string, unknown> | null {
    if (!filters) return null;

    const conditions: Record<string, unknown> = {};

    if (filters.department) {
      conditions['metadata.department'] =
        typeof filters.department === 'string' && mongoose.Types.ObjectId.isValid(filters.department)
          ? new mongoose.Types.ObjectId(filters.department)
          : filters.department;
    }

    if (filters.program) {
      conditions['metadata.program'] =
        typeof filters.program === 'string' && mongoose.Types.ObjectId.isValid(filters.program)
          ? new mongoose.Types.ObjectId(filters.program)
          : filters.program;
    }

    if (filters.semester !== undefined && filters.semester !== null) {
      conditions['metadata.semester'] = Number(filters.semester);
    }

    if (filters.subjectCode) {
      conditions['metadata.subjectCode'] = filters.subjectCode.trim().toUpperCase();
    }

    if (filters.academicYear) {
      conditions['metadata.academicYear'] = filters.academicYear.trim();
    }

    if (filters.documentType) {
      conditions['metadata.documentType'] = filters.documentType.trim();
    }

    return Object.keys(conditions).length > 0 ? conditions : null;
  }

  /**
   * Executes a vector search using MongoDB Atlas Vector Search.
   */
  public async search(
    queryVector: number[],
    filters?: VectorSearchFilters,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    this.validateQueryVector(queryVector);

    const vectorSearchStage = this.buildVectorSearchStage(queryVector, filters, options);

    const pipeline: mongoose.PipelineStage[] = [
      vectorSearchStage as unknown as mongoose.PipelineStage,
      {
        $project: {
          _id: 1,
          documentId: 1,
          text: 1,
          chunkIndex: 1,
          pageNumber: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      } as unknown as mongoose.PipelineStage,
    ];

    try {
      const results = await KnowledgeChunk.aggregate(pipeline);

      return results.map((item) => ({
        _id: item._id.toString(),
        documentId: item.documentId?.toString() || '',
        text: item.text,
        chunkIndex: item.chunkIndex,
        pageNumber: item.pageNumber,
        metadata: item.metadata,
        score: typeof item.score === 'number' ? item.score : 1.0,
      }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);

      // Handle standalone local MongoDB environments in dev/tests where Atlas Vector Search index is not present
      if (
        errMsg.includes('$vectorSearch is not allowed') ||
        errMsg.includes('Unrecognized pipeline stage') ||
        errMsg.includes('vectorSearch')
      ) {
        return this.localCosineFallbackSearch(queryVector, filters, options);
      }

      throw new Error(`Atlas Vector Search failed: ${errMsg}`);
    }
  }

  private validateQueryVector(queryVector: number[]): void {
    if (!Array.isArray(queryVector)) {
      throw new Error('Query vector must be an array of numbers');
    }
    if (queryVector.length !== this.expectedDimensions) {
      throw new Error(
        `Query vector dimension mismatch: expected ${this.expectedDimensions}, but received ${queryVector.length}`
      );
    }
  }

  /**
   * Fallback search for standalone local dev/test runners when testing without a live Atlas index.
   */
  private async localCosineFallbackSearch(
    queryVector: number[],
    filters?: VectorSearchFilters,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const mongoFilter: Record<string, unknown> = {};
    const filterObj = this.buildFilterObject(filters);
    if (filterObj) {
      Object.assign(mongoFilter, filterObj);
    }

    const chunks = await KnowledgeChunk.find(mongoFilter).limit(options.numCandidates || 100);

    const scored = chunks.map((chunk) => {
      const sim = this.cosineSimilarity(queryVector, chunk.embedding);
      return {
        _id: chunk._id.toString(),
        documentId: chunk.documentId?.toString() || '',
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        metadata: chunk.metadata,
        score: sim,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, options.limit || 5);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }
}

export const vectorSearchService = new VectorSearchService();
