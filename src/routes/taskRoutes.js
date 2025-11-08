import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePlanner } from '../middleware/roleCheck.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createTask,
  getEventTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  updateTaskStatus,
  markTaskCompleted,
  getMyTasks,
  getTaskStatistics,
  bulkCreateTasks
} from '../controllers/taskController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * My Tasks (for any authenticated user)
 */
router.get('/my-tasks', asyncHandler(getMyTasks));

/**
 * Individual Task Operations
 */
// Get task by ID
router.get('/:id', asyncHandler(getTaskById));

// Update task
router.put('/:id', requirePlanner, asyncHandler(updateTask));

// Delete task
router.delete('/:id', requirePlanner, asyncHandler(deleteTask));

/**
 * Task Assignment
 */
// Assign task to user
router.put('/:id/assign', requirePlanner, asyncHandler(assignTask));

// Unassign task
router.delete('/:id/assign', requirePlanner, asyncHandler(unassignTask));

/**
 * Task Status Management
 */
// Update task status
router.put('/:id/status', asyncHandler(updateTaskStatus));

// Mark task as completed
router.put('/:id/complete', asyncHandler(markTaskCompleted));

export default router;