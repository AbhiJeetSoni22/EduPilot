import { Router } from 'express';
import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  deleteDocument,
  downloadDocument,
} from '../controllers/document.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { documentUpload } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.get('/:id/download', downloadDocument);
router.post(
  '/upload',
  authenticateToken,
  requireRole('admin'),
  documentUpload.single('file'),
  uploadDocument
);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteDocument);

export default router;
