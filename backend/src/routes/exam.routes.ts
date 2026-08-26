import { Router } from 'express';
import {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
} from '../controllers/exam.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', authenticateToken, requireRole('admin'), createExam);
router.put('/:id', authenticateToken, requireRole('admin'), updateExam);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteExam);

export default router;
