import { db, collections } from '../config/firebase.js';
import bcrypt from 'bcrypt';

// User roles
export const ROLES = {
  PLANNER: 'planner',
  VENDOR: 'vendor',
  ADMIN: 'admin',
};

/**
 * Base User class with common functionality for Firestore users
 */
export default class BaseUser {
  /**
   * Create a new user in Firestore
   * @param {object} userData
   * @returns {object} newly created user (without password)
   */
  static async create(userData) {
    const { email, password, fullName, role, phoneNumber, profilePicture } = userData;

    // Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

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
      emailVerified: false,
    };

    const userRef = await db().collection(collections.USERS).add(user);

    return this._sanitizeUser({ id: userRef.id, ...user });
  }

  /**
   * Find user by email
   * @param {string} email
   * @returns {object|null} user object without password or null if not found
   */
  static async findByEmail(email) {
    const snapshot = await db()
      .collection(collections.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return this._sanitizeUser({ id: doc.id, ...doc.data() });
  }

  /**
   * Find user by ID
   * @param {string} userId
   * @returns {object|null} user object without password or null if not found
   */
  static async findById(userId) {
    const doc = await db().collection(collections.USERS).doc(userId).get();

    if (!doc.exists) return null;

    return this._sanitizeUser({ id: doc.id, ...doc.data() });
  }

  /**
   * Update user data (except password)
   * @param {string} userId
   * @param {object} updateData
   * @returns {object} updated user object without password
   */
  static async update(userId, updateData) {
    // Prevent password update via this method
    const { password, ...safeUpdateData } = updateData;

    const updates = {
      ...safeUpdateData,
      updatedAt: new Date().toISOString(),
    };

    const userRef = db().collection(collections.USERS).doc(userId);
    await userRef.update(updates);

    const updatedDoc = await userRef.get();
    return this._sanitizeUser({ id: updatedDoc.id, ...updatedDoc.data() });
  }

  /**
   * Verify password matches hashed password
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {boolean} password match
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user password securely
   * @param {string} userId
   * @param {string} newPassword
   */
  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db().collection(collections.USERS).doc(userId).update({
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Check if a user exists by email
   * @param {string} email
   * @returns {boolean}
   */
  static async exists(email) {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  /**
   * Delete user by ID
   * @param {string} userId
   */
  static async delete(userId) {
    await db().collection(collections.USERS).doc(userId).delete();
  }

  /**
   * Remove sensitive fields before returning user object
   * @param {object} userObj
   * @returns {object} sanitized user object
   */
  static _sanitizeUser(userObj) {
    const { password, ...userWithoutPassword } = userObj;
    return userWithoutPassword;
  }
}
