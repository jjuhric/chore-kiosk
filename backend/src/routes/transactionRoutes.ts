import { Router } from 'express';
import { processPayout } from '../controllers/transactionController';

const router = Router();

router.post('/payout', processPayout);

export default router;