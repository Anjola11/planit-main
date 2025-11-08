import { Event } from '../models/event.js';
import { Task } from '../models/task.js';
import { BaseUser } from '../models/baseUser.js';
import { Vendor } from '../models/vendor.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../middleware/errorHandler.js';

/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private (Planner only)
 */
export const createEvent = async (req, res) => {
  const eventData = {
    ...req.body,
    plannerId: req.user.id
  };

  const event = await Event.create(eventData);

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: event
  });
};

/**
 * @desc    Get all events for current planner
 * @route   GET /api/events
 * @access  Private (Planner only)
 */
export const getEvents = async (req, res) => {
  const { status, completed, eventType } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (completed !== undefined) filters.completed = completed === 'true';
  if (eventType) filters.eventType = eventType;

  const events = await Event.getByPlannerId(req.user.id, filters);

  res.status(200).json({
    success: true,
    count: events.length,
    data: events
  });
};

/**
 * @desc    Get event by ID
 * @route   GET /api/events/:id
 * @access  Private (Planner only - own events)
 */
export const getEventById = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  // Check if planner owns this event
  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  res.status(200).json({
    success: true,
    data: event
  });
};

/**
 * @desc    Update event
 * @route   PUT /api/events/:id
 * @access  Private (Planner only - own events)
 */
export const updateEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const updatedEvent = await Event.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    data: updatedEvent
  });
};

/**
 * @desc    Delete event
 * @route   DELETE /api/events/:id
 * @access  Private (Planner only - own events)
 */
export const deleteEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  // Delete all tasks associated with this event
  await Task.deleteByEventId(req.params.id);

  // Delete event
  await Event.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Event deleted successfully'
  });
};

/**
 * @desc    Add vendor to event by vendor ID
 * @route   POST /api/events/:id/vendors
 * @access  Private (Planner only - own events)
 */
export const addVendorToEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const { vendorId, role } = req.body;

  if (!vendorId) {
    throw new ValidationError('Vendor ID is required');
  }

  // Get vendor details
  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    throw new NotFoundError('Vendor not found');
  }

  if (vendor.role !== 'vendor') {
    throw new ValidationError('User is not a vendor');
  }

  const vendorData = {
    vendorId: vendor.id,
    vendorName: vendor.fullName,
    vendorEmail: vendor.email,
    vendorBusinessName: vendor.businessName || vendor.fullName,
    category: vendor.category,
    role: role || vendor.category || 'vendor',
    addedBy: req.user.id
  };

  const updatedEvent = await Event.addVendor(req.params.id, vendorData);

  res.status(200).json({
    success: true,
    message: 'Vendor added to event successfully',
    data: updatedEvent
  });
};

/**
 * @desc    Add vendor to event by email
 * @route   POST /api/events/:id/vendors/by-email
 * @access  Private (Planner only - own events)
 */
export const addVendorByEmail = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const { email, role } = req.body;

  if (!email) {
    throw new ValidationError('Email is required');
  }

  // Find vendor by email
  const vendor = await BaseUser.findByEmail(email);

  if (!vendor) {
    throw new NotFoundError('User with this email not found');
  }

  if (vendor.role !== 'vendor') {
    throw new ValidationError('User is not a vendor');
  }

  const vendorData = {
    vendorId: vendor.id,
    vendorName: vendor.fullName,
    vendorEmail: vendor.email,
    vendorBusinessName: vendor.businessName || vendor.fullName,
    category: vendor.category,
    role: role || vendor.category || 'vendor',
    addedBy: req.user.id
  };

  const updatedEvent = await Event.addVendor(req.params.id, vendorData);

  res.status(200).json({
    success: true,
    message: 'Vendor added to event successfully',
    data: updatedEvent
  });
};

/**
 * @desc    Remove vendor from event
 * @route   DELETE /api/events/:id/vendors/:vendorId
 * @access  Private (Planner only - own events)
 */
export const removeVendorFromEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const updatedEvent = await Event.removeVendor(req.params.id, req.params.vendorId);

  res.status(200).json({
    success: true,
    message: 'Vendor removed from event successfully',
    data: updatedEvent
  });
};

/**
 * @desc    Update vendor status in event
 * @route   PUT /api/events/:id/vendors/:vendorId/status
 * @access  Private (Planner or Vendor)
 */
export const updateVendorStatus = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  const { status } = req.body;

  if (!['pending', 'confirmed', 'declined'].includes(status)) {
    throw new ValidationError('Invalid status. Must be: pending, confirmed, or declined');
  }

  // Allow planner or the vendor themselves to update status
  const isPlanner = event.plannerId === req.user.id;
  const isVendor = req.params.vendorId === req.user.id;

  if (!isPlanner && !isVendor) {
    throw new AuthorizationError('You do not have permission to update this vendor status');
  }

  const updatedEvent = await Event.updateVendorStatus(req.params.id, req.params.vendorId, status);

  res.status(200).json({
    success: true,
    message: 'Vendor status updated successfully',
    data: updatedEvent
  });
};

/**
 * @desc    Get all vendors for an event
 * @route   GET /api/events/:id/vendors
 * @access  Private (Planner only - own events)
 */
export const getEventVendors = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  res.status(200).json({
    success: true,
    count: event.vendors.length,
    data: event.vendors
  });
};

/**
 * @desc    Update event status
 * @route   PUT /api/events/:id/status
 * @access  Private (Planner only - own events)
 */
export const updateEventStatus = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.plannerId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this event');
  }

  const { status } = req.body;

  if (!['planning', 'in-progress', 'completed', 'cancelled'].includes(status)) {
    throw new ValidationError('Invalid status');
  }

  const updatedEvent = await Event.updateStatus(req.params.id, status);

  res.status(200).json({
    success: true,
    message: 'Event status updated successfully',
    data: updatedEvent
  });
};

/**
 * @desc    Get event statistics for planner
 * @route   GET /api/events/statistics
 * @access  Private (Planner only)
 */
export const getEventStatistics = async (req, res) => {
  const statistics = await Event.getStatistics(req.user.id);

  res.status(200).json({
    success: true,
    data: statistics
  });
};

/**
 * @desc    Search events
 * @route   GET /api/events/search
 * @access  Private (Planner only)
 */
export const searchEvents = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    throw new ValidationError('Search query is required');
  }

  const events = await Event.search(req.user.id, q);

  res.status(200).json({
    success: true,
    count: events.length,
    data: events
  });
};