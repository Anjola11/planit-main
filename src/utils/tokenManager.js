import jwt from 'jsonwebtoken';
import { db, collections } from '../config/firebase.js';

class TokenManager {
  /**
   * Generate access token
   */
  static generateAccessToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Store refresh token in database
   */
  static async storeRefreshToken(userId, refreshToken) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    await db().collection(collections.REFRESH_TOKENS).add({
      userId,
      token: refreshToken,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    });
  }

  /**
   * Check if refresh token exists and is valid
   */
  static async isRefreshTokenValid(refreshToken) {
    const snapshot = await db()
      .collection(collections.REFRESH_TOKENS)
      .where('token', '==', refreshToken)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return false;
    }

    const tokenDoc = snapshot.docs[0].data();
    const expiresAt = new Date(tokenDoc.expiresAt);
    
    return expiresAt > new Date();
  }

  /**
   * Revoke refresh token (logout)
   */
  static async revokeRefreshToken(refreshToken) {
    const snapshot = await db()
      .collection(collections.REFRESH_TOKENS)
      .where('token', '==', refreshToken)
      .get();

    const batch = db().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  /**
   * Revoke all user's refresh tokens
   */
  static async revokeAllUserTokens(userId) {
    const snapshot = await db()
      .collection(collections.REFRESH_TOKENS)
      .where('userId', '==', userId)
      .get();

    const batch = db().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }
}

export default TokenManager;