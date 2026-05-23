import { Router } from 'express';
import fermentationRoutes from './fermentation.js';
import orderRoutes from './orders.js';
import pourRoutes from './pours.js';
import flavouringRoutes from './flavouring.js';
import bomRoutes from './boms.js';
import taskboardRoutes from './taskboard.js';
import dashboardRoutes from './dashboard.js';

const router = Router();

router.use(fermentationRoutes);
router.use(orderRoutes);
router.use(pourRoutes);
router.use(flavouringRoutes);
router.use(bomRoutes);
router.use(taskboardRoutes);
router.use(dashboardRoutes);

export default router;
