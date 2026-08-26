import { Router } from 'express';
import {
  getPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
} from '../controllers/program.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getPrograms);
router.get('/:id', getProgramById);
router.post('/', authenticateToken, requireRole('admin'), createProgram);
router.put('/:id', authenticateToken, requireRole('admin'), updateProgram);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteProgram);

export default router;
