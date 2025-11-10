import { db, collections } from '../config/firebase.js';
import { BaseUser, ROLES } from './baseUser.js';

/**
 * Planner class with planner-specific functionality
 */
export class Planner extends BaseUser {
  /**
   * Create a new event planner
   */
  static async create(plannerData) {
    const {
      email,
      password,
      fullName,
      profilePicture,
      // Planner-specific fields
      bio,
      preferences,
      notifications
    } = plannerData;

    // Create base user
    const baseUser = await super.create({
      email,
      password,
      fullName,
      role: ROLES.PLANNER,
      profilePicture
    });

    // Add planner-specific data
    const plannerSpecificData = {
      bio: bio || '',
      notifications: notifications || [],
      eventsCount: 0,
      completedEventsCount: 0
    };

    // Update user document with planner-specific fields
    await db().collection(collections.USERS).doc(baseUser.id).update(plannerSpecificData);

    return {
      id: baseUser.id,
      ...baseUser,
      ...plannerSpecificData
    };
  }

  /**
   * Update planner profile
   */
  static async updateProfile(plannerId, updateData) {
    const allowedFields = [
      'fullName',
      'profilePicture',
      'bio',
      'preferences'
    ];

    const filteredUpdates = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updateData[key];
      }
    });

    return await super.update(plannerId, filteredUpdates);
  }

  /**
   * Get all planners
   */
  static async getAll() {
    const snapshot = await db()
      .collection(collections.USERS)
      .where('role', '==', ROLES.PLANNER)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      password: undefined
    }));
  }



  /**
   * Add notification
   */
  static async addNotification(plannerId, notification) {
    const planner = await super.findById(plannerId);
    const notifications = planner.notifications || [];
    
    notifications.unshift({
      id: Date.now().toString(),
      ...notification,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.splice(50);
    }

    return await super.update(plannerId, { notifications });
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(plannerId, notificationId) {
    const planner = await super.findById(plannerId);
    const notifications = (planner.notifications || []).map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    );

    return await super.update(plannerId, { notifications });
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsRead(plannerId) {
    const planner = await super.findById(plannerId);
    const notifications = (planner.notifications || []).map(notif => ({ 
      ...notif, 
      read: true 
    }));

    return await super.update(plannerId, { notifications });
  }

  /**
   * Update event counts
   */
  static async updateEventCounts(plannerId, eventsCount, completedEventsCount) {
    return await super.update(plannerId, {
      eventsCount,
      completedEventsCount
    });
  }

  /**
   * Increment events count
   */
  static async incrementEventsCount(plannerId) {
    const planner = await super.findById(plannerId);
    const eventsCount = (planner.eventsCount || 0) + 1;

    return await super.update(plannerId, { eventsCount });
  }

  /**
   * Increment completed events count
   */
  static async incrementCompletedEventsCount(plannerId) {
    const planner = await super.findById(plannerId);
    const completedEventsCount = (planner.completedEventsCount || 0) + 1;

    return await super.update(plannerId, { completedEventsCount });
  }
}