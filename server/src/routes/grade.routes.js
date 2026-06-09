import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listGrades, createGrade, updateGrade, deleteGrade, gradeSchema } from '../controllers/grade.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listGrades);
router.post('/', rbac(1), validate(gradeSchema), createGrade);
router.patch('/:id', rbac(1), updateGrade);
router.delete('/:id', rbac(1), deleteGrade);

export default router;
