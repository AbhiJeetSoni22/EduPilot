import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import departmentRoutes from './department.routes';
import programRoutes from './program.routes';
import subjectRoutes from './subject.routes';
import examRoutes from './exam.routes';
import assignmentRoutes from './assignment.routes';
import academicCalendarRoutes from './academic-calendar.routes';
import regulationRoutes from './regulation.routes';
import documentRoutes from './document.routes';
import bulkImportRoutes from './bulk-import.routes';
import userRoutes from './user.routes';
import chatRoutes from './chat.routes';

const router = Router();

// Mount active endpoints
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/departments', departmentRoutes);
router.use('/programs', programRoutes);
router.use('/subjects', subjectRoutes);
router.use('/exams', examRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/academic-calendar', academicCalendarRoutes);
router.use('/regulations', regulationRoutes);
router.use('/documents', documentRoutes);
router.use('/bulk-import', bulkImportRoutes);
router.use('/users', userRoutes);

export default router;
