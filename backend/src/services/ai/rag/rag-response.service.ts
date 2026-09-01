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

    // 5. Build Grounded Prompt with Controlled Cross-Section Synthesis & Completeness Instructions
    const systemInstruction =
      'You are the official EduPilot Academic Assistant.\n' +
      'Answer the student question clearly, accurately, and authoritatively based STRICTLY on the provided institutional document excerpts.\n\n' +
      'CORE GROUNDING & SYNTHESIS RULES:\n' +
      '1. Strict Document Grounding: Answer ONLY from the provided institutional excerpts. Never use external knowledge, unverified assumptions, or general world knowledge.\n' +
      '2. Complete Question Coverage: Thoroughly address ALL material aspects requested by the student (e.g., eligibility criteria, required documents, fee amounts, deadlines, and approval authorities) that are supported by the retrieved excerpts.\n' +
      '3. General vs. Specialized Policy Synthesis: When a student asks about a specialized policy, sub-clause, or circumstance (e.g., medical condonation, late withdrawal, supplementary exam), and the excerpts provide directly applicable general parent-section provisions (such as general processing fees, standard deadlines, or overall condonation rules), include and explain the general provision. Clearly distinguish whether a separate specialized provision is explicitly defined or absent in the text.\n' +
      '4. Distinguish Explicit vs. Unstated Facts: Differentiate between explicitly stated facts and unstated details. If the document defines a general fee or rule but does not explicitly state a separate specialized fee or rule, state the general rule clearly and clarify that a separate specialized fee/rule is not explicitly specified in the handbook. Never invent a specialized value.\n' +
      '5. Strict Anti-Hallucination: If any requested fact, department policy, program rule, fee, or date is absent from the excerpts, explicitly state that the official documents do not contain that information. Never invent numbers, percentages, currency amounts, or department-specific rules.\n' +
      '6. Tone & Format: Provide a structured, clear, and student-friendly response.';

    const prompt =
      `INSTITUTIONAL DOCUMENT CONTEXT:\n` +
      `${institutionalContext}\n\n` +
      `STUDENT QUESTION:\n` +
      `${userMessage}\n\n` +
      `INSTRUCTIONS FOR SYNTHESIS:\n` +
      `- Thoroughly address every part of the student's question using all relevant facts from the excerpts above.\n` +
      `- If general section provisions (e.g., processing fees, application deadlines, approving authority) apply to the subject matter, explain them accurately while noting whether a separate specialized provision is explicitly stated.\n` +
      `- If any requested topic or fact is not covered in the excerpts, clearly state that it is not specified in the available official documents.\n` +
      `- Ground every statement strictly in the provided institutional excerpts.`;

    let generatedAnswer = '';

    // 6. Invoke Gemini if configured
    if (geminiService.isConfigured()) {
      try {
        const aiResponse = await geminiService.generateContent(prompt, {
          systemInstruction,
          responseMimeType: 'text/plain',
          temperature: 0.1,
          maxOutputTokens: 4096,
          timeoutMs: 20000,
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
      generatedAnswer = this.formatDeterministicAnswer(chunks, citations, userMessage);
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
   * Cleans boilerplate institutional headers from chunk text.
   */
  private cleanBoilerplate(text: string): string {
    return text
      .replace(/NORTHBRIDGE INSTITUTE OF TECHNOLOGY[\s\S]*?Page \d+/gi, '')
      .replace(/FICTIONAL TEST DOCUMENT[^\n]*/gi, '')
      .replace(/Doc\. Ref:[^\n]*/gi, '')
      .replace(/\bQ\.\s+/g, 'Q: ')
      .replace(/\bA\.\s+/g, 'A: ')
      .replace(/\s+/g, ' ')
      .trim();
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
   * Deterministic grounded synthesis across all retrieved chunks when LLM is unavailable.
   */
  public formatDeterministicAnswer(
    chunks: VectorSearchResult[],
    citations: Citation[],
    userMessage?: string
  ): string {
    if (!chunks || chunks.length === 0) {
      return "I couldn't find this information in the available official EduPilot documents.";
    }

    const primaryDoc = citations[0]?.title || 'Academic Records';

    // 1. Group extracted facts by Page / Source and deduplicate
    const pageFactMap = new Map<number, string[]>();
    const seenNormalized = new Set<string>();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const page = chunk.pageNumber || 1;
      const cleaned = this.cleanBoilerplate(chunk.text);

      if (!cleaned) continue;

      // Extract individual clauses / bullet points / lines
      const rawLines = cleaned.split(/(?:•|\n+)/g).map((l) => l.trim()).filter(Boolean);

      for (const line of rawLines) {
        // If a line is long, split on sentence boundary while avoiding splitting abbreviations like Rs. 500
        const clauses = line.length > 250
          ? line.split(/(?<!\b(?:Rs|Dr|Mr|Ms|Prof|Sec|No|ref|dept|vs|e\.g|i\.e))\.\s+(?=[A-Z])/gi)
          : [line];

        for (const point of clauses) {
          const normalized = point.replace(/^[•\-\*\d\.\)]+\s*/, '').trim();
          if (normalized.length < 15) continue;

          // Deduplication key (lowercase alphanumeric normalized)
          const key = normalized.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 75);
          if (seenNormalized.has(key)) {
            continue;
          }
          seenNormalized.add(key);

          if (!pageFactMap.has(page)) {
            pageFactMap.set(page, []);
          }
          pageFactMap.get(page)!.push(normalized);
        }
      }
    }

    // 2. If no structured points extracted, fallback to cleaned chunk text
    if (pageFactMap.size === 0) {
      const topChunk = chunks[0];
      const pageText = topChunk.pageNumber ? ` (Page ${topChunk.pageNumber})` : '';
      return (
        `Based on the official institutional document **${primaryDoc}**${pageText}:\n\n` +
        `${topChunk.text.trim()}`
      );
    }

    // 3. Prioritize pages matching query terms (e.g. fee, deadline, medical, percentage)
    const queryTerms = userMessage
      ? userMessage.toLowerCase().split(/[\s,?.!]+/).filter((t) => t.length > 3)
      : [];

    const sortedPages = Array.from(pageFactMap.keys()).sort((a, b) => {
      if (queryTerms.length === 0) return a - b;
      const aFacts = (pageFactMap.get(a) || []).join(' ').toLowerCase();
      const bFacts = (pageFactMap.get(b) || []).join(' ').toLowerCase();
      const aMatches = queryTerms.filter((t) => aFacts.includes(t)).length;
      const bMatches = queryTerms.filter((t) => bFacts.includes(t)).length;
      return bMatches - aMatches || a - b;
    });

    const sections: string[] = [];
    sections.push(`Based on the official institutional document **${primaryDoc}**:`);

    for (const page of sortedPages) {
      const facts = pageFactMap.get(page) || [];
      if (facts.length === 0) continue;

      const pageHeading = `**Page ${page} Provisions:**`;
      const factList = facts.map((f) => `• ${f}`).join('\n');
      sections.push(`${pageHeading}\n${factList}`);
    }

    return sections.join('\n\n');
  }
}

export const ragResponseService = new RagResponseService();
