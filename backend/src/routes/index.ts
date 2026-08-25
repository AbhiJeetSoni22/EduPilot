import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Mount health check
router.use('/health', healthRoutes);

// Planned routes will be mounted here in future phases:
// router.use('/auth', authRoutes);
// router.use('/chat', chatRoutes);
// router.use('/exams', examRoutes);
// router.use('/subjects', subjectRoutes);
// router.use('/assignments', assignmentRoutes);
// router.use('/regulations', regulationRoutes);

export default router;
