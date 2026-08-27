import fs from 'fs';
import { PDFParse } from 'pdf-parse';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PdfExtractionResult {
  totalPages: number;
  fullText: string;
  pages: ExtractedPage[];
  info?: Record<string, unknown>;
}

export class PdfExtractorService {
  /**
   * Extracts text from a PDF buffer while preserving individual page boundaries.
   */
  public async extractFromBuffer(dataBuffer: Buffer): Promise<PdfExtractionResult> {
    if (!dataBuffer || dataBuffer.length === 0) {
      throw new Error('PDF data buffer is empty');
    }

    try {
      // 1. Primary extraction via PDFParse class
      const parser = new PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();
      await parser.destroy().catch(() => {});

      const pages: ExtractedPage[] = (textResult.pages || []).map((p) => ({
        pageNumber: p.num,
        text: (p.text || '').trim(),
      })).filter((p) => p.text.length > 0);

      const totalPages = textResult.total || pages.length || 1;
      const fullText = textResult.text || pages.map((p) => p.text).join('\n\n');

      if (pages.length > 0) {
        return {
          totalPages,
          fullText: fullText.trim(),
          pages,
        };
      }

      // If no page text was parsed, try raw stream decoding fallback (e.g. for synthetic mock PDFs)
      return this.extractFromRawStream(dataBuffer);
    } catch (err: unknown) {
      // Try fallback on synthetic/mock PDFs before throwing
      try {
        return this.extractFromRawStream(dataBuffer);
      } catch {
        const errMsg = err instanceof Error ? err.message : 'Unknown PDF extraction failure';
        throw new Error(`Failed to parse and extract text from PDF: ${errMsg}`);
      }
    }
  }

  /**
   * Fallback extraction for basic PDF streams and synthetic test buffers
   */
  private extractFromRawStream(dataBuffer: Buffer): PdfExtractionResult {
    const rawStr = dataBuffer.toString('latin1');
    const textMatches: string[] = [];
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;

    while ((match = streamRegex.exec(rawStr)) !== null) {
      const streamBody = match[1];
      const tjMatches = streamBody.match(/\((.*?)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const inner = tj.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
          if (inner) textMatches.push(inner);
        }
      }
    }

    const fullText = textMatches.join(' ').trim();
    if (fullText.length > 0) {
      return {
        totalPages: 1,
        fullText,
        pages: [{ pageNumber: 1, text: fullText }],
      };
    }

    throw new Error('PDF appears to be empty or contains no extractable text');
  }

  /**
   * Extracts text from a PDF file on the local filesystem.
   */
  public async extractFromFile(filePath: string): Promise<PdfExtractionResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at path: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    return this.extractFromBuffer(buffer);
  }
}

export const pdfExtractorService = new PdfExtractorService();
