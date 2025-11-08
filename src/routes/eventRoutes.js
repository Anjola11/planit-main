import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePlanner } from '../middleware/roleCheck.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addVendorToEvent,
  addVendorByEmail,
  removeVendorFromEvent,
  updateVendorStatus,
  getEventVendors,
  updateEventStatus,
  getEventStatistics,
  searchEvents
} from '../controllers/eventController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Event CRUD Operations
 */
// Get event statistics (must be before /:id route)
router.get('/statistics', requirePlanner, asyncHandler(getEventStatistics));

// Search events (must be before /:id route)
router.get('/search', requirePlanner, asyncHandler(searchEvents));

// Create event
router.post('/', requirePlanner, asyncHandler(createEvent));

// Get all events for current planner
router.get('/', requirePlanner, asyncHandler(getEvents));

// Get event by ID
router.get('/:id', asyncHandler(getEventById));

// Update event
router.put('/:id', requirePlanner, asyncHandler(updateEvent));

// Delete event
router.delete('/:id', requirePlanner, asyncHandler(deleteEvent));

/**
 * Event Status Management
 */
router.put('/:id/status', requirePlanner, asyncHandler(updateEventStatus));

/**
 * Vendor Management
 */
// Get all vendors for an event
router.get('/:id/vendors', asyncHandler(getEventVendors));

// Add vendor to event by vendor ID
router.post('/:id/vendors', requirePlanner, asyncHandler(addVendorToEvent));

// Add vendor to event by email
router.post('/:id/vendors/by-email', requirePlanner, asyncHandler(addVendorByEmail));

// Remove vendor from event
router.delete('/:id/vendors/:vendorId', requirePlanner, asyncHandler(removeVendorFromEvent));

// Update vendor status in event
router.put('/:id/vendors/:vendorId/status', asyncHandler(updateVendorStatus));

export default router;