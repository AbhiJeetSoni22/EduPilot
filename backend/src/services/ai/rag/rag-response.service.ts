import mongoose from 'mongoose';
import { AcademicDocument } from '../../../models/document.model';
import { IChunkMetadata } from '../../../models/knowledge-chunk.model';
import { VectorSearchResult } from './vector-search.service';
import { geminiService } from '../gemini.service';

export interface Citation {
  documentId: string;
  title: string;
  pageNumber?: number;
  chunkIndex?: number;
  score?: number;
}

export interface GroundedRAGResult {
  response: string;
  citations: Citation[];
  usedChunksCount: number;
}

export class RagResponseService {
  /**
   * Generates a strictly grounded natural-language answer using retrieved knowledge chunks.
   */
  public async generateRAGResponse(
    userMessage: string,
    chunks: VectorSearchResult[]
  ): Promise<GroundedRAGResult> {
    // 1. Anti-hallucination check: If no chunks retrieved, return deterministic not-found response
    if (!chunks || chunks.length === 0) {
      return {
        response: "I couldn't find this information in the available official EduPilot documents.",
        citations: [],
        usedChunksCount: 0,
      };
    }

    // 2. Resolve human-readable document titles
    const docTitleMap = await this.resolveDocumentTitles(chunks);

    // 3. Build citations list
    const citations: Citation[] = chunks.map((c) => {
      const resolvedTitle =
        docTitleMap.get(c.documentId) ||
        this.formatFallbackTitle(c.metadata) ||
        'Official Academic Document';

      return {
        documentId: c.documentId,
        title: resolvedTitle,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        score: c.score,
      };
    });

    // 4. Construct Institutional Context
    const institutionalContext = chunks
      .map((c, idx) => {
        const citation = citations[idx];
        const pageInfo = c.pageNumber ? ` | Page ${c.pageNumber}` : '';
        const scoreInfo = typeof c.score === 'number' ? ` | Relevance: ${c.score.toFixed(3)}` : '';
        return `[DOCUMENT EXCERPT ${idx + 1}: ${citation.title}${pageInfo}${scoreInfo}]\n${c.text.trim()}`;
      })
      .join('\n\n---\n\n');

    // 5. Build Grounded Prompt
    const systemInstruction =
      'You are the official EduPilot Academic Assistant. ' +
      'Answer the student question clearly, accurately, and authoritatively based STRICTLY on the provided institutional document excerpts. ' +
      'RULES:\n' +
      '1. Answer strictly from the provided institutional excerpts. Do not use outside or general knowledge.\n' +
      '2. Do not invent facts, rules, dates, percentages, or policies.\n' +
      '3. If the provided excerpts do not contain enough information to answer the question, explicitly state that the available official documents do not provide this information.\n' +
      '4. Keep the answer clear, structured, and student-friendly.';

    const prompt =
      `INSTITUTIONAL DOCUMENT CONTEXT:\n` +
      `${institutionalContext}\n\n` +
      `STUDENT QUESTION:\n` +
      `${userMessage}\n\n` +
      `Please provide a helpful, concise, well-structured answer using ONLY the verified facts from the institutional documents above.`;

    let generatedAnswer = '';

    // 6. Invoke Gemini if configured
    if (geminiService.isConfigured()) {
      try {
        const aiResponse = await geminiService.generateContent(prompt, {
          systemInstruction,
          responseMimeType: 'text/plain',
          temperature: 0.1,
          maxOutputTokens: 1024,
        });

        if (aiResponse && aiResponse.trim()) {
          generatedAnswer = aiResponse.trim();
        }
      } catch (err) {
        console.warn('[RagResponseService] Gemini generation failed, falling back to deterministic synthesis:', err);
      }
    }

    // 7. Deterministic Fallback if Gemini is not configured or fails
    if (!generatedAnswer) {
      generatedAnswer = this.formatDeterministicAnswer(chunks, citations);
    }

    // 8. Append formatted citation block
    const formattedCitations = this.formatCitationBlock(citations);
    const fullResponse = `${generatedAnswer}\n\n${formattedCitations}`;

    return {
      response: fullResponse,
      citations,
      usedChunksCount: chunks.length,
    };
  }

  /**
   * Resolves human-readable document titles from AcademicDocument collection.
   */
  private async resolveDocumentTitles(
    chunks: VectorSearchResult[]
  ): Promise<Map<string, string>> {
    const titleMap = new Map<string, string>();
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return titleMap;
    }

    const uniqueDocIds = Array.from(
      new Set(
        chunks
          .map((c) => c.documentId)
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      )
    );

    if (uniqueDocIds.length === 0) {
      return titleMap;
    }

    try {
      const docs = await AcademicDocument.find({
        _id: { $in: uniqueDocIds.map((id) => new mongoose.Types.ObjectId(id)) },
      }).select('title originalFileName documentType');

      for (const doc of docs) {
        titleMap.set(doc._id.toString(), doc.title || doc.originalFileName);
      }
    } catch (err) {
      console.warn('[RagResponseService] Failed to query document titles:', err);
    }

    return titleMap;
  }

  /**
   * Formats a fallback title from chunk metadata if document title is not found in DB.
   */
  private formatFallbackTitle(metadata?: IChunkMetadata | Record<string, unknown>): string | null {
    if (!metadata) return null;

    const meta = metadata as Record<string, unknown>;
    if (typeof meta.sectionTitle === 'string' && meta.sectionTitle.trim()) {
      return meta.sectionTitle.trim();
    }

    if (typeof meta.subjectName === 'string' && meta.subjectName.trim()) {
      return `${meta.subjectName} Syllabus`;
    }

    if (typeof meta.documentType === 'string' && meta.documentType.trim()) {
      return meta.documentType
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    return null;
  }

  /**
   * Formats a clean, deduplicated student-facing citation section.
   */
  public formatCitationBlock(citations: Citation[]): string {
    if (!citations || citations.length === 0) {
      return '';
    }

    // Deduplicate by title and page number
    const seen = new Set<string>();
    const uniqueCitations: string[] = [];

    for (const c of citations) {
      const pageText = c.pageNumber ? ` — Page ${c.pageNumber}` : '';
      const key = `${c.title}${pageText}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCitations.push(`• **${c.title}**${pageText}`);
      }
    }

    return `📖 **Sources:**\n${uniqueCitations.join('\n')}`;
  }

  /**
   * Deterministic grounded synthesis when LLM is unavailable.
   */
  private formatDeterministicAnswer(
    chunks: VectorSearchResult[],
    citations: Citation[]
  ): string {
    const topChunk = chunks[0];
    const topCitation = citations[0];
    const pageText = topChunk.pageNumber ? ` (Page ${topChunk.pageNumber})` : '';

    return (
      `Based on the official institutional document **${topCitation?.title || 'Academic Records'}**${pageText}:\n\n` +
      `${topChunk.text.trim()}`
    );
  }
}

export const ragResponseService = new RagResponseService();
