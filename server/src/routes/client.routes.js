import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  updateKyc,
  deleteClient,
  createClientSchema,
  updateClientSchema,
  kycSchema,
} from '../controllers/client.controller.js';

const router = Router();
router.use(authMiddleware);

// Read access for all levels
router.get('/', listClients);
router.get('/:id', getClient);

// L1, L2, and L3 can create clients (brief: Manager creates & manages clients; Sales also registers clients)
router.post('/', rbac(1, 2, 3), validate(createClientSchema), createClient);
// L1 and L2 can update client details
router.patch('/:id', rbac(1, 2), validate(updateClientSchema), updateClient);
// L1 and L2 can update KYC / documentation status
router.patch('/:id/kyc', rbac(1, 2), validate(kycSchema), updateKyc);

// Explicit forbidden route — client master is permanent.
router.delete('/:id', rbac(1), deleteClient);

export default router;
