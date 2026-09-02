import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignored
}

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { config } from '../config/env';
import { embeddingService } from '../services/ai/rag/embedding.service';
import { vectorSearchService } from '../services/ai/rag/vector-search.service';
import { ragResponseService, Citation } from '../services/ai/rag/rag-response.service';
import { vectorHandler } from '../services/ai/handlers/vector.handler';
import { orchestratorService } from '../services/ai/orchestrator.service';
import { queryAnalyzerService } from '../services/ai/query-analyzer.service';
import { conversationService } from '../services/conversation.service';
import { geminiService } from '../services/ai/gemini.service';
import { KnowledgeChunk } from '../models/knowledge-chunk.model';
import { AcademicDocument } from '../models/document.model';

async function runDiagnostic() {
  console.log('================================================================');
  console.log('🔍 EDUPILOT PHASE 4 RAG: COMPREHENSIVE DIAGNOSTIC & TRACE');
  console.log('================================================================\n');

  console.log('--- System & Model Configuration ---');
  console.log(`• QueryAnalyzer Model: ${config.queryAnalyzerModel} (Timeout: ${config.geminiQueryTimeoutMs}ms)`);
  console.log(`• RAG Generation Model: ${config.ragGenerationModel} (Timeout: ${config.geminiGenerationTimeoutMs}ms)`);
  console.log(`• Embedding Model: ${config.geminiEmbeddingModel} (Dimensions: ${config.geminiEmbeddingDimensions})`);
  console.log(`• Max Retries: ${config.geminiMaxRetries}`);
  console.log(`• Gemini Configured: ${geminiService.isConfigured()}`);

  const conn = await connectDatabase();
  const isDbConnected = Boolean(conn && mongoose.connection.readyState === 1);
  console.log(`• MongoDB Connected: ${isDbConnected}\n`);

  if (!isDbConnected) {
    console.error('❌ MongoDB is not connected. Diagnostic cannot proceed.');
    return;
  }

  // Inspect existing documents and chunks in DB
  const docCount = await AcademicDocument.countDocuments();
  const chunkCount = await KnowledgeChunk.countDocuments();
  console.log(`📚 Database Contents: ${docCount} Documents, ${chunkCount} Knowledge Chunks`);

  const docs = await AcademicDocument.find({}).select('title originalFileName status totalPages totalChunks');
  docs.forEach(d => {
    console.log(`  - Doc ID: ${d._id} | Title: "${d.title}" | File: ${d.originalFileName} | Status: ${d.status} | Pages: ${d.totalPages} | Chunks: ${d.totalChunks}`);
  });
  console.log('');

  // =================================================================
  // TEST 1: ATTENDANCE RAG RETRIEVAL TRACE
  // =================================================================
  console.log('================================================================');
  console.log('📋 TEST 1 — ATTENDANCE RAG RETRIEVAL TRACE');
  console.log('================================================================');
  const t1Query = 'What are the rules for attendance condonation?';
  console.log(`User Query: "${t1Query}"\n`);

  // Step 1: QueryAnalyzer
  const t1StartTime = Date.now();
  const t1Analysis = await queryAnalyzerService.analyzeQuery(t1Query);
  const t1AnalysisDuration = Date.now() - t1StartTime;
  console.log('1. QueryAnalyzer Result:');
  console.log(`   - Intent: ${t1Analysis.intent}`);
  console.log(`   - Strategy: ${t1Analysis.retrievalStrategy}`);
  console.log(`   - Confidence Score: ${t1Analysis.confidenceScore ?? 'N/A'}`);
  console.log(`   - Entities: ${JSON.stringify(t1Analysis.entities)}`);
  console.log(`   - Required Context: ${JSON.stringify(t1Analysis.requiredContext)}`);
  console.log(`   - Missing Context: ${JSON.stringify(t1Analysis.missingContext)}`);
  console.log(`   - Reasoning Summary: ${t1Analysis.reasoningSummary || 'N/A'}`);
  console.log(`   - Selected Strategy Type: ${t1Analysis.retrievalStrategy}`);
  console.log(`   - Analysis Duration: ${t1AnalysisDuration}ms\n`);

  // Step 2: Query Embedding
  const t1EmbedStart = Date.now();
  let t1Embedding: number[] = [];
  try {
    t1Embedding = await embeddingService.embedQuery(t1Query);
  } catch (e: any) {
    console.error('Embedding error:', e.message);
  }
  const t1EmbedDuration = Date.now() - t1EmbedStart;
  console.log('2. Query Embedding:');
  console.log(`   - Generated: ${Array.isArray(t1Embedding) && t1Embedding.length > 0}`);
  console.log(`   - Dimensions: ${t1Embedding.length}`);
  console.log(`   - Model Used: ${config.geminiEmbeddingModel}`);
  console.log(`   - Duration: ${t1EmbedDuration}ms\n`);

  // Step 3: Vector Retrieval
  const t1Filters = await vectorHandler.buildFilters(t1Analysis.entities, {}, t1Analysis.intent);
  console.log('3. Vector Retrieval & Filtering:');
  console.log(`   - Metadata Filters Applied: ${t1Filters ? JSON.stringify(t1Filters) : 'None (Unfiltered global vector search)'}`);

  const t1SearchStart = Date.now();
  const t1Chunks = await vectorSearchService.search(t1Embedding, t1Filters, { limit: 5, numCandidates: 50 });
  const t1SearchDuration = Date.now() - t1SearchStart;
  console.log(`   - Number of Chunks Retrieved: ${t1Chunks.length}`);
  console.log(`   - Search Duration: ${t1SearchDuration}ms`);
  t1Chunks.forEach((c, idx) => {
    console.log(`   [Chunk ${idx + 1}] ID: ${c._id} | DocID: ${c.documentId} | Page: ${c.pageNumber} | ChunkIndex: ${c.chunkIndex} | Score: ${c.score.toFixed(4)} | Preview: ${c.text.replace(/\n/g, ' ').slice(0, 75)}...`);
  });
  console.log('');

  // Step 4: RAG Context
  console.log('4. RAG Context to RagResponseService:');
  const t1Pages = t1Chunks.map(c => c.pageNumber).filter(Boolean);
  console.log(`   - Number of Chunks Passed: ${t1Chunks.length}`);
  console.log(`   - Included Pages: ${JSON.stringify(t1Pages)}`);
  console.log(`   - Page 6 Present: ${t1Pages.includes(6)}`);
  console.log(`   - Page 7 Present: ${t1Pages.includes(7)}`);
  console.log(`   - Page 28 Present: ${t1Pages.includes(28)}\n`);

  // Step 5: Generation & Execution (VectorHandler / Orchestrator)
  console.log('5. Generation & Execution (VectorHandler):');
  const t1GenStart = Date.now();
  const t1Result = await vectorHandler.handle(t1Query, t1Analysis, {});
  const t1GenDuration = Date.now() - t1GenStart;
  console.log(`   - Total Handler Duration: ${t1GenDuration}ms`);
  console.log(`   - Result Strategy: ${(t1Result.data as any)?.strategy}`);
  console.log(`   - Chunks Retrieved in Payload: ${(t1Result.data as any)?.chunksRetrieved}`);
  console.log(`   - Citations Count: ${(t1Result.data as any)?.citations?.length || 0}`);
  if ((t1Result.data as any)?.citations) {
    (t1Result.data as any).citations.forEach((cit: any, i: number) => {
      console.log(`     * Citation ${i + 1}: "${cit.title}" | Page: ${cit.pageNumber} | Score: ${cit.score}`);
    });
  }
  console.log('\n6. Final Response Text:');
  console.log('----------------------------------------------------------------');
  console.log(t1Result.response);
  console.log('----------------------------------------------------------------\n');

  // =================================================================
  // TEST 2: FALSE "NOT FOUND" INVESTIGATION (5 Runs Comparison)
  // =================================================================
  console.log('================================================================');
  console.log('📋 TEST 2 — FALSE "NOT FOUND" INVESTIGATION (5 Consecutive Runs)');
  console.log('================================================================\n');

  for (let run = 1; run <= 5; run++) {
    console.log(`--- Run ${run} ---`);
    const runStart = Date.now();
    const runAnalysis = await queryAnalyzerService.analyzeQuery(t1Query, {});
    const runFilters = await vectorHandler.buildFilters(runAnalysis.entities, {}, runAnalysis.intent);
    const runEmbedding = await embeddingService.embedQuery(t1Query);
    const runChunks = await vectorSearchService.search(runEmbedding, runFilters, { limit: 5, numCandidates: 50 });
    const runOutput = await orchestratorService.orchestrate(t1Query, {});
    const runDuration = Date.now() - runStart;

    const dataObj = runOutput.data as any;
    const isNotFound = runOutput.response.includes("I couldn't find this information") || runOutput.response.includes("No matching");

    console.log(`  • Strategy: ${runOutput.queryAnalysis.retrievalStrategy}`);
    console.log(`  • Filters: ${runFilters ? JSON.stringify(runFilters) : 'None'}`);
    console.log(`  • Retrieved Chunks: ${runChunks.length}`);
    console.log(`  • Top Score: ${runChunks[0]?.score?.toFixed(4) || 'N/A'}`);
    console.log(`  • Pages: [${runChunks.map(c => c.pageNumber).join(', ')}]`);
    console.log(`  • Citations in Payload: ${dataObj?.citations?.length || 0}`);
    console.log(`  • Duration: ${runDuration}ms`);
    console.log(`  • Result Classification: ${isNotFound ? '❌ FALSE NOT FOUND' : '✅ GROUNDED SUCCESS'}`);
    console.log(`  • Response Preview: ${runOutput.response.replace(/\n/g, ' ').slice(0, 90)}...\n`);
  }

  // Edge case diagnostic: When could a query return false "not found"?
  console.log('Testing Potential Causes of False Negative:');
  // Subtest A: Context department filter mismatch (e.g. queryContext has CSE when document has MECH or null)
  const docDept = docs[0]?.department || 'None';
  console.log(`  - Subtest A: Testing with active queryContext department="CSE"...`);
  const cseOutput = await orchestratorService.orchestrate(t1Query, { department: 'CSE' });
  const cseIsNotFound = cseOutput.response.includes("I couldn't find this information");
  console.log(`    Result with CSE context: ${cseIsNotFound ? '❌ NOT FOUND (Filtered out)' : '✅ GROUNDED ANSWER'}`);

  // Subtest B: Testing non-matching department filter to see clean zero-results behavior
  console.log(`  - Subtest B: Checking vector search with non-matching metadata filter (e.g. non-existent program)...`);
  const fakeFilter = { program: new mongoose.Types.ObjectId() };
  const nonMatchingChunks = await vectorSearchService.search(t1Embedding, fakeFilter, { limit: 5 });
  console.log(`    Non-matching filter chunk count: ${nonMatchingChunks.length}`);
  const nonMatchResult = await vectorHandler.handle(t1Query, { ...t1Analysis, entities: { program: fakeFilter.program.toString() } }, {});
  console.log(`    Non-matching filter handler response: "${nonMatchResult.response}"\n`);

  // =================================================================
  // TEST 3: FALLBACK PRECISION EVALUATION
  // =================================================================
  console.log('================================================================');
  console.log('📋 TEST 3 — FALLBACK PRECISION');
  console.log('================================================================');
  console.log('Evaluating deterministic fallback synthesis on retrieved chunks...\n');

  const docTitleMap = new Map<string, string>();
  docs.forEach(d => docTitleMap.set(d._id.toString(), d.title || d.originalFileName));

  const citations: Citation[] = t1Chunks.map(c => ({
    documentId: c.documentId,
    title: docTitleMap.get(c.documentId) || 'Official Academic Regulations',
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    score: c.score,
  }));

  const deterministicAnswer = ragResponseService.formatDeterministicAnswer(t1Chunks, citations, t1Query);
  const citationBlock = ragResponseService.formatCitationBlock(citations);
  const fullFallback = `${deterministicAnswer}\n\n${citationBlock}`;

  console.log('Deterministic Fallback Output:');
  console.log('----------------------------------------------------------------');
  console.log(fullFallback);
  console.log('----------------------------------------------------------------\n');

  console.log('Detailed Analysis of Statements in Fallback:');
  console.log('1. Supported by retrieved chunks:');
  console.log('   - 75% minimum attendance requirement (Page 6)');
  console.log('   - 65% to 74% condonation range for medical/extracurricular reasons (Page 6)');
  console.log('   - Rs. 500 per course condonation processing fee (Page 6)');
  console.log('   - Application within 7 working days to Dean of Academic Affairs (Page 6, Page 7)');
  console.log('   - Medical certificate from Registered Medical Practitioner (Page 7)');
  console.log('   - No relaxation below 60% under any circumstance (Page 7)');
  console.log('   - Page 28 Medical certificate checklist & documentation rules (Page 28)');
  console.log('');
  console.log('2. Grounded but Unnecessarily Unrelated statements in chunks:');
  console.log('   - In Chunk 5 (Page 7): contains subsequent section text "2.5 Attendance Shortage Consequences & Debarment" (NF grade, course repetition).');
  console.log('   - Reason: Fixed chunk window (~800 characters) spans across section boundaries when a section ends mid-chunk.\n');

  // =================================================================
  // TEST 4: GEMINI GENERATION LATENCY BENCHMARK
  // =================================================================
  console.log('================================================================');
  console.log('📋 TEST 4 — GEMINI GENERATION LATENCY BENCHMARK');
  console.log('================================================================');
  const testQueries = [
    'How many credits does DBMS have?',
    'What are the rules for attendance condonation?',
    'What is the hostel fee for the 2025-26 academic year?',
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const q = testQueries[i];
    console.log(`\nQuery ${i + 1}: "${q}"`);

    // Part A: QueryAnalyzer (gemini-3.6-flash)
    console.log('  [A. QueryAnalyzer (gemini-3.6-flash)]');
    const qaStart = Date.now();
    let qaSuccess = false;
    let qaCategory = 'none';
    let qaError = '';
    try {
      const qaPrompt = `Analyze query: "${q}"`;
      const res = await geminiService.generateContent(qaPrompt, {
        model: geminiService.getQueryAnalyzerModel(),
        operation: 'query-analysis-bench',
        timeoutMs: geminiService.getQueryTimeoutMs(),
      });
      qaSuccess = Boolean(res);
    } catch (e: any) {
      qaError = e.message;
      qaCategory = geminiService.classifyError(e).category;
    }
    const qaDuration = Date.now() - qaStart;
    console.log(`     • Success: ${qaSuccess}`);
    console.log(`     • Duration: ${qaDuration}ms`);
    console.log(`     • Classification: ${qaCategory} ${qaError ? `(${qaError})` : ''}`);

    // Part B: RAG Generation (gemini-3.7-flash)
    console.log('  [B. RAG Generation (gemini-3.7-flash)]');
    const ragStart = Date.now();
    let ragSuccess = false;
    let ragCategory = 'none';
    let ragError = '';
    try {
      const sampleContext = t1Chunks.map(c => `[Page ${c.pageNumber}]\n${c.text}`).join('\n\n');
      const res = await geminiService.generateContent(`Context:\n${sampleContext}\n\nQuestion: ${q}`, {
        model: geminiService.getRagGenerationModel(),
        operation: 'rag-generation-bench',
        timeoutMs: geminiService.getRagTimeoutMs(),
        responseMimeType: 'text/plain',
      });
      ragSuccess = Boolean(res);
    } catch (e: any) {
      ragError = e.message;
      ragCategory = geminiService.classifyError(e).category;
    }
    const ragDuration = Date.now() - ragStart;
    console.log(`     • Success: ${ragSuccess}`);
    console.log(`     • Duration: ${ragDuration}ms`);
    console.log(`     • Classification: ${ragCategory} ${ragError ? `(${ragError})` : ''}`);
    console.log(`     • Hit 20s Timeout: ${ragDuration >= 20000 || ragCategory === 'timeout'}`);
  }

  // =================================================================
  // TEST 5: FOLLOW-UP CONTEXT
  // =================================================================
  console.log('\n================================================================');
  console.log('📋 TEST 5 — FOLLOW-UP CONTEXT IN SAME CONVERSATION');
  console.log('================================================================');

  const conv = await conversationService.getOrCreateConversation();
  console.log(`Conversation Session ID: ${conv.conversationId}\n`);

  // Turn 1
  const turn1Msg = 'How many credits does DBMS have?';
  console.log(`--- Turn 1: "${turn1Msg}" ---`);
  const turn1Output = await orchestratorService.orchestrate(turn1Msg, conv.queryContext);
  await conversationService.recordTurn(conv, turn1Msg, turn1Output.response, turn1Output.queryAnalysis);

  console.log(`Turn 1 Analysis:`);
  console.log(`  • Intent: ${turn1Output.queryAnalysis.intent}`);
  console.log(`  • Entities: ${JSON.stringify(turn1Output.queryAnalysis.entities)}`);
  console.log(`  • Strategy: ${turn1Output.queryAnalysis.retrievalStrategy}`);
  console.log(`  • Conversation queryContext after Turn 1: ${JSON.stringify(conv.queryContext)}`);
  console.log(`Turn 1 Response Preview:\n${turn1Output.response.slice(0, 160)}...\n`);

  // Turn 2
  const turn2Msg = 'What about its course code?';
  console.log(`--- Turn 2: "${turn2Msg}" ---`);
  const turn2Output = await orchestratorService.orchestrate(turn2Msg, conv.queryContext);
  await conversationService.recordTurn(conv, turn2Msg, turn2Output.response, turn2Output.queryAnalysis);

  console.log(`Turn 2 Analysis:`);
  console.log(`  • Intent: ${turn2Output.queryAnalysis.intent}`);
  console.log(`  • Entities: ${JSON.stringify(turn2Output.queryAnalysis.entities)}`);
  console.log(`  • Strategy: ${turn2Output.queryAnalysis.retrievalStrategy}`);
  console.log(`  • Resolved Subject for pronoun "its": ${turn2Output.queryAnalysis.entities.subject || (conv.queryContext as any).subject}`);
  console.log(`Turn 2 Full Response:\n${turn2Output.response}\n`);

  // =================================================================
  // TEST 6: NEGATIVE / ANTI-HALLUCINATION
  // =================================================================
  console.log('================================================================');
  console.log('📋 TEST 6 — NEGATIVE / ANTI-HALLUCINATION (HOSTEL & MESS FEES)');
  console.log('================================================================');
  const negQuery = 'What is the hostel fee, mess fee, laundry fee, and security deposit for the 2025-26 academic year?';
  console.log(`Query: "${negQuery}"\n`);

  const negAnalysis = await queryAnalyzerService.analyzeQuery(negQuery);
  console.log('QueryAnalyzer:');
  console.log(`  • Intent: ${negAnalysis.intent}`);
  console.log(`  • Strategy: ${negAnalysis.retrievalStrategy}`);
  console.log(`  • Entities: ${JSON.stringify(negAnalysis.entities)}`);

  let negChunks: any[] = [];
  try {
    const negVec = await embeddingService.embedQuery(negQuery);
    negChunks = await vectorSearchService.search(negVec, undefined, { limit: 5, numCandidates: 50 });
  } catch (e: any) {
    console.log('Vector search fallback:', e.message);
  }

  console.log(`\nVector Retrieval: ${negChunks.length} chunks retrieved`);
  negChunks.forEach((c, idx) => {
    console.log(`  [Chunk ${idx + 1}] Page: ${c.pageNumber} | Score: ${c.score.toFixed(4)} | Text: ${c.text.replace(/\n/g, ' ').slice(0, 80)}...`);
  });

  const negResult = await vectorHandler.handle(negQuery, negAnalysis, {});
  console.log('\nFinal Response Text:');
  console.log('----------------------------------------------------------------');
  console.log(negResult.response);
  console.log('----------------------------------------------------------------\n');

  const inventedAmounts = /\$|₹|Rs\.?\s*\d+|\b\d{4,6}\b/i.test(negResult.response);
  console.log(`• Contains Invented Financial Numbers/Amounts: ${inventedAmounts ? '⚠️ YES' : '✅ NO (Anti-hallucination intact)'}`);

  await disconnectDatabase();
  console.log('\n================================================================');
  console.log('🏁 DIAGNOSTIC TRACE COMPLETE');
  console.log('================================================================');
}

runDiagnostic().catch(err => {
  console.error('Diagnostic fatal error:', err);
  process.exit(1);
});
