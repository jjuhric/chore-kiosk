import { Router } from 'express';
import { getDailyAssignments, updateAssignmentStatus, triggerDailyGeneration } from '../controllers/assignmentController';

const router = Router();

router.post('/generate', triggerDailyGeneration);

router.get('/user/:userId', getDailyAssignments);
router.patch('/:id/status', updateAssignmentStatus);

export default router;