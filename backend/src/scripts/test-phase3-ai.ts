import dotenv from 'dotenv';
import path from 'path';
import { queryAnalyzerService } from '../services/ai/query-analyzer.service';
import { validateAndNormalizeQueryAnalysis } from '../services/ai/query-analysis.schema';
import { QueryContext } from '../types/query-context';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface TestCase {
  id: number;
  name: string;
  input: string;
  context?: QueryContext;
  assert: (res: any) => boolean;
  expectedDescription: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 1,
    name: 'General Concept Question',
    input: 'What is DBMS?',
    assert: (res) =>
      res.intent === 'concept_explanation' &&
      res.retrievalStrategy === 'direct' &&
      res.missingContext.length === 0,
    expectedDescription: 'intent=concept_explanation, strategy=direct, missingContext=[]',
  },
  {
    id: 2,
    name: 'Subject Credits Lookup',
    input: 'How many credits does DBMS have?',
    assert: (res) =>
      res.intent === 'subject_credits' &&
      res.retrievalStrategy === 'structured' &&
      Boolean(res.entities.subject),
    expectedDescription: 'intent=subject_credits, strategy=structured, entities.subject=DBMS',
  },
  {
    id: 3,
    name: 'Exam Query with Complete Context',
    input: 'When is the DBMS exam for CSE semester 5?',
    assert: (res) =>
      res.intent === 'exam_schedule' &&
      res.retrievalStrategy === 'structured' &&
      res.missingContext.length === 0,
    expectedDescription: 'intent=exam_schedule, strategy=structured, missingContext=[]',
  },
  {
    id: 4,
    name: 'Exam Query Missing Required Context',
    input: 'When is my next exam?',
    assert: (res) =>
      res.intent === 'exam_schedule' &&
      res.retrievalStrategy === 'clarification' &&
      res.missingContext.length > 0,
    expectedDescription: 'intent=exam_schedule, strategy=clarification, missingContext=[department, semester]',
  },
  {
    id: 5,
    name: 'Institutional Policy Question',
    input: 'What does the university attendance policy say?',
    assert: (res) =>
      res.intent === 'attendance_policy' &&
      res.retrievalStrategy === 'vector',
    expectedDescription: 'intent=attendance_policy, strategy=vector',
  },
  {
    id: 6,
    name: 'Hybrid Timetable + Syllabus Query',
    input: 'When is my DBMS exam and what topics are included in the syllabus?',
    assert: (res) =>
      res.retrievalStrategy === 'hybrid',
    expectedDescription: 'strategy=hybrid',
  },
  {
    id: 7,
    name: 'Context Reuse Across Conversation',
    input: 'What exams do I have?',
    context: { department: 'CSE', semester: 5 },
    assert: (res) =>
      res.intent === 'exam_schedule' &&
      res.retrievalStrategy === 'structured' &&
      res.missingContext.length === 0,
    expectedDescription: 'strategy=structured, missingContext=[] (reusing CSE Sem 5)',
  },
  {
    id: 8,
    name: 'Standalone Course Code Lookup',
    input: 'What is the course code of DBMS?',
    assert: (res) =>
      res.intent === 'subject_credits' &&
      res.retrievalStrategy === 'structured' &&
      res.entities.subject === 'DBMS',
    expectedDescription: 'intent=subject_credits, strategy=structured, entities.subject=DBMS',
  },
  {
    id: 9,
    name: 'Follow-up Course Code with Context ("What about its course code?")',
    input: 'What about its course code?',
    context: { subject: 'DBMS' },
    assert: (res) =>
      res.intent === 'subject_credits' &&
      res.retrievalStrategy === 'structured' &&
      res.entities.subject === 'DBMS',
    expectedDescription: 'intent=subject_credits, strategy=structured, entities.subject=DBMS (resolved from context)',
  },
  {
    id: 10,
    name: 'Follow-up Course Code without Context (Anti-Hallucination)',
    input: 'What about its course code?',
    assert: (res) =>
      res.intent === 'subject_credits' &&
      res.retrievalStrategy === 'clarification' &&
      res.missingContext.includes('subject'),
    expectedDescription: 'intent=subject_credits, strategy=clarification, missingContext=[subject]',
  },
];

function testSchemaValidationFallback(): boolean {
  console.log('\n--- Running Schema Validation & Malformed Input Test ---');
  const malformedInput = {
    intent: 'UNKNOWN_CUSTOM_STRING',
    retrievalStrategy: 'INVALID_STRATEGY',
    entities: { semester: 'not_a_number' },
    requiredContext: 'not_an_array',
  };

  const validation = validateAndNormalizeQueryAnalysis(malformedInput);
  const isValid = validation.isValid;
  const normalized = validation.data;

  console.log('Malformed Input Validation Result:', {
    isValid,
    normalizedIntent: normalized?.intent,
    normalizedStrategy: normalized?.retrievalStrategy,
    normalizedSemester: normalized?.entities.semester,
  });

  return isValid && normalized?.intent === 'unknown' && normalized?.retrievalStrategy === 'direct';
}

async function runAllTests() {
  console.log('=================================================================');
  console.log('🧪 Running Phase 3 AI Query Analyzer Verification Suite');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    process.stdout.write(`Test ${tc.id}: ${tc.name} ... `);
    try {
      // Test deterministic query analyzer (guaranteed unit test contract)
      const result = queryAnalyzerService.deterministicFallbackAnalyze(tc.input, tc.context || {});
      const ok = tc.assert(result);

      if (ok) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        console.log(`   Expected: ${tc.expectedDescription}`);
        console.log(`   Received: intent=${result.intent}, strategy=${result.retrievalStrategy}, missingContext=[${result.missingContext.join(', ')}]`);
        failed++;
      }
    } catch (err) {
      console.log('❌ ERROR');
      console.error(err);
      failed++;
    }
  }

  const schemaOk = testSchemaValidationFallback();
  if (schemaOk) {
    console.log('✅ Schema Validation Fallback: PASSED');
    passed++;
  } else {
    console.log('❌ Schema Validation Fallback: FAILED');
    failed++;
  }

  console.log('\n=================================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================\n');

  if (failed === 0) {
    console.log('🎉 All Phase 3 Query Analysis test cases passed successfully!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests();
