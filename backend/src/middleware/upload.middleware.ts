import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadBaseDir = path.resolve(process.cwd(), 'uploads');
const documentsDir = path.join(uploadBaseDir, 'documents');
const tempDir = path.join(uploadBaseDir, 'temp');

[uploadBaseDir, documentsDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage engine for Knowledge Base documents
const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

// Storage engine for Bulk Import CSV/JSON (memory or temp)
const importStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `import-${uniqueSuffix}-${file.originalname}`);
  },
});

// File filter for Documents
const documentFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT documents are allowed.'));
  }
};

// File filter for Bulk Import
const importFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = ['text/csv', 'application/json', 'text/plain'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) || ext === '.csv' || ext === '.json') {
    cb(null, true);
  } else {
    cb(new Error('Invalid import file. Only CSV and JSON files are supported.'));
  }
};

export const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
  fileFilter: documentFileFilter,
});

export const importUpload = multer({
  storage: importStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: importFileFilter,
});
