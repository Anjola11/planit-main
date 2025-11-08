import { db, collections } from '../config/firebase.js';

/**
 * Task Model
 */
export class Task {
  /**
   * Create a new task
   */
  static async create(taskData) {
    const {
      title,
      description,
      eventId,
      plannerId,
      assignedTo, // { userId, userName, userEmail, userRole }
      dueDate,
      priority,
      category
    } = taskData;

    const task = {
      title,
      description: description || '',
      eventId,
      plannerId,
      assignedTo: assignedTo || null, // Can be null if not assigned yet
      dueDate: dueDate || null,
      priority: priority || 'medium', // low, medium, high, urgent
      category: category || 'general', // general, setup, catering, decoration, etc.
      status: 'pending', // pending, in-progress, completed, cancelled
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    const taskRef = await db().collection(collections.TASKS).add(task);

    return {
      id: taskRef.id,
      ...task
    };
  }

  /**
   * Find task by ID
   */
  static async findById(taskId) {
    const doc = await db().collection(collections.TASKS).doc(taskId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data()
    };
  }

  /**
   * Get all tasks for an event
   */
  static async getByEventId(eventId, filters = {}) {
    let query = db()
      .collection(collections.TASKS)
      .where('eventId', '==', eventId);

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.priority) {
      query = query.where('priority', '==', filters.priority);
    }

    if (filters.assignedTo) {
      query = query.where('assignedTo.userId', '==', filters.assignedTo);
    }

    if (filters.completed !== undefined) {
      query = query.where('completed', '==', filters.completed);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get all tasks for a planner
   */
  static async getByPlannerId(plannerId, filters = {}) {
    let query = db()
      .collection(collections.TASKS)
      .where('plannerId', '==', plannerId);

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.completed !== undefined) {
      query = query.where('completed', '==', filters.completed);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get tasks assigned to a user (vendor or staff)
   */
  static async getByAssignedUser(userId, filters = {}) {
    let query = db()
      .collection(collections.TASKS)
      .where('assignedTo.userId', '==', userId);

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.completed !== undefined) {
      query = query.where('completed', '==', filters.completed);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Update task
   */
  static async update(taskId, updateData) {
    const taskRef = db().collection(collections.TASKS).doc(taskId);

    const updates = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await taskRef.update(updates);

    const updated = await taskRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  /**
   * Assign task to user
   */
  static async assignTask(taskId, assignedTo) {
    return await this.update(taskId, { assignedTo });
  }

  /**
   * Unassign task
   */
  static async unassignTask(taskId) {
    return await this.update(taskId, { assignedTo: null });
  }

  /**
   * Update task status
   */
  static async updateStatus(taskId, status) {
    const updates = { status };
    
    if (status === 'completed') {
      updates.completed = true;
      updates.completedAt = new Date().toISOString();
    } else {
      updates.completed = false;
      updates.completedAt = null;
    }

    return await this.update(taskId, updates);
  }

  /**
   * Mark task as completed
   */
  static async markCompleted(taskId) {
    return await this.updateStatus(taskId, 'completed');
  }

  /**
   * Delete task
   */
  static async delete(taskId) {
    await db().collection(collections.TASKS).doc(taskId).delete();
  }

  /**
   * Get task statistics for an event
   */
  static async getEventStatistics(eventId) {
    const tasks = await this.getByEventId(eventId);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const overdueTasks = tasks.filter(t => {
      if (!t.dueDate || t.completed) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0
    };
  }

  /**
   * Bulk create tasks
   */
  static async bulkCreate(tasksData) {
    const batch = db().batch();
    const taskRefs = [];

    tasksData.forEach(taskData => {
      const taskRef = db().collection(collections.TASKS).doc();
      const task = {
        ...taskData,
        status: taskData.status || 'pending',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };
      batch.set(taskRef, task);
      taskRefs.push({ id: taskRef.id, ...task });
    });

    await batch.commit();
    return taskRefs;
  }

  /**
   * Delete all tasks for an event
   */
  static async deleteByEventId(eventId) {
    const tasks = await this.getByEventId(eventId);
    const batch = db().batch();

    tasks.forEach(task => {
      const taskRef = db().collection(collections.TASKS).doc(task.id);
      batch.delete(taskRef);
    });

    await batch.commit();
  }
}