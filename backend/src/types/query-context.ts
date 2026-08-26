/**
 * QueryContext represents optional conversation and retrieval parameters
 * supplied during natural language queries.
 * 
 * IMPORTANT ARCHITECTURAL NOTE:
 * Query context parameters (such as rollNumber, department, or semester) are NOT
 * authentication credentials and do NOT imply identity verification. They are
 * purely contextual filters used to retrieve relevant public academic information.
 */
export interface QueryContext {
  rollNumber?: string;
  department?: string;
  program?: string;
  semester?: number;
  academicYear?: string;
  subject?: string;
}
