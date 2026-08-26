import { Router } from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subject.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getSubjects);
router.get('/:id', getSubjectById);
router.post('/', authenticateToken, requireRole('admin'), createSubject);
router.put('/:id', authenticateToken, requireRole('admin'), updateSubject);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteSubject);

export default router;
