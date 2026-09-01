import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignored
}

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { embeddingService } from '../services/ai/rag/embedding.service';
import { vectorSearchService } from '../services/ai/rag/vector-search.service';
import { ragResponseService, Citation } from '../services/ai/rag/rag-response.service';
import { vectorHandler } from '../services/ai/handlers/vector.handler';
import { orchestratorService } from '../services/ai/orchestrator.service';
import { queryAnalyzerService } from '../services/ai/query-analyzer.service';
import { SubjectService, ExamService, AcademicCalendarService } from '../services/academic/academic.services';
import { QueryAnalysis } from '../types/query-analysis.types';

async function runVectorRAGIntegrationTests() {
  console.log('\n================================================================');
  console.log('🧪 EDUPILOT PHASE 4: VECTOR RAG & ORCHESTRATION TEST SUITE');
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
    console.log('  ℹ️ MongoDB Atlas live network is unreachable in this environment.');
    console.log('  ℹ️ Running deterministic Vector RAG test validations.\n');
  }

  try {
    // ----------------------------------------------------------------
    // TEST GROUP 1: Query Embedding Dimensions (768d)
    // ----------------------------------------------------------------
    console.log('--- Test Group 1: Query Embedding & Dimension Validation ---');
    const testQuery = 'What is the attendance condonation policy?';
    const queryVec = await embeddingService.embedQuery(testQuery);

    assert(Array.isArray(queryVec), 'Embedding service returns an array of numbers');
    assert(queryVec.length === 768, 'Embedding contains exactly 768 dimensions', `Received length: ${queryVec.length}`);
    assert(embeddingService.getDimensions() === 768, 'EmbeddingService configured dimension is 768');

    // ----------------------------------------------------------------
    // TEST GROUP 2: Vector Search Stage Configuration & Atlas Index
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 2: Vector Search Stage & Atlas Index ---');
    const stage = vectorSearchService.buildVectorSearchStage(
      queryVec,
      { semester: 5, subjectCode: 'CS501' },
      { limit: 5, numCandidates: 50 }
    );

    const vs = (stage as any).$vectorSearch;
    assert(vs !== undefined, '$vectorSearch stage exists in MongoDB aggregation pipeline');
    assert(vs.index === 'knowledge_chunks_vector_index', 'Index name strictly targets "knowledge_chunks_vector_index"');
    assert(vs.path === 'embedding', 'Vector path targets "embedding" field');
    assert(vs.limit === 5, 'Default limit is set to 5');
    assert(vs.numCandidates === 50, 'numCandidates is set to 50');
    assert(vs.filter['metadata.semester'] === 5, 'Semester filter correctly mapped in $vectorSearch filter');
    assert(vs.filter['metadata.subjectCode'] === 'CS501', 'Subject code filter correctly mapped in $vectorSearch filter');

    // ----------------------------------------------------------------
    // TEST GROUP 3: Metadata Filters (No Hallucinated / Forced Filters)
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 3: Metadata Filter Construction ---');
    const validObjectId = '650000000000000000000001';

    // 3a. With valid ObjectId department
    const filtersWithId = await vectorHandler.buildFilters({
      department: validObjectId,
      semester: 4,
      subjectCode: 'CS401',
    });
    assert(filtersWithId?.department?.toString() === validObjectId, 'Valid ObjectId department is preserved directly');
    assert(filtersWithId?.semester === 4, 'Semester 4 is mapped correctly');
    assert(filtersWithId?.subjectCode === 'CS401', 'SubjectCode CS401 is mapped');

    // 3b. Empty entities - must NOT invent filters
    const emptyFilters = await vectorHandler.buildFilters({}, {});
    assert(emptyFilters === undefined, 'No filters are constructed when query entities are empty');

    // 3c. Intent alone must NOT automatically inject documentType filter
    const attendanceFilters = await vectorHandler.buildFilters({}, {}, 'attendance_policy');
    assert(attendanceFilters === undefined || attendanceFilters?.documentType === undefined, 'attendance_policy intent does NOT automatically force documentType filter');

    // 3d. Explicitly supplied legitimate documentType filter is preserved
    const explicitDocTypeFilters = await vectorHandler.buildFilters({ documentType: 'academic_regulations' } as any, {});
    assert(explicitDocTypeFilters?.documentType === 'academic_regulations', 'Explicitly supplied documentType is correctly preserved in filters');

    // ----------------------------------------------------------------
    // TEST GROUP 4: No-Result Handling (Anti-Hallucination)
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 4: Zero-Result Anti-Hallucination Behavior ---');
    const emptyRagResult = await ragResponseService.generateRAGResponse('What is the refund policy?', []);
    assert(
      emptyRagResult.response.includes("I couldn't find this information in the available official EduPilot documents."),
      'Zero retrieved chunks returns deterministic not-found response without hallucinating facts'
    );
    assert(emptyRagResult.citations.length === 0, 'Zero citations returned on empty retrieval');
    assert(emptyRagResult.usedChunksCount === 0, 'usedChunksCount is 0');

    // ----------------------------------------------------------------
    // TEST GROUP 5: Grounded RAG Generation & Citation Formatting
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 5: Grounded RAG Generation & Source Citations ---');
    const mockRetrievedChunks = [
      {
        _id: 'chunk_1',
        documentId: 'doc_101',
        text: 'Attendance Policy Section 4.1: Minimum attendance requirement is 75%. Students with 65% to 74% attendance may apply for condonation on medical grounds.',
        chunkIndex: 0,
        pageNumber: 12,
        metadata: {
          department: new mongoose.Types.ObjectId(),
          program: new mongoose.Types.ObjectId(),
          documentType: 'attendance_policy',
          sectionTitle: 'Academic Attendance Regulation',
        },
        score: 0.895,
      },
      {
        _id: 'chunk_2',
        documentId: 'doc_102',
        text: 'Condonation Application: A fee of Rs. 500 must be paid along with a medical certificate signed by a registered medical practitioner.',
        chunkIndex: 1,
        pageNumber: 14,
        metadata: {
          department: new mongoose.Types.ObjectId(),
          program: new mongoose.Types.ObjectId(),
          documentType: 'student_handbook',
          sectionTitle: 'Student Handbook 2025-26',
        },
        score: 0.842,
      },
    ];

    const ragResult = await ragResponseService.generateRAGResponse(
      'What is the minimum attendance requirement and condonation rule?',
      mockRetrievedChunks
    );

    assert(ragResult.usedChunksCount === 2, 'RAG used exactly 2 chunks');
    assert(ragResult.citations.length === 2, '2 source citations created');
    assert(ragResult.response.includes('Sources:'), 'Citation block appended to response');
    assert(ragResult.response.includes('Page 12'), 'Citation includes Page 12');
    assert(ragResult.response.includes('Page 14'), 'Citation includes Page 14');
    assert(
      ragResult.response.includes('75%') || ragResult.response.includes('Academic Attendance Regulation'),
      'Response incorporates institutional facts from retrieved chunk'
    );

    // ----------------------------------------------------------------
    // TEST GROUP 6: VectorHandler & Orchestrator Execution
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 6: VectorHandler & Orchestrator Flow ---');
    const vectorAnalysis: QueryAnalysis = {
      intent: 'attendance_policy',
      entities: {},
      requiredContext: [],
      providedContext: [],
      missingContext: [],
      retrievalStrategy: 'vector',
      confidenceScore: 0.95,
    };

    const orchestratorResult = await orchestratorService.orchestrate(
      'What is the attendance policy?',
      {},
      undefined
    );

    // Critical assertion: The old placeholder MUST NOT be returned!
    const oldPlaceholder = 'Vector-based knowledge retrieval and citation extraction will be available in Phase 4';
    assert(
      !orchestratorResult.response.includes(oldPlaceholder),
      'Old Phase 4 placeholder is NO LONGER returned for vector queries'
    );
    assert(
      orchestratorResult.status === 'answer_ready',
      `Orchestrator returns status "answer_ready" for vector query (received: "${orchestratorResult.status}")`
    );
    assert(
      orchestratorResult.queryAnalysis.retrievalStrategy === 'vector',
      'Query analyzer correctly classified query strategy as "vector"'
    );

    // ----------------------------------------------------------------
    // TEST GROUP 7: Structured Retrieval Non-Regression Checks
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 7: Structured Retrieval Non-Regression ---');
    const subjectResult = await SubjectService.findSubject({ subject: 'DBMS', semester: 5 });
    assert(subjectResult.found === true, 'Structured SubjectService continues to find subjects (DBMS)');
    assert(subjectResult.records.length > 0, 'Structured subject records returned');

    const examResult = await ExamService.findExams({ department: 'CSE', semester: 5 });
    assert(examResult.found === true, 'Structured ExamService continues to find exams');

    const calendarResult = await AcademicCalendarService.findCalendarEvents({});
    assert(calendarResult.found === true, 'Structured AcademicCalendarService continues to find calendar events');

    // ----------------------------------------------------------------
    // TEST GROUP 8: Deterministic Multi-Chunk Fallback Synthesis Tests
    // ----------------------------------------------------------------
    console.log('\n--- Test Group 8: Deterministic Fallback Synthesis & Deduplication ---');
    const citations = [
      { title: 'Academic Handbook 2025-26', pageNumber: 6, documentId: 'doc1' },
      { title: 'Academic Handbook 2025-26', pageNumber: 7, documentId: 'doc1' },
      { title: 'Academic Handbook 2025-26', pageNumber: 28, documentId: 'doc1' },
    ];

    // Scenario 1: Multi-chunk answer (fee in chunk 2 must not be lost)
    const mockMeta: any = { department: new mongoose.Types.ObjectId(), program: new mongoose.Types.ObjectId() };
    const multiChunks: any[] = [
      {
        _id: 'c1',
        documentId: 'doc1',
        text: 'Medical Condonation: Students with 60% to 64.9% attendance require a medical certificate from a Registered Medical Practitioner.',
        chunkIndex: 14,
        pageNumber: 7,
        metadata: mockMeta,
        score: 0.85,
      },
      {
        _id: 'c2',
        documentId: 'doc1',
        text: 'Condonation Processing Fee: A non-refundable condonation processing fee of Rs. 500 per course is payable at the time of application.',
        chunkIndex: 12,
        pageNumber: 6,
        metadata: mockMeta,
        score: 0.83,
      },
    ];

    const fallbackMulti = ragResponseService.formatDeterministicAnswer(
      multiChunks,
      citations,
      'What is the medical attendance condonation fee?'
    );
    assert(fallbackMulti.includes('Rs. 500'), 'Multi-chunk fallback contains Rs. 500 fee from chunk 2');
    assert(fallbackMulti.includes('Page 6'), 'Multi-chunk fallback attributes fee to Page 6');
    assert(fallbackMulti.includes('Page 7'), 'Multi-chunk fallback attributes medical requirements to Page 7');

    // Scenario 2: Duplicate fact deduplication (duplicate Rs. 500 statement across chunks)
    const dupChunks: any[] = [
      ...multiChunks,
      {
        _id: 'c3',
        documentId: 'doc1',
        text: 'FAQ: The ordinary condonation processing fee is Rs. 500 per course payable at application.',
        chunkIndex: 70,
        pageNumber: 28,
        metadata: mockMeta,
        score: 0.82,
      },
    ];
    const fallbackDup = ragResponseService.formatDeterministicAnswer(dupChunks, citations);
    assert(fallbackDup.includes('Rs. 500'), 'Deduplicated fallback contains Rs. 500');

    // Scenario 3: Empty chunks / Missing information
    const emptyFallback = ragResponseService.formatDeterministicAnswer([], []);
    assert(emptyFallback.includes("couldn't find this information"), 'Empty retrieval returns not-found statement');

    console.log('\n================================================================');
    console.log(`📊 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Vector RAG integration tests:', error);
    process.exit(1);
  } finally {
    if (isDbConnected) {
      await disconnectDatabase();
    }
  }
}

runVectorRAGIntegrationTests();
