import mongoose from 'mongoose';
import { IChunkMetadata } from '../../../models/knowledge-chunk.model';

export interface AdminContext {
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
}

export interface ExtractedDocumentMetadata {
  semester?: number;
  subjectCode?: string;
  subjectName?: string;
  academicYear?: string;
  documentType?: string;
  title?: string;
}

export class MetadataExtractorService {
  /**
   * Extract global document-level metadata from the full text of the document.
   */
  public extractDocumentMetadata(fullText: string): ExtractedDocumentMetadata {
    const metadata: ExtractedDocumentMetadata = {};
    if (!fullText || !fullText.trim()) {
      return metadata;
    }

    const text = fullText;

    // 1. Semester Detection (e.g. "Semester 5", "Sem 5", "5th Semester", "Semester - V")
    const semMatch = text.match(/(?:semester|sem)[\s:-]*([1-8]|i|ii|iii|iv|v|vi|vii|viii)\b|([1-8])(?:st|nd|rd|th)\s+semester/i);
    if (semMatch) {
      const rawSem = (semMatch[1] || semMatch[2] || '').toLowerCase();
      const semMap: Record<string, number> = {
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8,
      };
      if (semMap[rawSem]) {
        metadata.semester = semMap[rawSem];
      }
    }

    // 2. Subject Code Detection (e.g. CS501, CSE501, IT302, EC401, MATH101)
    const codeMatch = text.match(/\b([A-Z]{2,5}\s?[-]?\s?[1-8][0-9]{2}[A-Z]?)\b/i);
    if (codeMatch && codeMatch[1]) {
      metadata.subjectCode = codeMatch[1].replace(/\s+/g, '').toUpperCase();
    }

    // 3. Academic Year Detection (e.g. 2025-26, 2024-2025, 2025-2026)
    const yearMatch = text.match(/\b(20\d{2}\s*[-–/]\s*(?:20)?\d{2})\b/);
    if (yearMatch && yearMatch[1]) {
      metadata.academicYear = yearMatch[1].replace(/\s+/g, '');
    }

    // 4. Document Type Detection
    if (/academic\s+regulations?|ordinance/i.test(text)) {
      metadata.documentType = 'academic_regulations';
    } else if (/examination\s+rules?|exam\s+regulations?|evaluation\s+rules?/i.test(text)) {
      metadata.documentType = 'examination_rules';
    } else if (/attendance\s+(?:policy|rules?|regulations?|criteria)/i.test(text)) {
      metadata.documentType = 'attendance_policy';
    } else if (/grading\s+(?:system|policy|scale|rules?)/i.test(text)) {
      metadata.documentType = 'grading_policy';
    } else if (/syllabus|curriculum|course\s+structure/i.test(text)) {
      metadata.documentType = 'syllabus';
    } else if (/student\s+handbook|handbook/i.test(text)) {
      metadata.documentType = 'student_handbook';
    } else if (/circular|notice|office\s+order/i.test(text)) {
      metadata.documentType = 'academic_circular';
    }

    // 5. Subject Name Detection (e.g. Database Management Systems, Operating Systems)
    const subjectLineMatch = text.match(/(?:subject|course(?:\s+name|\s+title)?)\s*[:\-]\s*([A-Za-z0-9\s&,–-]+)/i);
    if (subjectLineMatch && subjectLineMatch[1]) {
      const candidate = subjectLineMatch[1].split(/\r?\n/)[0].trim();
      if (candidate.length > 3 && candidate.length < 80) {
        metadata.subjectName = candidate;
      }
    }

    return metadata;
  }

  /**
   * Extract section-specific metadata for a single chunk of text within a page.
   * Admin-supplied department and program are immutably attached.
   */
  public extractChunkMetadata(
    chunkText: string,
    docMetadata: ExtractedDocumentMetadata,
    adminContext: AdminContext
  ): IChunkMetadata {
    const chunkMetadata: IChunkMetadata = {
      department: adminContext.department,
      program: adminContext.program,
      semester: docMetadata.semester,
      subjectCode: docMetadata.subjectCode,
      subjectName: docMetadata.subjectName,
      academicYear: docMetadata.academicYear,
      documentType: docMetadata.documentType,
    };

    // Check if chunk has a more specific semester (e.g. in multi-semester syllabus)
    const semMatch = chunkText.match(/(?:semester|sem)[\s:-]*([1-8]|i|ii|iii|iv|v|vi|vii|viii)\b/i);
    if (semMatch) {
      const raw = (semMatch[1] || '').toLowerCase();
      const map: Record<string, number> = {
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8,
      };
      if (map[raw]) {
        chunkMetadata.semester = map[raw];
      }
    }

    // Check if chunk has specific subject code
    const codeMatch = chunkText.match(/\b([A-Z]{2,5}\s?[-]?\s?[1-8][0-9]{2}[A-Z]?)\b/i);
    if (codeMatch && codeMatch[1]) {
      chunkMetadata.subjectCode = codeMatch[1].replace(/\s+/g, '').toUpperCase();
    }

    // Section title / Unit number detection
    const unitMatch = chunkText.match(/\b(?:unit|module|chapter)[\s:-]*([1-9]|i|ii|iii|iv|v|vi)\b/i);
    if (unitMatch) {
      const rawUnit = (unitMatch[1] || '').toLowerCase();
      const uMap: Record<string, number> = {
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6,
      };
      if (uMap[rawUnit]) {
        chunkMetadata.unitNumber = uMap[rawUnit];
      }
    }

    // Header / Section title
    const firstLine = chunkText.split(/\r?\n/)[0]?.trim() || '';
    if (firstLine.length > 3 && firstLine.length < 100 && !firstLine.includes('.')) {
      chunkMetadata.sectionTitle = firstLine;
    }

    return chunkMetadata;
  }
}

export const metadataExtractorService = new MetadataExtractorService();
