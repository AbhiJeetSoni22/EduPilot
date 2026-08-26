import { Router } from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, requireRole('admin'), getUsers);
router.get('/:id', authenticateToken, requireRole('admin'), getUserById);
router.put('/:id', authenticateToken, requireRole('admin'), updateUser);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteUser);

export default router;
