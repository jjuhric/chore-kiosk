import { Router } from 'express';
import { generateLoginQR, loginWithQR } from '../controllers/authController';

const router = Router();

router.post('/generate-qr', generateLoginQR);
router.post('/login', loginWithQR);

export default router;