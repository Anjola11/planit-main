import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePlanner } from '../middleware/roleCheck.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createTask,
  getEventTasks,
  getTaskStatistics,
  bulkCreateTasks
} from '../controllers/taskController.js';

const router = express.Router({ mergeParams: true }); // mergeParams to access :eventId

// All routes require authentication
router.use(authenticate);

/**
 * Event-specific Task Operations
 * Base path: /api/events/:eventId/tasks
 */

// Get task statistics for event
router.get('/statistics', requirePlanner, asyncHandler(getTaskStatistics));

// Bulk create tasks
router.post('/bulk', requirePlanner, asyncHandler(bulkCreateTasks));

// Create task for event
router.post('/', requirePlanner, asyncHandler(createTask));

// Get all tasks for event
router.get('/', asyncHandler(getEventTasks));

export default router;