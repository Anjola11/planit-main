import { Task } from '../models/Task.js';
import { Event } from '../models/event.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../middleware/errorHandler.js';

/**
 * @desc    Create a new task
 * @route   POST /api/events/:eventId/tasks
 * @access  Private (Planner only)
 */
export const createTask = async (req, res) => {
  const event = await Event.findById(req.params.eventId);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const taskData = {
    ...req.body,
    eventId: req.params.eventId,
    plannerId: req.user.id
  };

  const task = await Task.create(taskData);

  // Add task ID to event
  await Event.addTask(req.params.eventId, task.id);

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: task
  });
};

/**
 * @desc    Get all tasks for an event
 * @route   GET /api/events/:eventId/tasks
 * @access  Private (Planner or assigned user)
 */
export const getEventTasks = async (req, res) => {
  const event = await Event.findById(req.params.eventId);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  // Check if user is planner or assigned to event
  const isPlanner = event.plannerId === req.user.id;
  const isAssignedVendor = event.vendors.some(v => v.vendorId === req.user.id);

  if (!isPlanner && !isAssignedVendor) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const { status, priority, assignedTo, completed } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (assignedTo) filters.assignedTo = assignedTo;
  if (completed !== undefined) filters.completed = completed === 'true';

  const tasks = await Task.getByEventId(req.params.eventId, filters);

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
};

/**
 * @desc    Get task by ID
 * @route   GET /api/tasks/:id
 * @access  Private (Planner or assigned user)
 */
export const getTaskById = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Check if user is planner or assigned to this task
  const isPlanner = task.plannerId === req.user.id;
  const isAssigned = task.assignedTo?.userId === req.user.id;

  if (!isPlanner && !isAssigned) {
    throw new AuthorizationError('You do not have access to this task');
  }

  res.status(200).json({
    success: true,
    data: task
  });
};

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private (Planner only)
 */
export const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  if (task.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this task');
  }

  const updatedTask = await Task.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: updatedTask
  });
};

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private (Planner only)
 */
export const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  if (task.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this task');
  }

  // Remove task from event
  await Event.removeTask(task.eventId, req.params.id);

  // Delete task
  await Task.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully'
  });
};

/**
 * @desc    Assign task to user (vendor)
 * @route   PUT /api/tasks/:id/assign
 * @access  Private (Planner only)
 */
export const assignTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  if (task.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this task');
  }

  const { userId, userName, userEmail, userRole } = req.body;

  if (!userId || !userName || !userEmail) {
    throw new ValidationError('User ID, name, and email are required');
  }

  // Verify user is added to the event
  const event = await Event.findById(task.eventId);
  const isVendorInEvent = event.vendors.some(v => v.vendorId === userId);

  if (!isVendorInEvent) {
    throw new ValidationError('User must be added to the event before assigning tasks');
  }

  const assignedTo = {
    userId,
    userName,
    userEmail,
    userRole: userRole || 'vendor',
    assignedAt: new Date().toISOString()
  };

  const updatedTask = await Task.assignTask(req.params.id, assignedTo);

  res.status(200).json({
    success: true,
    message: 'Task assigned successfully',
    data: updatedTask
  });
};

/**
 * @desc    Unassign task
 * @route   DELETE /api/tasks/:id/assign
 * @access  Private (Planner only)
 */
export const unassignTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  if (task.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this task');
  }

  const updatedTask = await Task.unassignTask(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Task unassigned successfully',
    data: updatedTask
  });
};

/**
 * @desc    Update task status
 * @route   PUT /api/tasks/:id/status
 * @access  Private (Planner or assigned user)
 */
export const updateTaskStatus = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  const isPlanner = task.plannerId === req.user.id;
  const isAssigned = task.assignedTo?.userId === req.user.id;

  if (!isPlanner && !isAssigned) {
    throw new AuthorizationError('You do not have access to this task');
  }

  const { status } = req.body;

  if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
    throw new ValidationError('Invalid status');
  }

  const updatedTask = await Task.updateStatus(req.params.id, status);

  res.status(200).json({
    success: true,
    message: 'Task status updated successfully',
    data: updatedTask
  });
};

/**
 * @desc    Mark task as completed
 * @route   PUT /api/tasks/:id/complete
 * @access  Private (Planner or assigned user)
 */
export const markTaskCompleted = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  const isPlanner = task.plannerId === req.user.id;
  const isAssigned = task.assignedTo?.userId === req.user.id;

  if (!isPlanner && !isAssigned) {
    throw new AuthorizationError('You do not have access to this task');
  }

  const updatedTask = await Task.markCompleted(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Task marked as completed',
    data: updatedTask
  });
};

/**
 * @desc    Get my assigned tasks
 * @route   GET /api/tasks/my-tasks
 * @access  Private (Any authenticated user)
 */
export const getMyTasks = async (req, res) => {
  const { status, completed } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (completed !== undefined) filters.completed = completed === 'true';

  const tasks = await Task.getByAssignedUser(req.user.id, filters);

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
};

/**
 * @desc    Get task statistics for event
 * @route   GET /api/events/:eventId/tasks/statistics
 * @access  Private (Planner only)
 */
export const getTaskStatistics = async (req, res) => {
  const event = await Event.findById(req.params.eventId);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const statistics = await Task.getEventStatistics(req.params.eventId);

  res.status(200).json({
    success: true,
    data: statistics
  });
};

/**
 * @desc    Bulk create tasks
 * @route   POST /api/events/:eventId/tasks/bulk
 * @access  Private (Planner only)
 */
export const bulkCreateTasks = async (req, res) => {
  const event = await Event.findById(req.params.eventId);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const { tasks } = req.body;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new ValidationError('Tasks array is required and must not be empty');
  }

  // Add eventId and plannerId to each task
  const tasksData = tasks.map(task => ({
    ...task,
    eventId: req.params.eventId,
    plannerId: req.user.id
  }));

  const createdTasks = await Task.bulkCreate(tasksData);

  // Add all task IDs to event
  for (const task of createdTasks) {
    await Event.addTask(req.params.eventId, task.id);
  }

  res.status(201).json({
    success: true,
    message: `${createdTasks.length} tasks created successfully`,
    data: createdTasks
  });
};