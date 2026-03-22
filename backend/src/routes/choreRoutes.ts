import { Router } from 'express';
import { getChores, createChore, deleteChore } from '../controllers/choreController';

const router = Router();

router.get('/', getChores);
router.post('/', createChore);
router.delete('/:id', deleteChore);

export default router;