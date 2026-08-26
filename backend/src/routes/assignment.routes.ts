import { Router } from 'express';
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '../controllers/assignment.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAssignments);
router.get('/:id', getAssignmentById);
router.post('/', authenticateToken, requireRole('admin'), createAssignment);
router.put('/:id', authenticateToken, requireRole('admin'), updateAssignment);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteAssignment);

export default router;
