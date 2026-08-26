import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Admin / Staff Authentication routes
router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
