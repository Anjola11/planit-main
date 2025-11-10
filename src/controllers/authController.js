import { BaseUser, ROLES } from '../models/baseUser.js';
import { Vendor } from '../models/vendor.js';
import { Planner } from '../models/planner.js';
import TokenManager from '../utils/tokenManager.js';
import { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailServices.js';
import { ConflictError, AuthenticationError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { db, collections } from '../config/firebase.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import { BaseUser } from '../models/baseUser.js';

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store OTP in database
 */
const storeOTP = async (userId, otp, type = 'email_verification') => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await db().collection('otps').add({
        userId,
        otp,
        type,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false
    });
};

/**
 * Verify OTP
 */
const verifyOTP = async (userId, otp, type = 'email_verification') => {
    const snapshot = await db()
        .collection('otps')
        .where('userId', '==', userId)
        .where('otp', '==', otp)
        .where('type', '==', type)
        .where('used', '==', false)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return { valid: false, message: 'Invalid OTP code' };
    }

    const otpDoc = snapshot.docs[0];
    const otpData = otpDoc.data();
    const expiresAt = new Date(otpData.expiresAt);

    if (expiresAt < new Date()) {
        return { valid: false, message: 'OTP code has expired' };
    }

    await otpDoc.ref.update({ used: true });

    return { valid: true };
};

/**
 * @desc    Register a new user (role-based)
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res) => {
    const { email, ...userData } = req.body;  
    // Check if user already exists
    const existingUser = await BaseUser.findByEmail(email);
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }

    // Always create as Planner by default
    const user = await Planner.create({ 
        email, 
        role: ROLES.PLANNER,  // Force planner role
        ...userData 
    });

    // Generate and send OTP
    const otp = generateOTP();
    await storeOTP(user.id, otp);
    await sendOtpEmail(email, otp, userData.fullName);

    res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification code.',
        data: {
            userId: user.id,
            email: user.email,
            role: user.role,
            emailVerified: false
        }
    });
};

/**
 * @desc    Verify email with OTP
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;

    const verification = await verifyOTP(userId, otp);

    if (!verification.valid) {
        throw new ValidationError(verification.message);
    }

    await BaseUser.update(userId, { emailVerified: true });

    const user = await BaseUser.findById(userId);

    await sendWelcomeEmail(user.email, user.fullName);

    const { accessToken, refreshToken } = TokenManager.generateTokens(user);

    await TokenManager.storeRefreshToken(user.id, refreshToken);

    res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phoneNumber: user.phoneNumber,
                emailVerified: user.emailVerified
            },
            accessToken,
            refreshToken
        }
    });
};

/**
 * @desc    Resend verification OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
export const resendOTP = async (req, res) => {
    const { userId } = req.body;

    const user = await BaseUser.findById(userId);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    if (user.emailVerified) {
        throw new ValidationError('Email is already verified');
    }

    const otp = generateOTP();
    await storeOTP(user.id, otp);
    await sendOtpEmail(user.email, otp, user.fullName);

    res.status(200).json({
        success: true,
        message: 'Verification code sent successfully'
    });
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await BaseUser.findByEmail(email);
    if (!user) {
        throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated. Please contact support.');
    }

    const isPasswordValid = await BaseUser.verifyPassword(password, user.password);
    if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
    }

    if (!user.emailVerified) {
        throw new AuthenticationError('Please verify your email before logging in');
    }

    const { accessToken, refreshToken } = TokenManager.generateTokens(user);

    await TokenManager.storeRefreshToken(user.id, refreshToken);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phoneNumber: user.phoneNumber
            },
            accessToken,
            refreshToken
        }
    });
};

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    const user = await BaseUser.findByEmail(email);
    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a password reset code has been sent.'
        });
    }

    const resetCode = generateOTP();
    await storeOTP(user.id, resetCode, 'password_reset');
    await sendPasswordResetEmail(user.email, resetCode);

    res.status(200).json({
        success: true,
        message: 'Password reset code sent to your email'
    });
};

/**
 * @desc    Reset password with code
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    const user = await BaseUser.findByEmail(email);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    const verification = await verifyOTP(user.id, resetCode, 'password_reset');

    if (!verification.valid) {
        throw new ValidationError(verification.message);
    }

    await BaseUser.updatePassword(user.id, newPassword);

    await TokenManager.revokeAllUserTokens(user.id);

    res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.'
    });
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
export const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    const decoded = TokenManager.verifyRefreshToken(refreshToken);

    const isValid = await TokenManager.isRefreshTokenValid(refreshToken);
    if (!isValid) {
        throw new AuthenticationError('Invalid or expired refresh token');
    }

    const user = await BaseUser.findById(decoded.userId);
    if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
    }

    const tokens = TokenManager.generateTokens(user);

    await TokenManager.revokeRefreshToken(refreshToken);
    await TokenManager.storeRefreshToken(user.id, tokens.refreshToken);

    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        }
    });
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        await TokenManager.revokeRefreshToken(refreshToken);
    }

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

/**
 * @desc    Logout from all devices
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
export const logoutAll = async (req, res) => {
    await TokenManager.revokeAllUserTokens(req.user.id);

    res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully'
    });
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getProfile = async (req, res) => {
    const user = await BaseUser.findById(req.user.id);

    if (!user) {
        throw new NotFoundError('User not found');
    }

    // Remove sensitive data
    const { password, ...userProfile } = user;

    res.status(200).json({
        success: true,
        data: userProfile
    });
};

/**
 * @desc    Update user profile (role-based)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
    const user = await BaseUser.findById(req.user.id);

    if (!user) {
        throw new NotFoundError('User not found');
    }

    let updatedUser;

    // Update based on role
    if (user.role === ROLES.VENDOR) {
        updatedUser = await Vendor.updateProfile(req.user.id, req.body);
    } else if (user.role === ROLES.PLANNER) {
        updatedUser = await Planner.updateProfile(req.user.id, req.body);
    } else {
        updatedUser = await BaseUser.update(req.user.id, req.body);
    }

    const { password, ...userProfile } = updatedUser;

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: userProfile
    });
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await BaseUser.findById(req.user.id);

    const isValid = await BaseUser.verifyPassword(currentPassword, user.password);
    if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
    }

    await BaseUser.updatePassword(req.user.id, newPassword);

    await TokenManager.revokeAllUserTokens(req.user.id);

    res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again.'
    });
};


/**
 * @desc    Upload or update profile picture
 * @route   PUT /api/auth/profile-picture
 * @access  Private
 */
export const uploadProfilePicture = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image uploaded' });
  }

  const userId = req.user.id;

  const streamUpload = (buffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'user_profiles', resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(buffer).pipe(stream);
    });
  };

  try {
    const uploadResult = await streamUpload(req.file.buffer);

    // Store Cloudinary URL in Firestore
    await BaseUser.update(userId, { profilePicture: uploadResult.secure_url });

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: { profilePicture: uploadResult.secure_url }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
};
