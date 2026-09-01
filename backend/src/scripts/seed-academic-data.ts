import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';
import { connectDatabase } from '../config/db';
import { logger } from '../utils/logger';
import {
  User,
  Department,
  Program,
  Subject,
  Exam,
  Assignment,
  AcademicCalendar,
  Regulation,
  AcademicDocument,
} from '../models';

async function seed(): Promise<void> {
  logger.info('Starting Phase 2 Academic Data Seeding...');
  
  const conn = await connectDatabase();
  if (!conn) {
    logger.error('Cannot connect to MongoDB. Aborting seed.');
    process.exit(1);
  }

  try {
    // Clear existing collections safely
    logger.info('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Program.deleteMany({}),
      Subject.deleteMany({}),
      Exam.deleteMany({}),
      Assignment.deleteMany({}),
      AcademicCalendar.deleteMany({}),
      Regulation.deleteMany({}),
      AcademicDocument.deleteMany({}),
    ]);

    // 1. Seed Departments
    logger.info('Seeding Departments...');
    const cseDept = await Department.create({
      name: 'Department of Computer Science & Engineering',
      code: 'CSE',
      description: 'Focuses on computing theory, systems software, AI, and distributed architectures.',
      status: 'active',
    });

    const eceDept = await Department.create({
      name: 'Department of Electronics & Communication Engineering',
      code: 'ECE',
      description: 'Focuses on microelectronics, signal processing, VLSI, and communication networks.',
      status: 'active',
    });

    // 2. Seed Programs
    logger.info('Seeding Programs...');
    const btechCse = await Program.create({
      name: 'Bachelor of Technology in Computer Science & Engineering',
      code: 'BTECH-CSE',
      department: cseDept._id,
      degreeType: 'Undergraduate',
      durationYears: 4,
      totalSemesters: 8,
      academicYear: '2025-26',
      status: 'active',
    });

    const mscAibda = await Program.create({
      name: 'M.Sc in Artificial Intelligence & Big Data Analytics',
      code: 'MSC-AIBDA',
      department: cseDept._id,
      degreeType: 'Postgraduate',
      durationYears: 2,
      totalSemesters: 4,
      academicYear: '2025-26',
      status: 'active',
    });

    const btechEce = await Program.create({
      name: 'Bachelor of Technology in Electronics & Communication',
      code: 'BTECH-ECE',
      department: eceDept._id,
      degreeType: 'Undergraduate',
      durationYears: 4,
      totalSemesters: 8,
      academicYear: '2025-26',
      status: 'active',
    });

    // 3. Seed Users
    logger.info('Seeding Users...');
    const adminUser = new User({
      name: 'Dr. Eleanor Vance (Dean Academic Affairs)',
      email: 'admin@edupilot.edu',
      password: 'Admin@123456',
      role: 'admin',
      department: cseDept._id,
      academicYear: '2025-26',
      isActive: true,
    });
    await adminUser.save();

    const studentUser = new User({
      name: 'Aarav Sharma',
      email: 'student@edupilot.edu',
      password: 'Student@123456',
      role: 'student',
      department: cseDept._id,
      program: btechCse._id,
      semester: 5,
      academicYear: '2025-26',
      isActive: true,
    });
    await studentUser.save();

    // 4. Seed Subjects (Semester 5 CSE)
    logger.info('Seeding Subjects...');
    const dbms = await Subject.create({
      name: 'Database Management Systems',
      code: 'CS501',
      department: cseDept._id,
      program: btechCse._id,
      semester: 5,
      credits: 4,
      type: 'Theory + Practical',
      academicYear: '2025-26',
      description: 'Comprehensive study of relational models, SQL, indexing, transaction processing, and concurrency control.',
      syllabusUnits: [
        {
          unitNumber: 1,
          title: 'Relational Model & Relational Algebra',
          topics: ['Entity-Relationship Model', 'Relational Schemas', 'Relational Algebra Operations', 'Tuple Calculus'],
          hours: 10,
        },
        {
          unitNumber: 2,
          title: 'Structured Query Language (SQL)',
          topics: ['Complex Joins', 'Nested Subqueries', 'Aggregate Functions', 'Views & Triggers'],
          hours: 12,
        },
        {
          unitNumber: 3,
          title: 'Database Normalization & Storage',
          topics: ['Functional Dependencies', '1NF, 2NF, 3NF, BCNF', 'Lossless Decomposition', 'B+ Tree Indexing'],
          hours: 10,
        },
        {
          unitNumber: 4,
          title: 'Transaction Management & Concurrency',
          topics: ['ACID Properties', 'Serializability', 'Two-Phase Locking (2PL)', 'Deadlock Prevention & Detection'],
          hours: 10,
        },
      ],
      evaluationScheme: {
        internalMarks: 40,
        externalMarks: 60,
        totalMarks: 100,
        passingMarks: 40,
      },
      status: 'active',
    });

    const os = await Subject.create({
      name: 'Operating Systems',
      code: 'CS502',
      department: cseDept._id,
      program: btechCse._id,
      semester: 5,
      credits: 4,
      type: 'Theory + Practical',
      academicYear: '2025-26',
      description: 'Core concepts of operating system architecture, process scheduling, memory management, and file systems.',
      syllabusUnits: [
        {
          unitNumber: 1,
          title: 'Process Management & Scheduling',
          topics: ['Process State Models', 'Threads & Context Switching', 'CPU Scheduling Algorithms', 'Real-Time Scheduling'],
          hours: 10,
        },
        {
          unitNumber: 2,
          title: 'Process Synchronization',
          topics: ['Critical Section Problem', 'Semaphores & Mutexes', 'Classical IPC Problems', 'Monitors'],
          hours: 10,
        },
        {
          unitNumber: 3,
          title: 'Memory Management & Virtual Memory',
          topics: ['Paging & Segmentation', 'Page Replacement Algorithms (FIFO, LRU, Optimal)', 'Thrashing', 'Working Set Model'],
          hours: 12,
        },
        {
          unitNumber: 4,
          title: 'Storage & Distributed File Systems',
          topics: ['Disk Scheduling (SSTF, SCAN, LOOK)', 'RAID Levels', 'File Allocation Methods', 'Distributed Security'],
          hours: 8,
        },
      ],
      evaluationScheme: {
        internalMarks: 40,
        externalMarks: 60,
        totalMarks: 100,
        passingMarks: 40,
      },
      status: 'active',
    });

    const cn = await Subject.create({
      name: 'Computer Networks',
      code: 'CS503',
      department: cseDept._id,
      program: btechCse._id,
      semester: 5,
      credits: 4,
      type: 'Theory',
      academicYear: '2025-26',
      description: 'OSI and TCP/IP protocol stacks, routing algorithms, transport protocols, and network security.',
      syllabusUnits: [
        {
          unitNumber: 1,
          title: 'Data Link Layer & Error Handling',
          topics: ['Framing', 'CRC & Hamming Codes', 'Flow Control (Sliding Window)', 'Medium Access Control (CSMA/CD)'],
          hours: 10,
        },
        {
          unitNumber: 2,
          title: 'Network Layer & Routing',
          topics: ['IPv4 & IPv6 Addressing', 'Subnetting & CIDR', 'Dijkstra Routing', 'Distance Vector & BGP'],
          hours: 12,
        },
        {
          unitNumber: 3,
          title: 'Transport Layer Protocols',
          topics: ['TCP 3-Way Handshake', 'UDP Characteristics', 'TCP Congestion Control (Tahoe/Reno)', 'Flow Control'],
          hours: 10,
        },
        {
          unitNumber: 4,
          title: 'Application Layer & Network Security',
          topics: ['DNS & HTTP/HTTPS Architecture', 'TLS Handshake', 'Public Key Cryptography', 'Firewalls'],
          hours: 8,
        },
      ],
      evaluationScheme: {
        internalMarks: 40,
        externalMarks: 60,
        totalMarks: 100,
        passingMarks: 40,
      },
      status: 'active',
    });

    const se = await Subject.create({
      name: 'Software Engineering & Agile Methodologies',
      code: 'CS504',
      department: cseDept._id,
      program: btechCse._id,
      semester: 5,
      credits: 3,
      type: 'Theory',
      academicYear: '2025-26',
      description: 'Software development life cycles, requirement engineering, architectural design patterns, and Agile/Scrum practices.',
      syllabusUnits: [
        {
          unitNumber: 1,
          title: 'Software Process & Agile Modeling',
          topics: ['SDLC Models (Waterfall, Spiral, V-Model)', 'Agile Manifesto & Principles', 'Scrum Framework & Sprints', 'User Stories'],
          hours: 8,
        },
        {
          unitNumber: 2,
          title: 'Requirements Engineering & UML',
          topics: ['Functional vs Non-Functional Requirements', 'Use Case Modeling', 'Sequence & Class Diagrams', 'Statecharts'],
          hours: 10,
        },
        {
          unitNumber: 3,
          title: 'Architectural Design & Quality Assurance',
          topics: ['Microservices vs Monoliths', 'SOLID Principles', 'Unit Testing & Test-Driven Development', 'CI/CD Pipelines'],
          hours: 10,
        },
      ],
      evaluationScheme: {
        internalMarks: 40,
        externalMarks: 60,
        totalMarks: 100,
        passingMarks: 40,
      },
      status: 'active',
    });

    // 5. Seed Exams
    logger.info('Seeding Exams...');
    await Exam.create([
      {
        title: 'Mid-Semester Exam — Database Management Systems',
        subject: dbms._id,
        subjectCode: 'CS501',
        department: cseDept._id,
        program: btechCse._id,
        semester: 5,
        academicYear: '2025-26',
        examType: 'Mid-Semester',
        examDate: new Date('2026-09-15T10:00:00Z'),
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        venue: 'Examination Hall B — Room 201',
        maxMarks: 50,
        instructions: [
          'Bring your official student ID and hall ticket.',
          'Scientific calculators are permitted; mobile phones are strictly prohibited.',
          'Units 1 and 2 are covered in this mid-semester examination.',
        ],
        status: 'scheduled',
      },
      {
        title: 'Mid-Semester Exam — Operating Systems',
        subject: os._id,
        subjectCode: 'CS502',
        department: cseDept._id,
        program: btechCse._id,
        semester: 5,
        academicYear: '2025-26',
        examType: 'Mid-Semester',
        examDate: new Date('2026-09-17T10:00:00Z'),
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        venue: 'Examination Hall B — Room 201',
        maxMarks: 50,
        instructions: [
          'Arrival 15 minutes before scheduled start is mandatory.',
          'Units 1 and 2 covered.',
        ],
        status: 'scheduled',
      },
      {
        title: 'Mid-Semester Exam — Computer Networks',
        subject: cn._id,
        subjectCode: 'CS503',
        department: cseDept._id,
        program: btechCse._id,
        semester: 5,
        academicYear: '2025-26',
        examType: 'Mid-Semester',
        examDate: new Date('2026-09-19T10:00:00Z'),
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        venue: 'Examination Hall A — Room 102',
        maxMarks: 50,
        instructions: [
          'Subnetting tables will not be provided; calculate manually.',
        ],
        status: 'scheduled',
      },
      {
        title: 'End-Semester Comprehensive Exam — Software Engineering',
        subject: se._id,
        subjectCode: 'CS504',
        department: cseDept._id,
        program: btechCse._id,
        semester: 5,
        academicYear: '2025-26',
        examType: 'End-Semester',
        examDate: new Date('2026-11-20T09:30:00Z'),
        startTime: '09:30 AM',
        endTime: '12:30 PM',
        venue: 'Main Academic Auditorium',
        maxMarks: 100,
        instructions: [
          'Covers entire syllabus (Units 1-3).',
          'Standard passing mark threshold is 40% in final theory.',
        ],
        status: 'scheduled',
      },
    ]);

    // 6. Seed Assignments
    logger.info('Seeding Assignments...');
    await Assignment.create([
      {
        title: 'Assignment 1: Complex SQL Queries & Optimization',
        subject: dbms._id,
        subjectCode: 'CS501',
        department: cseDept._id,
        program: btechCse._id,
        semester: 5,
        academicYear: '2025-26',
        description: 'Design ER diagram and implement relational schema with at least 15 complex SQL queries involving aggregations, subqueries, and window functions.',
        dueDate: new Date('2026-09-10T23:59:59Z'),
        totalMarks: 20,
        weightage: 10,
        submissionFormat: 'PDF',
        instructions: [
          'Include query execution plans and index comparison benchmarks.',
          'Submit a typed PDF report with source SQL scripts in appendix.',
        ],
        status: 'active',
      },
      {
        title: 'Assignment 2: CPU Scheduling Algorithm Simulator',
        subject: os._id,
        subjectCode: 'CS502',
        department: cseDept._id,
        program: btechCse._id,
        semester: 5,
        academicYear: '2025-26',
        description: 'Implement a discrete-event CPU scheduling simulator in C/C++ or Python comparing FCFS, SJF, Round Robin (varying quanta), and Priority Preemptive.',
        dueDate: new Date('2026-09-22T23:59:59Z'),
        totalMarks: 25,
        weightage: 15,
        submissionFormat: 'Code Repository',
        instructions: [
          'Host code on GitHub with README detailing compilation steps.',
          'Plot Gantt charts and turnaround time vs waiting time distributions.',
        ],
        status: 'active',
      },
      {
        title: 'Assignment 1: TCP/IP Subnetting & Packet Analysis',
        subject: cn._id,
        subjectCode: 'CS503',
        department: cseDept._id,
        program: btechCse._id,
        semester: 5,
        academicYear: '2025-26',
        description: 'Capture live network traffic using Wireshark, dissect the TCP 3-way handshake and HTTP/2 frames, and solve assigned VLSM subnetting problems.',
        dueDate: new Date('2026-09-28T23:59:59Z'),
        totalMarks: 20,
        weightage: 10,
        submissionFormat: 'PDF',
        instructions: [
          'Include labeled Wireshark screenshots showing sequence numbers and ACKs.',
        ],
        status: 'active',
      },
      {
        title: 'Mini-Project: Agile Sprint Planning & Architectural Document',
        subject: se._id,
        subjectCode: 'CS504',
        department: cseDept._id,
        program: btechCse._id,
        semester: 5,
        academicYear: '2025-26',
        description: 'Form a 4-person team, author a Software Requirements Specification (SRS) in IEEE 830 format, create complete UML architecture models, and plan a 3-sprint backlog.',
        dueDate: new Date('2026-10-15T23:59:59Z'),
        totalMarks: 30,
        weightage: 20,
        submissionFormat: 'PDF',
        instructions: [
          'Ensure traceability matrix connects each requirement to test cases.',
        ],
        status: 'active',
      },
    ]);

    // 7. Seed Academic Calendar
    logger.info('Seeding Academic Calendar...');
    await AcademicCalendar.create([
      {
        title: 'Academic Orientation & Semester Registration',
        academicYear: '2025-26',
        semester: 'Odd',
        eventType: 'Registration',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-03'),
        description: 'Mandatory online subject selection and fee settlement for all undergraduate semesters.',
        isHoliday: false,
        targetAudience: 'Students',
      },
      {
        title: 'Commencement of Regular Academic Instruction',
        academicYear: '2025-26',
        semester: 'Odd',
        eventType: 'Academic',
        startDate: new Date('2025-08-04'),
        endDate: new Date('2025-08-04'),
        description: 'First day of instruction for Odd Semester 2025-26.',
        isHoliday: false,
        targetAudience: 'All',
      },
      {
        title: 'Independence Day Observance',
        academicYear: '2025-26',
        semester: 'Odd',
        eventType: 'Holiday',
        startDate: new Date('2025-08-15'),
        endDate: new Date('2025-08-15'),
        description: 'National holiday — University offices and lecture halls remain closed.',
        isHoliday: true,
        targetAudience: 'All',
      },
      {
        title: 'Mid-Semester Examination Window',
        academicYear: '2025-26',
        semester: 'Odd',
        eventType: 'Examination',
        startDate: new Date('2025-09-15'),
        endDate: new Date('2025-09-24'),
        description: 'Centralized mid-term assessments for all B.Tech departments.',
        isHoliday: false,
        targetAudience: 'Students',
      },
      {
        title: 'Annual Technical Festival — TechNexus 2025',
        academicYear: '2025-26',
        semester: 'Odd',
        eventType: 'Event',
        startDate: new Date('2025-10-02'),
        endDate: new Date('2025-10-06'),
        description: 'Inter-collegiate robotics, hackathon, and coding symposium.',
        isHoliday: false,
        targetAudience: 'All',
      },
      {
        title: 'Internal Assessment & Laboratory Records Submission Deadline',
        academicYear: '2025-26',
        semester: 'Odd',
        eventType: 'Deadline',
        startDate: new Date('2025-11-05'),
        endDate: new Date('2025-11-05'),
        description: 'Last date for faculty to upload internal assessment marks and attendance records.',
        isHoliday: false,
        targetAudience: 'Faculty',
      },
      {
        title: 'End-Semester Practical & Viva-Voce Examinations',
        academicYear: '2025-26',
        semester: 'Odd',
        eventType: 'Examination',
        startDate: new Date('2025-11-10'),
        endDate: new Date('2025-11-16'),
        description: 'Laboratory evaluations with external university examiners.',
        isHoliday: false,
        targetAudience: 'Students',
      },
      {
        title: 'End-Semester Theory Examinations',
        academicYear: '2025-26',
        semester: 'Odd',
        eventType: 'Examination',
        startDate: new Date('2025-11-20'),
        endDate: new Date('2025-12-05'),
        description: 'Comprehensive University End-Semester examinations.',
        isHoliday: false,
        targetAudience: 'Students',
      },
    ]);

    // 8. Seed Regulations
    logger.info('Seeding Regulations...');
    await Regulation.create([
      {
        regulationCode: 'REG-2025-ATT-01',
        title: 'Minimum Attendance Requirement for Examination Eligibility',
        category: 'attendance',
        academicYear: '2025-26',
        summary: 'Requires a minimum of 75% aggregate attendance in each enrolled subject to be eligible to appear for the End-Semester Examination.',
        content: `1. Eligibility Threshold: Every student must attain a minimum aggregate physical attendance of 75% in all lectures, tutorials, and practical sessions of each subject.\n2. Condonation Provisions: The Dean of Academic Affairs may condone attendance shortages between 65% and 74.9% on verified medical grounds supported by a government hospital certificate or sanctioned representation in university sports/cultural events.\n3. Debarment (F-Attendance): Students with attendance falling below 65% are strictly debarred from appearing in the End-Semester Examination and will be awarded an 'FA' (Fail due to Attendance) grade, requiring course repetition in the subsequent year.`,
        keyRules: [
          'Minimum 75% attendance required across all subjects',
          'Medical condonation permitted between 65% and 74.9%',
          'Strict debarment below 65% with mandatory course repeat',
        ],
        status: 'active',
        version: '1.2',
      },
      {
        regulationCode: 'REG-2025-GRD-02',
        title: '10-Point Relative Grading System and SGPA/CGPA Computation',
        category: 'grading',
        academicYear: '2025-26',
        summary: 'Defines the university 10-point letter grading scale, conversion formulas, and cumulative GPA calculation standards.',
        content: `1. Grade Scale:\n- O (Outstanding): Grade Point 10 (Marks >= 90%)\n- A+ (Excellent): Grade Point 9 (Marks 80-89%)\n- A (Very Good): Grade Point 8 (Marks 70-79%)\n- B+ (Good): Grade Point 7 (Marks 60-69%)\n- B (Above Average): Grade Point 6 (Marks 50-59%)\n- C (Pass): Grade Point 5 (Marks 40-49%)\n- F (Fail): Grade Point 0 (Marks < 40%)\n2. SGPA Formula: SGPA = Sum(Credit_i * GradePoint_i) / Sum(Credit_i)\n3. Passing Criteria: Minimum 40% aggregate and minimum 35% in final theory exam is mandatory to clear a subject.`,
        keyRules: [
          '10-point scale: O (10), A+ (9), A (8), B+ (7), B (6), C (5), F (0)',
          'Minimum 40% total marks required to obtain passing grade C',
          'SGPA calculated on total registered credits per semester',
        ],
        status: 'active',
        version: '2.0',
      },
      {
        regulationCode: 'REG-2025-PRM-03',
        title: 'Yearly Promotion Criteria and Maximum Allowable Backlogs',
        category: 'promotion',
        academicYear: '2025-26',
        summary: 'Specifies criteria to progress from 2nd year to 3rd year and 3rd year to 4th year based on cleared credits.',
        content: `1. Progression to 3rd Year (Semester 5): A student must have earned at least 60% of the total cumulative credits of Semesters 1 and 2 with no more than 4 uncleared backlog subjects.\n2. Progression to 4th Year (Semester 7): A student must have cleared all First Year subjects completely and earned at least 70% of total cumulative credits of Semesters 1 through 4.`,
        keyRules: [
          'Max 4 active backlogs allowed for entry to 3rd Year',
          'All 1st Year subjects must be cleared before entering 4th Year',
          'Minimum cumulative CGPA of 5.0 required for degree award',
        ],
        status: 'active',
        version: '1.0',
      },
      {
        regulationCode: 'REG-2025-REV-04',
        title: 'Answer Script Re-evaluation and Challenge Valuation Protocol',
        category: 'examination',
        academicYear: '2025-26',
        summary: 'Standard operating procedure for viewing evaluated answer scripts and applying for re-evaluation.',
        content: `1. Application Window: Students may apply for re-evaluation within 15 calendar days from the date of official result declaration.\n2. Script Inspection: Students can view digital copies of their evaluated answer sheets upon payment of nominal inspection fee.\n3. Mark Revision: If the re-evaluation score differs by +5% or more, the revised score will replace the original score. If marks decrease, the original marks remain preserved.`,
        keyRules: [
          'Application deadline: 15 days from result announcement',
          'Marks updated if revised score increases by 5% or higher',
          'Lower re-evaluation marks will not disadvantage the student',
        ],
        status: 'active',
        version: '1.1',
      },
      {
        regulationCode: 'REG-2025-DIS-05',
        title: 'Institutional Code of Academic Integrity and Anti-Plagiarism Policy',
        category: 'disciplinary',
        academicYear: '2025-26',
        summary: 'Guidelines prohibiting plagiarism, unauthorized collaboration, and exam malpractice.',
        content: `1. Plagiarism Threshold: All project reports, term papers, and thesis submissions must pass institutional plagiarism detection with similarity index <= 15% (excluding citations).\n2. Examination Malpractice: Possessing unauthorized notes, digital communication devices, or impersonation leads to automatic cancellation of the entire semester examination series and suspension for one academic year.`,
        keyRules: [
          'Similarity index must be under 15% for all project deliverables',
          'Strict zero-tolerance policy for examination hall malpractice',
        ],
        status: 'active',
        version: '1.0',
      },
    ]);

    // 9. Seed Sample Knowledge Base Documents
    logger.info('Seeding Knowledge Base Documents...');
    // Create physical sample PDF/TXT files in backend/uploads/documents/
    const uploadDocsDir = path.resolve(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadDocsDir)) {
      fs.mkdirSync(uploadDocsDir, { recursive: true });
    }

    const handbookSamplePath = path.join(uploadDocsDir, 'sample-handbook-2025.txt');
    const examRulesSamplePath = path.join(uploadDocsDir, 'sample-exam-code-2025.txt');

    fs.writeFileSync(
      handbookSamplePath,
      'EduPilot University Academic Handbook 2025-26\nOfficial Rules, Regulations, and Department Guidelines.'
    );
    fs.writeFileSync(
      examRulesSamplePath,
      'EduPilot University Examination Code of Conduct\nStrict Guidelines for Students and Faculty Proctors.'
    );

    await AcademicDocument.create([
      {
        title: 'Official Academic Regulations & Curriculum Guide 2025-26',
        documentType: 'academic_regulations',
        department: cseDept._id,
        program: btechCse._id,
        academicYear: '2025-26',
        version: '1.0',
        status: 'uploaded',
        originalFileName: 'Academic_Regulations_2025_26.pdf',
        fileSize: 1048576, // 1MB
        mimeType: 'application/pdf',
        storageReference: 'uploads/documents/sample-handbook-2025.txt',
        uploadedBy: adminUser._id,
        tags: ['regulations', 'attendance', 'grading', 'btech-cse'],
        description: 'Complete official handbook containing academic rules, credit structure, and promotion policies for undergraduate engineering students.',
      },
      {
        title: 'Undergraduate Examination Code of Conduct & Proctor Guidelines',
        documentType: 'examination_rules',
        department: cseDept._id,
        program: btechCse._id,
        academicYear: '2025-26',
        version: '1.1',
        status: 'uploaded',
        originalFileName: 'Exam_Code_Of_Conduct_2025.pdf',
        fileSize: 524288, // 512KB
        mimeType: 'application/pdf',
        storageReference: 'uploads/documents/sample-exam-code-2025.txt',
        uploadedBy: adminUser._id,
        tags: ['examination', 'malpractice', 'hall-ticket', 'guidelines'],
        description: 'Official code of conduct for semester examinations, hall ticket rules, and disciplinary procedures.',
      },
    ]);

    logger.info('====================================================');
    logger.info('✅ Phase 2 Academic Data Seeding Completed Successfully!');
    logger.info('====================================================');
    logger.info('Admin Credentials:   admin@edupilot.edu   / Admin@123456');
    logger.info('Student Credentials: student@edupilot.edu / Student@123456');
    logger.info('====================================================');

    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

seed();
