import { Router } from 'express';
import { getQueryAnalytics } from '../controllers/analytics.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, requireRole('admin'), getQueryAnalytics);

export default router;
