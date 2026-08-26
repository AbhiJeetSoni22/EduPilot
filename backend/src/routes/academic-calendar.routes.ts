import { Router } from 'express';
import {
  getCalendarEvents,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../controllers/academic-calendar.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getCalendarEvents);
router.get('/:id', getCalendarEventById);
router.post('/', authenticateToken, requireRole('admin'), createCalendarEvent);
router.put('/:id', authenticateToken, requireRole('admin'), updateCalendarEvent);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteCalendarEvent);

export default router;
