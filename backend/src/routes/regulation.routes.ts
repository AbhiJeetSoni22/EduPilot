import { Router } from 'express';
import {
  getRegulations,
  getRegulationById,
  createRegulation,
  updateRegulation,
  deleteRegulation,
} from '../controllers/regulation.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getRegulations);
router.get('/:id', getRegulationById);
router.post('/', authenticateToken, requireRole('admin'), createRegulation);
router.put('/:id', authenticateToken, requireRole('admin'), updateRegulation);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteRegulation);

export default router;
