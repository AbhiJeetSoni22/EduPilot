import { Router } from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getDepartments);
router.get('/:id', getDepartmentById);
router.post('/', authenticateToken, requireRole('admin'), createDepartment);
router.put('/:id', authenticateToken, requireRole('admin'), updateDepartment);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteDepartment);

export default router;
