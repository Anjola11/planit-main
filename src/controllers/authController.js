import { User, ROLES } from '../models/User.js'; 
import TokenManager from '../utils/tokenManager.js';
import { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailServices.js'; 
import { ConflictError, AuthenticationError, NotFoundError, ValidationError } from '../middleware/errorHandler.js'; 
import { db, collections } from '../config/firebase.js';
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
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

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

    // Mark OTP as used
    await otpDoc.ref.update({ used: true });

    return { valid: true };
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res) => { 
    const { email, password, fullName, role, phoneNumber, profilePicture } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await User.create({
        email,
        password,
        fullName,
        role: role || ROLES.PLANNER,
        phoneNumber
    });

    // Generate and send OTP
    const otp = generateOTP();
    await storeOTP(user.id, otp);
    await sendOtpEmail(email, otp, fullName);

    res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification code.',
        data: {
            userId: user.id,
            email: user.email,
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

    // Verify OTP
    const verification = await verifyOTP(userId, otp);

    if (!verification.valid) {
        throw new ValidationError(verification.message);
    }

    // Update user's email verification status
    await User.update(userId, { emailVerified: true });

    // Get updated user
    const user = await User.findById(userId);

    // Send welcome email
    await sendWelcomeEmail(user.email, user.fullName);

    // Generate tokens
    const { accessToken, refreshToken } = TokenManager.generateTokens(user);

    // Store refresh token
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

    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    if (user.emailVerified) {
        throw new ValidationError('Email is already verified');
    }

    // Generate and send new OTP
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

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
        throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password);
    if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
        throw new AuthenticationError('Please verify your email before logging in');
    }

    // Generate tokens
    const { accessToken, refreshToken } = TokenManager.generateTokens(user);

    // Store refresh token
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

    const user = await User.findByEmail(email);
    if (!user) {
        // Don't reveal if user exists
        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a password reset code has been sent.'
        });
    }

    // Generate and send reset code
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

    const user = await User.findByEmail(email);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    // Verify reset code
    const verification = await verifyOTP(user.id, resetCode, 'password_reset');

    if (!verification.valid) {
        throw new ValidationError(verification.message);
    }

    // Update password
    await User.updatePassword(user.id, newPassword);

    // Revoke all refresh tokens
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

    // Verify refresh token
    const decoded = TokenManager.verifyRefreshToken(refreshToken);

    // Check if token exists in database
    const isValid = await TokenManager.isRefreshTokenValid(refreshToken);
    if (!isValid) {
        throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
    }

    // Generate new tokens
    const tokens = TokenManager.generateTokens(user);

    // Store new refresh token and revoke old one
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
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new NotFoundError('User not found');
    }

    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt
        }
    });
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => { 
    const { fullName, phoneNumber } = req.body;

    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (phoneNumber) updates.phoneNumber = phoneNumber;

    const user = await User.update(req.user.id, updates);

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            phoneNumber: user.phoneNumber
        }
    });
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => { 
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id);

    // Verify current password
    const isValid = await User.verifyPassword(currentPassword, user.password);
    if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);

    // Revoke all refresh tokens (force re-login on all devices)
    await TokenManager.revokeAllUserTokens(req.user.id);

    res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again.'
    });
};
