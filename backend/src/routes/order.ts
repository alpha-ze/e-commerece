import { Router } from 'express';
import { verifyJWT, requireRole } from '../middleware/auth';
import {
  createOrderHandler,
  getOrdersHandler,
  getOrderHandler,
  cancelOrderHandler,
  returnOrderHandler,
} from '../controllers/order';

const router = Router();

const customerAuth = [verifyJWT, requireRole('customer', 'admin')];

router.get('/', customerAuth, getOrdersHandler);
router.get('/:id', customerAuth, getOrderHandler);
router.post('/', customerAuth, createOrderHandler);
router.delete('/:id', customerAuth, cancelOrderHandler);
router.post('/:id/return', customerAuth, returnOrderHandler);

export default router;
