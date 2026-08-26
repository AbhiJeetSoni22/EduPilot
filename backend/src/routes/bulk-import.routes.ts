import { Router } from 'express';
import { validateImport, confirmImport } from '../controllers/bulk-import.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { importUpload } from '../middleware/upload.middleware';

const router = Router();

router.post(
  '/validate',
  authenticateToken,
  requireRole('admin'),
  importUpload.single('file'),
  validateImport
);

router.post('/confirm', authenticateToken, requireRole('admin'), confirmImport);

export default router;
