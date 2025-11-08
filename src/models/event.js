import { db, collections } from '../config/firebase.js';

/**
 * Event Model
 */
export class Event {
  /**
   * Create a new event
   */
  static async create(eventData) {
    const {
      name,
      description,
      date,
      startTime,
      endTime,
      location,
      address,
      plannerId,
      budget,
      eventType,
      guestCount
    } = eventData;

    const event = {
      name,
      description: description || '',
      date: date, // ISO date string
      startTime: startTime || null,
      endTime: endTime || null,
      location: location || '',
      address: {
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        country: address?.country || '',
        zipCode: address?.zipCode || ''
      },
      plannerId,
      budget: budget || null,
      eventType: eventType || 'other', // wedding, birthday, corporate, conference, etc.
      guestCount: guestCount || 0,
      vendors: [], // Array of { vendorId, vendorName, vendorEmail, role, status, addedAt }
      tasks: [], // Array of task IDs
      status: 'planning', // planning, in-progress, completed, cancelled
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const eventRef = await db().collection(collections.EVENTS).add(event);

    return {
      id: eventRef.id,
      ...event
    };
  }

  /**
   * Find event by ID
   */
  static async findById(eventId) {
    const doc = await db().collection(collections.EVENTS).doc(eventId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data()
    };
  }

  /**
   * Get all events for a planner
   */
  static async getByPlannerId(plannerId, filters = {}) {
    let query = db()
      .collection(collections.EVENTS)
      .where('plannerId', '==', plannerId);

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.completed !== undefined) {
      query = query.where('completed', '==', filters.completed);
    }

    if (filters.eventType) {
      query = query.where('eventType', '==', filters.eventType);
    }

    // Order by date
    query = query.orderBy('date', 'desc');

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get all events where vendor is added
   */
  static async getByVendorId(vendorId) {
    const snapshot = await db()
      .collection(collections.EVENTS)
      .where('vendors', 'array-contains-any', [{ vendorId }])
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Update event
   */
  static async update(eventId, updateData) {
    const eventRef = db().collection(collections.EVENTS).doc(eventId);

    const updates = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await eventRef.update(updates);

    const updated = await eventRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  /**
   * Add vendor to event
   */
  static async addVendor(eventId, vendorData) {
    const event = await this.findById(eventId);
    
    if (!event) {
      return null;
    }

    // Check if vendor already exists
    const vendorExists = event.vendors.some(v => v.vendorId === vendorData.vendorId);
    
    if (vendorExists) {
      throw new Error('Vendor already added to this event');
    }

    const vendor = {
      vendorId: vendorData.vendorId,
      vendorName: vendorData.vendorName,
      vendorEmail: vendorData.vendorEmail,
      vendorBusinessName: vendorData.vendorBusinessName || vendorData.vendorName,
      role: vendorData.role || 'vendor', // e.g., photographer, caterer, decorator
      category: vendorData.category || null,
      status: 'pending', // pending, confirmed, declined
      addedAt: new Date().toISOString(),
      addedBy: vendorData.addedBy || 'planner'
    };

    event.vendors.push(vendor);

    return await this.update(eventId, { vendors: event.vendors });
  }

  /**
   * Remove vendor from event
   */
  static async removeVendor(eventId, vendorId) {
    const event = await this.findById(eventId);
    
    if (!event) {
      return null;
    }

    const vendors = event.vendors.filter(v => v.vendorId !== vendorId);

    return await this.update(eventId, { vendors });
  }

  /**
   * Update vendor status in event
   */
  static async updateVendorStatus(eventId, vendorId, status) {
    const event = await this.findById(eventId);
    
    if (!event) {
      return null;
    }

    const vendors = event.vendors.map(v => 
      v.vendorId === vendorId ? { ...v, status, updatedAt: new Date().toISOString() } : v
    );

    return await this.update(eventId, { vendors });
  }

  /**
   * Add task to event
   */
  static async addTask(eventId, taskId) {
    const event = await this.findById(eventId);
    
    if (!event) {
      return null;
    }

    if (!event.tasks.includes(taskId)) {
      event.tasks.push(taskId);
      return await this.update(eventId, { tasks: event.tasks });
    }

    return event;
  }

  /**
   * Remove task from event
   */
  static async removeTask(eventId, taskId) {
    const event = await this.findById(eventId);
    
    if (!event) {
      return null;
    }

    const tasks = event.tasks.filter(t => t !== taskId);

    return await this.update(eventId, { tasks });
  }

  /**
   * Update event status
   */
  static async updateStatus(eventId, status) {
    const completed = status === 'completed';
    
    return await this.update(eventId, { 
      status, 
      completed,
      ...(completed && { completedAt: new Date().toISOString() })
    });
  }

  /**
   * Delete event
   */
  static async delete(eventId) {
    await db().collection(collections.EVENTS).doc(eventId).delete();
  }

  /**
   * Get event statistics for planner
   */
  static async getStatistics(plannerId) {
    const events = await this.getByPlannerId(plannerId);

    const totalEvents = events.length;
    const completedEvents = events.filter(e => e.completed).length;
    const upcomingEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= new Date() && !e.completed;
    }).length;
    const inProgressEvents = events.filter(e => e.status === 'in-progress').length;

    return {
      totalEvents,
      completedEvents,
      upcomingEvents,
      inProgressEvents,
      completionRate: totalEvents > 0 ? (completedEvents / totalEvents * 100).toFixed(1) : 0
    };
  }

  /**
   * Search events
   */
  static async search(plannerId, searchTerm) {
    const events = await this.getByPlannerId(plannerId);
    
    const term = searchTerm.toLowerCase();
    return events.filter(event => 
      event.name?.toLowerCase().includes(term) ||
      event.location?.toLowerCase().includes(term) ||
      event.eventType?.toLowerCase().includes(term)
    );
  }
}