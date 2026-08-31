import mongoose from 'mongoose';
import { QueryAnalysis } from '../../../types/query-analysis.types';
import { QueryContext } from '../../../types/query-context';
import { HandlerResult } from './direct.handler';
import { embeddingService } from '../rag/embedding.service';
import { vectorSearchService, VectorSearchFilters } from '../rag/vector-search.service';
import { ragResponseService } from '../rag/rag-response.service';
import { Department } from '../../../models/department.model';
import { Program } from '../../../models/program.model';
import { ParameterValidator } from '../parameter-validator';

export class VectorHandler {
  /**
   * Handles vector-based semantic retrieval and grounded RAG answer generation.
   */
  public async handle(
    userMessage: string,
    analysis: QueryAnalysis,
    existingContext: QueryContext = {}
  ): Promise<HandlerResult> {
    const { intent, entities } = analysis;

    if (!userMessage || !userMessage.trim()) {
      return {
        response: 'Please provide a valid question to search the institutional knowledge base.',
        data: { strategy: 'vector', intent, chunksRetrieved: 0 },
      };
    }

    try {
      // 1. Construct available metadata filters safely without inventing missing fields
      const filters = await this.buildFilters(entities, existingContext, intent);

      // 2. Generate 768-dimensional query embedding
      const queryVector = await embeddingService.embedQuery(userMessage.trim());

      if (!Array.isArray(queryVector) || queryVector.length !== 768) {
        throw new Error(
          `Embedding dimension mismatch: expected 768 dimensions, received ${queryVector?.length || 0}`
        );
      }

      // 3. Execute Atlas Vector Search ($vectorSearch stage targeting knowledge_chunks_vector_index)
      const results = await vectorSearchService.search(queryVector, filters, {
        limit: 5,
        numCandidates: 50,
      });

      // 4. Handle No-Result Case deterministically without hallucination
      if (!results || results.length === 0) {
        return {
          response: "I couldn't find this information in the available official EduPilot documents.",
          data: {
            strategy: 'vector',
            intent,
            chunksRetrieved: 0,
            citations: [],
            chunks: [],
          },
        };
      }

      // 5. Generate Grounded RAG Answer using only retrieved institutional document chunks
      const ragResult = await ragResponseService.generateRAGResponse(userMessage, results);

      return {
        response: ragResult.response,
        data: {
          strategy: 'vector',
          intent,
          chunksRetrieved: results.length,
          citations: ragResult.citations,
          chunks: results.map((r) => ({
            documentId: r.documentId,
            chunkIndex: r.chunkIndex,
            pageNumber: r.pageNumber,
            score: r.score,
            metadata: r.metadata,
          })),
        },
      };
    } catch (err: unknown) {
      console.error('[VectorHandler] Vector RAG retrieval failed:', err);
      const safeError =
        err instanceof Error ? err.message : 'An error occurred during knowledge retrieval';

      return {
        response:
          "I encountered an issue searching the official documents for this topic. " +
          "Please check back shortly or consult your departmental coordinator.",
        data: {
          strategy: 'vector',
          intent,
          error: safeError,
          chunksRetrieved: 0,
        },
      };
    }
  }

  /**
   * Constructs VectorSearchFilters using available entities.
   * Resolves human-readable department/program codes to ObjectIds if DB is connected.
   */
  public async buildFilters(
    entities: QueryAnalysis['entities'] = {},
    context: QueryContext = {},
    intent?: string
  ): Promise<VectorSearchFilters | undefined> {
    const filters: VectorSearchFilters = {};
    let hasFilter = false;

    // 1. Department Filter
    const rawDept = entities.department || context.department;
    if (rawDept && typeof rawDept === 'string' && rawDept.trim()) {
      const cleanDept = rawDept.trim();
      if (mongoose.Types.ObjectId.isValid(cleanDept)) {
        filters.department = cleanDept;
        hasFilter = true;
      } else if (mongoose.connection.readyState === 1) {
        try {
          const deptDoc = await Department.findOne({
            $or: [
              { code: new RegExp(`^${ParameterValidator.escapeRegex(cleanDept)}$`, 'i') },
              { name: new RegExp(ParameterValidator.escapeRegex(cleanDept), 'i') },
            ],
          });
          if (deptDoc) {
            filters.department = deptDoc._id;
            hasFilter = true;
          }
        } catch {
          // Do not force or guess if lookup fails
        }
      }
    }

    // 2. Program Filter
    const rawProg = entities.program || context.program;
    if (rawProg && typeof rawProg === 'string' && rawProg.trim()) {
      const cleanProg = rawProg.trim();
      if (mongoose.Types.ObjectId.isValid(cleanProg)) {
        filters.program = cleanProg;
        hasFilter = true;
      } else if (mongoose.connection.readyState === 1) {
        try {
          const progDoc = await Program.findOne({
            $or: [
              { code: new RegExp(`^${ParameterValidator.escapeRegex(cleanProg)}$`, 'i') },
              { name: new RegExp(ParameterValidator.escapeRegex(cleanProg), 'i') },
            ],
          });
          if (progDoc) {
            filters.program = progDoc._id;
            hasFilter = true;
          }
        } catch {
          // Do not force or guess if lookup fails
        }
      }
    }

    // 3. Semester Filter
    const rawSem = entities.semester !== undefined && entities.semester !== null ? entities.semester : context.semester;
    if (rawSem !== undefined && rawSem !== null) {
      const semNum = Number(rawSem);
      if (!isNaN(semNum) && semNum >= 1 && semNum <= 12) {
        filters.semester = semNum;
        hasFilter = true;
      }
    }

    // 4. Subject Code Filter
    const rawSubjCode = entities.subjectCode;
    if (rawSubjCode && typeof rawSubjCode === 'string' && rawSubjCode.trim()) {
      filters.subjectCode = rawSubjCode.trim().toUpperCase();
      hasFilter = true;
    }

    // 5. Academic Year Filter
    const rawYear = entities.academicYear || context.academicYear;
    if (rawYear && typeof rawYear === 'string' && /^\d{4}-\d{2,4}$/.test(rawYear.trim())) {
      filters.academicYear = rawYear.trim();
      hasFilter = true;
    }

    // 6. Document Type Filter (only if specific intent warrants it)
    if (intent === 'attendance_policy') {
      filters.documentType = 'attendance_policy';
      hasFilter = true;
    } else if (intent === 'grading_policy') {
      filters.documentType = 'grading_policy';
      hasFilter = true;
    }

    return hasFilter ? filters : undefined;
  }
}

export const vectorHandler = new VectorHandler();
