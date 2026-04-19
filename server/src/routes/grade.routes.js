import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listGrades, createGrade, updateGrade, gradeSchema } from '../controllers/grade.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listGrades);
router.post('/', rbac(1), validate(gradeSchema), createGrade);
router.patch('/:id', rbac(1), updateGrade);

export default router;
