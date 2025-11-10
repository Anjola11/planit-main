import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePlanner, requireVendor } from '../middleware/roleCheck.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getPlannerDashboard,
  getVendorDashboard,
  getVendorBookings,
  updateVendorAvailability
} from '../controllers/dashboardController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Planner dashboard
router.get('/planner', requirePlanner, asyncHandler(getPlannerDashboard));

// Vendor dashboard
router.get('/vendor', requireVendor, asyncHandler(getVendorDashboard));
router.get('/vendor/bookings', requireVendor, asyncHandler(getVendorBookings));
router.put('/vendor/availability', requireVendor, asyncHandler(updateVendorAvailability));

export default router;