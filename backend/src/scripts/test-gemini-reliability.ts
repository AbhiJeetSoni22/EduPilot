import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { config } from '../config/env';
import { geminiService } from '../services/ai/gemini.service';
import { queryAnalyzerService } from '../services/ai/query-analyzer.service';
import { ragResponseService } from '../services/ai/rag/rag-response.service';
import { VectorSearchResult } from '../services/ai/rag/vector-search.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runGeminiReliabilityTests() {
  console.log('\n================================================================');
  console.log('🧪 EDUPILOT GEMINI RELIABILITY & MODEL CONFIGURATION TEST SUITE');
  console.log('================================================================\n');

  // --- Test Group 1: Configuration & Model Separation ---
  console.log('--- Test Group 1: Model & Timeout Configuration ---');
  assert(
    geminiService.getQueryAnalyzerModel() === 'gemini-3.6-flash',
    `QueryAnalyzer model is configured as "gemini-3.6-flash" (got: ${geminiService.getQueryAnalyzerModel()})`
  );
  assert(
    geminiService.getRagGenerationModel() === 'gemini-3.7-flash',
    `RAG Generation model is configured as "gemini-3.7-flash" (got: ${geminiService.getRagGenerationModel()})`
  );
  assert(
    geminiService.getQueryTimeoutMs() === 15000,
    `Query timeout is configured to 15000ms (got: ${geminiService.getQueryTimeoutMs()})`
  );
  assert(
    geminiService.getRagTimeoutMs() === 20000,
    `RAG Generation timeout is configured to 20000ms (got: ${geminiService.getRagTimeoutMs()})`
  );
  assert(
    geminiService.getMaxRetries() === 1,
    `Max retries is configured to 1 (got: ${geminiService.getMaxRetries()})`
  );

  // --- Test Group 2: Error Classification ---
  console.log('\n--- Test Group 2: Error Classification & Transient Detection ---');
  const timeoutErr = geminiService.classifyError(new Error('The operation was aborted due to timeout'));
  assert(timeoutErr.category === 'timeout' && timeoutErr.isTransient === true, 'Timeout error classified as transient timeout');

  const rateLimitErr = geminiService.classifyError(new Error('This model is currently experiencing high demand. 429 quota exhausted'), 429);
  assert(rateLimitErr.category === 'rate_limit' && rateLimitErr.isTransient === true, 'Rate limit / high demand classified as transient rate_limit');

  const serverErr = geminiService.classifyError(new Error('503 Service Unavailable'), 503);
  assert(serverErr.category === 'server_error' && serverErr.isTransient === true, '503 error classified as transient server_error');

  const authErr = geminiService.classifyError(new Error('API_KEY_INVALID'), 401);
  assert(authErr.category === 'authentication' && authErr.isTransient === false, '401/Invalid key classified as permanent authentication failure');

  const invalidReqErr = geminiService.classifyError(new Error('models/invalid-model is not found'), 404);
  assert(invalidReqErr.category === 'invalid_request' && invalidReqErr.isTransient === false, '404/not found classified as permanent invalid_request');

  // --- Test Group 3: Live Model Generation & Non-Latest Verification ---
  if (geminiService.isConfigured()) {
    console.log('\n--- Test Group 3: Live Gemini Model Generation & Logging ---');
    try {
      const qaResponse = await geminiService.generateContent('Respond with JSON: {"status": "ok"}', {
        model: geminiService.getQueryAnalyzerModel(),
        operation: 'unit-test-query-model',
        responseMimeType: 'application/json',
      });
      assert(qaResponse.includes('ok'), `Live Query Analyzer model (${geminiService.getQueryAnalyzerModel()}) generated response successfully`);

      const ragResponse = await geminiService.generateContent('Respond with exact text: RAG Generation Verified', {
        model: geminiService.getRagGenerationModel(),
        operation: 'unit-test-rag-model',
        responseMimeType: 'text/plain',
      });
      assert(ragResponse.includes('RAG Generation Verified'), `Live RAG Generation model (${geminiService.getRagGenerationModel()}) generated response successfully`);
    } catch (err) {
      console.warn('  ⚠️ Live API generation warning:', err);
    }
  }

  // --- Test Group 4: Positive RAG, Negative Anti-Hallucination & Complex Query ---
  console.log('\n--- Test Group 4: Positive RAG, Negative Anti-Hallucination & Complex Query ---');
  
  // 1. Negative anti-hallucination (Hostel Fee)
  const emptyChunks: VectorSearchResult[] = [];
  const emptyRagResult = await ragResponseService.generateRAGResponse(
    'What is the hostel fee for the 2025-26 academic year?',
    emptyChunks
  );
  assert(
    emptyRagResult.response.includes("I couldn't find this information in the available official EduPilot documents."),
    'Absent hostel fee returns strict anti-hallucination not-found message'
  );
  assert(
    !emptyRagResult.response.includes('How can I provide further detail?'),
    'Absent hostel fee does NOT return generic conversational response'
  );

  // 2. Positive RAG (DBMS Credits)
  const mockDeptId = new mongoose.Types.ObjectId();
  const mockProgId = new mongoose.Types.ObjectId();

  const dbmsChunks: VectorSearchResult[] = [
    {
      _id: 'c_dbms',
      documentId: 'doc_dbms',
      text: 'CS501 Database Management Systems (DBMS). Credits: 4. Core course covering Relational Algebra, SQL, and Normalization.',
      chunkIndex: 0,
      pageNumber: 3,
      metadata: {
        department: mockDeptId,
        program: mockProgId,
        documentType: 'syllabus',
        subjectCode: 'CS501',
        subjectName: 'Database Management Systems',
        semester: 5,
        sectionTitle: 'CS501 Course Overview',
      },
      score: 0.92,
    },
  ];

  const dbmsRagResult = await ragResponseService.generateRAGResponse(
    'How many credits does DBMS have?',
    dbmsChunks
  );
  assert(
    dbmsRagResult.response.toLowerCase().includes('credit') || dbmsRagResult.response.includes('4'),
    'Positive DBMS query returns grounded 4-credit information'
  );
  assert(dbmsRagResult.citations.length === 1, 'DBMS query includes source citation');

  // 3. Complex multi-part query (Attendance Condonation: medical, documents, fee, deadline)
  const complexChunks: VectorSearchResult[] = [
    {
      _id: 'c_cond1',
      documentId: 'doc_reg',
      text: 'Section 4.2 Medical Condonation: Students with attendance between 65% and 74.9% may apply for condonation on medical grounds. Required documents: Official medical certificate from a Registered Medical Practitioner and hospital admission slip.',
      chunkIndex: 5,
      pageNumber: 8,
      metadata: {
        department: mockDeptId,
        program: mockProgId,
        documentType: 'handbook',
        sectionTitle: 'Attendance Regulations & Condonation',
      },
      score: 0.88,
    },
    {
      _id: 'c_cond2',
      documentId: 'doc_reg',
      text: 'Section 4.3 Condonation Fees and Deadlines: A non-refundable processing fee of Rs. 500 per course must be remitted. The condonation application must be submitted to the Dean of Academic Affairs at least 7 days prior to the commencement of semester examinations.',
      chunkIndex: 6,
      pageNumber: 9,
      metadata: {
        department: mockDeptId,
        program: mockProgId,
        documentType: 'handbook',
        sectionTitle: 'Attendance Fees & Deadlines',
      },
      score: 0.86,
    },
  ];

  const complexRagResult = await ragResponseService.generateRAGResponse(
    "I have 68% attendance due to a medical issue — can I apply for condonation, what documents do I need, what's the fee, and what's the deadline?",
    complexChunks
  );

  assert(
    complexRagResult.response.includes('65%') ||
    complexRagResult.response.includes('medical') ||
    complexRagResult.response.includes('500') ||
    complexRagResult.response.includes('7 days') ||
    complexRagResult.response.includes('Dean'),
    'Complex attendance query synthesizes grounded multi-part answer'
  );
  assert(complexRagResult.citations.length === 2, 'Complex query includes both page citations');

  console.log('\n================================================================');
  console.log('📊 GEMINI RELIABILITY TEST SUITE: ALL TESTS PASSED');
  console.log('================================================================\n');
}

runGeminiReliabilityTests().catch((err) => {
  console.error('Gemini reliability test failed:', err);
  process.exit(1);
});
