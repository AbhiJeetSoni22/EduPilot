import mongoose from 'mongoose';
import { IChunkMetadata } from '../../../models/knowledge-chunk.model';
import { ExtractedPage } from './pdf-extractor.service';
import {
  metadataExtractorService,
  ExtractedDocumentMetadata,
  AdminContext,
} from './metadata-extractor.service';

export interface ChunkingOptions {
  maxChunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
}

export interface PreparedChunk {
  text: string;
  chunkIndex: number;
  pageNumber?: number;
  metadata: IChunkMetadata;
}

export class ChunkingService {
  private defaultMaxChunkSize = 800;
  private defaultChunkOverlap = 120;
  private defaultMinChunkSize = 100;

  /**
   * Splits extracted PDF pages into semantic, page-aware chunks with attached metadata.
   */
  public chunkPages(
    pages: ExtractedPage[],
    docMetadata: ExtractedDocumentMetadata,
    adminContext: AdminContext,
    options: ChunkingOptions = {}
  ): PreparedChunk[] {
    const maxChunkSize = options.maxChunkSize || this.defaultMaxChunkSize;
    const chunkOverlap = options.chunkOverlap || this.defaultChunkOverlap;
    const minChunkSize = options.minChunkSize || this.defaultMinChunkSize;

    const preparedChunks: PreparedChunk[] = [];
    let globalChunkIndex = 0;

    for (const page of pages) {
      const pageText = page.text?.trim() || '';
      if (!pageText) continue;

      // Split page by natural section boundaries (double newlines, headings, units)
      const pageChunks = this.splitTextIntoChunks(pageText, maxChunkSize, chunkOverlap, minChunkSize);

      for (const chunkText of pageChunks) {
        const chunkMetadata = metadataExtractorService.extractChunkMetadata(
          chunkText,
          docMetadata,
          adminContext
        );

        preparedChunks.push({
          text: chunkText,
          chunkIndex: globalChunkIndex++,
          pageNumber: page.pageNumber,
          metadata: chunkMetadata,
        });
      }
    }

    // Fallback: If no chunks were created from pages (e.g. all empty), but fullText exists
    if (preparedChunks.length === 0 && pages.length > 0) {
      const combined = pages.map((p) => p.text).join('\n\n').trim();
      if (combined) {
        const fallbackChunks = this.splitTextIntoChunks(combined, maxChunkSize, chunkOverlap, minChunkSize);
        for (const text of fallbackChunks) {
          const chunkMetadata = metadataExtractorService.extractChunkMetadata(
            text,
            docMetadata,
            adminContext
          );
          preparedChunks.push({
            text,
            chunkIndex: globalChunkIndex++,
            pageNumber: 1,
            metadata: chunkMetadata,
          });
        }
      }
    }

    return preparedChunks;
  }

  /**
   * Splits arbitrary text into overlapping chunks respecting sentence/paragraph boundaries.
   */
  public splitTextIntoChunks(
    text: string,
    maxSize: number,
    overlap: number,
    minSize: number
  ): string[] {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (cleanText.length <= maxSize) {
      return [cleanText];
    }

    const chunks: string[] = [];
    // Split by paragraphs first
    const paragraphs = cleanText.split(/\n\s*\n/);
    let currentChunk = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if ((currentChunk + '\n\n' + trimmedPara).length <= maxSize) {
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
      } else {
        if (currentChunk.length >= minSize) {
          chunks.push(currentChunk.trim());
          // Create overlap from end of currentChunk
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + '\n\n' + trimmedPara;
        } else {
          // If single paragraph is larger than maxSize, split by sentence/newline
          const subSentences = trimmedPara.split(/(?<=[.?!])\s+|\n/);
          for (const sentence of subSentences) {
            if ((currentChunk + ' ' + sentence).length <= maxSize) {
              currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
            } else {
              if (currentChunk.length >= minSize) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
              } else {
                currentChunk = sentence;
              }
            }
          }
        }
      }
    }

    if (currentChunk.trim().length >= minSize || chunks.length === 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((c) => c.length > 0);
  }
}

export const chunkingService = new ChunkingService();
