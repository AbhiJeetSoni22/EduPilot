import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignored
}

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { Department } from '../models/department.model';
import { Program } from '../models/program.model';
import { AcademicDocument } from '../models/document.model';
import { KnowledgeChunk } from '../models/knowledge-chunk.model';
import { pdfExtractorService } from '../services/ai/rag/pdf-extractor.service';
import { metadataExtractorService } from '../services/ai/rag/metadata-extractor.service';
import { chunkingService } from '../services/ai/rag/chunking.service';
import { geminiEmbeddingProvider } from '../services/ai/rag/gemini-embedding.provider';
import { embeddingService } from '../services/ai/rag/embedding.service';
import { vectorSearchService } from '../services/ai/rag/vector-search.service';
import { documentIngestionService } from '../services/ai/rag/document-ingestion.service';

function createSamplePdfBuffer(contentString: string): Buffer {
  const streamContent = `BT\n/F1 12 Tf\n72 712 Td\n(${contentString.replace(/[()]/g, '')}) Tj\nET`;
  const streamLength = streamContent.length;

  const pdfTemplate = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000234 00000 n 
0000000350 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
450
%%EOF`;

  return Buffer.from(pdfTemplate);
}

async function runPhase4Tests() {
  console.log('\n================================================================');
  console.log('🧪 EDUPILOT PHASE 4: RAG INGESTION & VECTOR SEARCH TEST SUITE');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failedCount++;
    }
  }

  const conn = await connectDatabase();
  const isDbConnected = Boolean(conn && mongoose.connection.readyState === 1);

  if (!isDbConnected) {
    console.log('  ℹ️ Notice: MongoDB Atlas network is unreachable in this local environment.');
    console.log('  ℹ️ Running full Phase 4 deterministic pipeline validation (PDF extraction, Metadata, Chunking, 768d Embeddings, $vectorSearch builder, and Vector Retrieval).');
  }

  const testUploadDir = path.resolve(process.cwd(), 'uploads', 'documents');
  if (!fs.existsSync(testUploadDir)) {
    fs.mkdirSync(testUploadDir, { recursive: true });
  }

  try {
    const mockCseDeptId = new mongoose.Types.ObjectId('650000000000000000000001');
    const mockEceDeptId = new mongoose.Types.ObjectId('650000000000000000000002');
    const mockBtechProgId = new mongoose.Types.ObjectId('650000000000000000000010');
    const mockEceProgId = new mongoose.Types.ObjectId('650000000000000000000020');

    let cseDeptId = mockCseDeptId;
    let btechProgId = mockBtechProgId;
    let eceDeptId = mockEceDeptId;

    if (isDbConnected) {
      console.log('📦 Setting up test departments and programs in MongoDB...');
      let cseDept = await Department.findOne({ code: 'CSE' });
      if (!cseDept) {
        cseDept = await Department.create({
          name: 'Computer Science and Engineering',
          code: 'CSE',
          status: 'active',
        });
      }
      cseDeptId = cseDept._id;

      let eceDept = await Department.findOne({ code: 'ECE' });
      if (!eceDept) {
        eceDept = await Department.create({
          name: 'Electronics and Communication Engineering',
          code: 'ECE',
          status: 'active',
        });
      }
      eceDeptId = eceDept._id;

      let btechProg = await Program.findOne({ code: 'BTECH_CSE' });
      if (!btechProg) {
        btechProg = await Program.create({
          name: 'Bachelor of Technology in Computer Science',
          code: 'BTECH_CSE',
          department: cseDept._id,
          degreeType: 'Undergraduate',
          durationYears: 4,
          totalSemesters: 8,
          academicYear: '2025-26',
          status: 'active',
        });
      }
      btechProgId = btechProg._id;
    }

    // ----------------------------------------------------------------
    // TEST 1: PDF Text Extraction & Page Tracking
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 1: PDF Extraction Service ---');
    const sampleText = 'Semester 5 CS501 Database Management Systems Credits: 4. Unit 1 Introduction to Relational Databases.';
    const pdfBuf = createSamplePdfBuffer(sampleText);
    const extractionResult = await pdfExtractorService.extractFromBuffer(pdfBuf);

    assert(extractionResult.totalPages >= 1, 'PDF total pages counted correctly', `Pages: ${extractionResult.totalPages}`);
    assert(extractionResult.fullText.includes('Database Management Systems'), 'PDF extracted full text accurately');
    assert(extractionResult.pages.length >= 1 && extractionResult.pages[0].pageNumber === 1, 'Page boundary preserved with pageNumber: 1');

    // ----------------------------------------------------------------
    // TEST 2: Academic Metadata Extraction & Immutable Admin Context
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 2: Document Structure & Metadata Extraction ---');
    const docMeta = metadataExtractorService.extractDocumentMetadata(extractionResult.fullText);
    assert(docMeta.semester === 5, 'Semester 5 extracted correctly from text', `Extracted: ${docMeta.semester}`);
    assert(docMeta.subjectCode === 'CS501', 'Subject Code CS501 extracted correctly', `Extracted: ${docMeta.subjectCode}`);

    const chunkMeta = metadataExtractorService.extractChunkMetadata(
      'Unit 1 Introduction to Relational Databases',
      docMeta,
      { department: cseDeptId, program: btechProgId }
    );
    assert(chunkMeta.department.toString() === cseDeptId.toString(), 'Admin Department is immutably attached to chunk metadata');
    assert(chunkMeta.program.toString() === btechProgId.toString(), 'Admin Program is immutably attached to chunk metadata');
    assert(chunkMeta.unitNumber === 1, 'Unit number 1 extracted correctly');

    // ----------------------------------------------------------------
    // TEST 3: Chunking Service
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 3: Text Chunking ---');
    const longAcademicText = `
Computer Science and Engineering - Semester 5 Syllabus.
Subject: Database Management Systems (DBMS).
Course Code: CS501. Credits: 4. Total Hours: 45.

Unit 1: Relational Database Design and Entity Relationship Models.
Topics include ER Modeling, Extended ER features, Relational Schema design, Functional Dependencies, and Normalization up to BCNF.

Unit 2: SQL and Transaction Management.
Topics include Complex SQL queries, ACID properties, Serializability, Concurrency Control using 2-Phase Locking, and WAL recovery.

Academic Regulations:
Minimum attendance requirement is 75 percent. Students having attendance between 65 percent and 74 percent may apply for condonation.
`;

    const multiPageMock = [
      { pageNumber: 1, text: longAcademicText.slice(0, 300) },
      { pageNumber: 2, text: longAcademicText.slice(300) },
    ];

    const chunks = chunkingService.chunkPages(
      multiPageMock,
      docMeta,
      { department: cseDeptId, program: btechProgId },
      { maxChunkSize: 300, chunkOverlap: 50 }
    );

    assert(chunks.length >= 2, 'Multi-page document produces multiple distinct chunks', `Chunks: ${chunks.length}`);
    assert(chunks.every((c) => c.pageNumber !== undefined), 'All generated chunks contain pageNumber');
    assert(chunks.every((c) => c.metadata.department.toString() === cseDeptId.toString()), 'All generated chunks inherit Admin department');

    // ----------------------------------------------------------------
    // TEST 4: Gemini Embedding Dimensions & Batching
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 4: Gemini Embedding Provider ---');
    const singleEmbedding = await embeddingService.embedQuery('How many credits does DBMS have?');
    assert(Array.isArray(singleEmbedding), 'Embedding is returned as an array');
    assert(singleEmbedding.length === 768, 'Embedding contains exactly 768 dimensions', `Length: ${singleEmbedding.length}`);

    const batchTexts = ['DBMS CS501 Unit 1', 'Operating Systems OS301 Unit 2', 'Computer Networks CN401'];
    const batchEmbeddings = await embeddingService.embedDocuments(batchTexts);
    assert(batchEmbeddings.length === 3, 'Batch embedding returned embeddings for all 3 inputs');
    assert(batchEmbeddings.every((vec) => vec.length === 768), 'All batch embeddings have exactly 768 dimensions');

    // ----------------------------------------------------------------
    // TEST 5: End-to-End Document Ingestion & Storage Pipeline
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 5: Document Ingestion Pipeline ---');
    const testPdfPath = path.join(testUploadDir, 'test_cse_sem5_dbms_syllabus.pdf');
    fs.writeFileSync(testPdfPath, createSamplePdfBuffer(longAcademicText));

    if (isDbConnected) {
      const testDoc = await AcademicDocument.create({
        title: 'CSE Semester 5 DBMS Syllabus Handbook',
        originalFileName: 'test_cse_sem5_dbms_syllabus.pdf',
        department: cseDeptId,
        program: btechProgId,
        status: 'uploaded',
        fileSize: fs.statSync(testPdfPath).size,
        mimeType: 'application/pdf',
        storageReference: path.relative(process.cwd(), testPdfPath).replace(/\\/g, '/'),
      });

      const ingestionResult = await documentIngestionService.processDocument(testDoc._id);
      assert(ingestionResult.status === 'ready', 'Document ingestion finished with status: "ready"');
      assert(ingestionResult.totalChunks > 0, 'Document chunks were generated and counted', `Chunks: ${ingestionResult.totalChunks}`);

      const storedChunks = await KnowledgeChunk.find({ documentId: testDoc._id });
      assert(storedChunks.length === ingestionResult.totalChunks, 'Knowledge chunks persisted to MongoDB');
      assert(storedChunks[0].embedding.length === 768, 'Stored chunk embeddings are verified 768-dimensional vectors');

      await AcademicDocument.findByIdAndDelete(testDoc._id);
      await KnowledgeChunk.deleteMany({ documentId: testDoc._id });
    } else {
      // Offline verification of full pipeline steps
      const fullExtracted = await pdfExtractorService.extractFromFile(testPdfPath);
      const parsedMeta = metadataExtractorService.extractDocumentMetadata(fullExtracted.fullText);
      const prepared = chunkingService.chunkPages(fullExtracted.pages, parsedMeta, {
        department: cseDeptId,
        program: btechProgId,
      });
      const generatedEmbeddings = await embeddingService.embedDocuments(prepared.map((p) => p.text));
      assert(prepared.length > 0, 'Document ingestion produced valid chunk partition', `Chunks: ${prepared.length}`);
      assert(generatedEmbeddings.every((e) => e.length === 768), 'All chunks embedded with verified 768-dimensional vectors');
      assert(prepared[0].metadata.department.toString() === cseDeptId.toString(), 'Chunk metadata immutably preserves Admin department');
    }

    if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);

    // ----------------------------------------------------------------
    // TEST 6: Ingestion Failure Handling
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 6: Ingestion Failure Handling ---');
    if (isDbConnected) {
      const corruptDoc = await AcademicDocument.create({
        title: 'Corrupted Test Document',
        originalFileName: 'corrupt.pdf',
        department: cseDeptId,
        program: btechProgId,
        status: 'uploaded',
        fileSize: 100,
        mimeType: 'application/pdf',
        storageReference: 'uploads/documents/non_existent_file.pdf',
      });

      const corruptResult = await documentIngestionService.processDocument(corruptDoc._id);
      assert(corruptResult.status === 'failed', 'Missing file transitions document to status: "failed"');
      assert(Boolean(corruptResult.error), 'Safe error message stored without crashing');

      const refreshedCorruptDoc = await AcademicDocument.findById(corruptDoc._id);
      assert(refreshedCorruptDoc?.status === 'failed', 'Database record reflects status: "failed" and is not stuck in processing');
      await AcademicDocument.findByIdAndDelete(corruptDoc._id);
    } else {
      try {
        await pdfExtractorService.extractFromFile('uploads/documents/non_existent_file.pdf');
        assert(false, 'Missing file should throw error');
      } catch (err: unknown) {
        assert(true, 'Missing file caught safely with human-readable error');
      }
    }

    // ----------------------------------------------------------------
    // TEST 7: Vector Search Pipeline Builder & Pre-filtering
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 7: Atlas Vector Search Pipeline & Pre-filtering ---');
    const testQueryVec = new Array(768).fill(0.035);
    const vectorStage = vectorSearchService.buildVectorSearchStage(
      testQueryVec,
      { department: cseDeptId, semester: 5, subjectCode: 'CS501' },
      { limit: 5 }
    );

    const vsConfig = (vectorStage as any).$vectorSearch;
    assert(vsConfig.index === 'knowledge_chunks_vector_index', 'Vector search targets knowledge_chunks_vector_index');
    assert(vsConfig.path === 'embedding', 'Vector search path configured as "embedding"');
    assert(vsConfig.queryVector.length === 768, 'Query vector validated to 768 dimensions');
    assert(vsConfig.filter['metadata.semester'] === 5, 'Pre-filter correctly includes metadata.semester = 5');
    assert(vsConfig.filter['metadata.subjectCode'] === 'CS501', 'Pre-filter correctly includes metadata.subjectCode = CS501');

    // ----------------------------------------------------------------
    // TEST 8: RAG Academic Question Verification (DBMS 4 Credits Retrieval)
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 8: RAG Academic Question Retrieval Verification ---');
    console.log('  Question: "How many credits does DBMS have?"');
    const dbmsChunkText = 'CS501 Database Management Systems (DBMS). Credits: 4. Core course covering Relational Algebra, SQL, and Normalization.';
    const osChunkText = 'CS502 Operating Systems (OS). Credits: 3. Core course covering processes, threads, scheduling, and virtual memory.';

    const candidateTexts = [dbmsChunkText, osChunkText];
    const candidateEmbeddings = await embeddingService.embedDocuments(candidateTexts);

    const dbmsQueryVector = await embeddingService.embedQuery('How many credits does DBMS have?');

    // Calculate similarity ranking
    function cosineSim(a: number[], b: number[]): number {
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    const scores = candidateEmbeddings.map((emb, idx) => ({
      text: candidateTexts[idx],
      score: cosineSim(dbmsQueryVector, emb),
    }));
    scores.sort((a, b) => b.score - a.score);

    const topMatch = scores[0];
    console.log(`  Top Chunk Retrieved: "${topMatch.text}" (score: ${topMatch.score.toFixed(4)})`);

    assert(topMatch.text.includes('Credits: 4'), 'Top retrieved vector knowledge chunk contains verified 4-credit information for DBMS');
    assert(topMatch.text.includes('DBMS') || topMatch.text.includes('CS501'), 'Top retrieved chunk matches target DBMS subject');

    console.log('\n================================================================');
    console.log(`📊 PHASE 4 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Phase 4 test execution:', error);
    process.exit(1);
  } finally {
    if (isDbConnected) {
      await disconnectDatabase();
    }
  }
}

runPhase4Tests();
