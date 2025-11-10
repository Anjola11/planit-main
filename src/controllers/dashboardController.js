import { Event } from '../models/event.js';
import { Task } from '../models/task.js';
import { Vendor } from '../models/vendor.js';
import { ROLES } from '../models/baseUser.js';

/**
 * @desc    Get planner dashboard statistics
 * @route   GET /api/dashboard/planner
 * @access  Private (Planner only)
 */
export const getPlannerDashboard = async (req, res) => {
  const plannerId = req.user.id;

  // Get all events
  const allEvents = await Event.getByPlannerId(plannerId);

  // Active events (planning or in-progress)
  const activeEvents = allEvents.filter(
    e => e.status === 'planning' || e.status === 'in-progress'
  );

  // Upcoming events
  const upcomingEvents = allEvents.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate >= new Date() && !e.completed;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get all tasks for planner
  const allTasks = await Task.getByPlannerId(plannerId);

  // Active tasks (pending or in-progress)
  const activeTasks = allTasks.filter(
    t => t.status === 'pending' || t.status === 'in-progress'
  );

  // Overdue tasks
  const overdueTasks = allTasks.filter(t => {
    if (!t.dueDate || t.completed) return false;
    return new Date(t.dueDate) < new Date();
  });

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalEvents: allEvents.length,
        activeEvents: activeEvents.length,
        completedEvents: allEvents.filter(e => e.completed).length,
        totalTasks: allTasks.length,
        activeTasks: activeTasks.length,
        completedTasks: allTasks.filter(t => t.completed).length,
        overdueTasks: overdueTasks.length
      },
      upcomingEvents: upcomingEvents.slice(0, 5), // Show 5 most recent
      recentEvents: allEvents.slice(0, 6) // Show 6 most recent for grid
    }
  });
};

/**
 * @desc    Get vendor dashboard statistics
 * @route   GET /api/dashboard/vendor
 * @access  Private (Vendor only)
 */
export const getVendorDashboard = async (req, res) => {
  const vendorId = req.user.id;

  // Get all events where vendor is added
  const allEvents = await Event.getByVendorId(vendorId);

  // Filter events by vendor status
  const activeBookings = allEvents.filter(e => {
    const vendorEntry = e.vendors.find(v => v.vendorId === vendorId);
    return vendorEntry && vendorEntry.status === 'confirmed' && !e.completed;
  });

  const pendingBookings = allEvents.filter(e => {
    const vendorEntry = e.vendors.find(v => v.vendorId === vendorId);
    return vendorEntry && vendorEntry.status === 'pending';
  });

  // Upcoming events
  const upcomingEvents = activeBookings.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate >= new Date();
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Get assigned tasks
  const allTasks = await Task.getByAssignedUser(vendorId);
  const activeTasks = allTasks.filter(
    t => t.status === 'pending' || t.status === 'in-progress'
  );

  // Get vendor profile completion
  const profileCompletion = await Vendor.getProfileCompletion(vendorId);

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        activeBookings: activeBookings.length,
        pendingBookings: pendingBookings.length,
        completedBookings: allEvents.filter(e => e.completed).length,
        activeTasks: activeTasks.length,
        completedTasks: allTasks.filter(t => t.completed).length
      },
      profileCompletion,
      upcomingEvents: upcomingEvents.slice(0, 5),
      recentBookings: allEvents.slice(0, 6)
    }
  });
};

/**
 * @desc    Get vendor bookings with details
 * @route   GET /api/dashboard/vendor/bookings
 * @access  Private (Vendor only)
 */
export const getVendorBookings = async (req, res) => {
  const vendorId = req.user.id;
  const { status } = req.query; // pending, confirmed, declined

  let events = await Event.getByVendorId(vendorId);

  // Filter by status if provided
  if (status) {
    events = events.filter(e => {
      const vendorEntry = e.vendors.find(v => v.vendorId === vendorId);
      return vendorEntry && vendorEntry.status === status;
    });
  }

  // Sort by date
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.status(200).json({
    success: true,
    count: events.length,
    data: events
  });
};

/**
 * @desc    Update vendor availability
 * @route   PUT /api/dashboard/vendor/availability
 * @access  Private (Vendor only)
 */
export const updateVendorAvailability = async (req, res) => {
  const { availability } = req.body;

  if (typeof availability !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Availability must be a boolean value'
    });
  }

  await Vendor.updateProfile(req.user.id, { availability });

  res.status(200).json({
    success: true,
    message: `Availability updated to ${availability ? 'available' : 'unavailable'}`,
    data: { availability }
  });
};