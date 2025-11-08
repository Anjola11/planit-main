import { db, collections } from '../config/firebase.js';
import bcrypt from 'bcrypt';

// User roles
export const ROLES = {
  PLANNER: 'planner',
  VENDOR: 'vendor',
  ADMIN: 'admin'
};

/**
 * Base User class with common functionality
 */
export class BaseUser {
  /**
   * Create a new user in Firestore
   */
  static async create(userData) {
    const { email, password, fullName, role, phoneNumber, profilePicture } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Base user fields
    const user = {
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName,
      role: role || ROLES.PLANNER,
      phoneNumber: phoneNumber || null,
      profilePicture: profilePicture || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      emailVerified: false
    };

    const userRef = await db().collection(collections.USERS).add(user);
    
    return {
      id: userRef.id,
      ...user,
      password: undefined // Don't return password
    };
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const snapshot = await db()
      .collection(collections.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  }

  /**
   * Find user by ID
   */
  static async findById(userId) {
    const doc = await db().collection(collections.USERS).doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data()
    };
  }

  /**
   * Update user data
   */
  static async update(userId, updateData) {
    const userRef = db().collection(collections.USERS).doc(userId);
    
    const updates = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await userRef.update(updates);
    
    const updated = await userRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update password
   */
  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db().collection(collections.USERS).doc(userId).update({
      password: hashedPassword,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Check if user exists
   */
  static async exists(email) {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  /**
   * Delete user
   */
  static async delete(userId) {
    await db().collection(collections.USERS).doc(userId).delete();
  }
}