import express from 'express';
import upload from '../middleware/upload.js';
import { uploadProfilePicture } from '../controllers/authController.js';
import { requireVendor } from '../middleware/roleCheck.js';
import { uploadCACDocument, uploadPortfolioImage } from '../controllers/authController.js';


import {
  signup,
  verifyEmail,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  changePassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import {
  signupValidation,
  loginValidation,
  verifyEmailValidation,
  resendOTPValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  changePasswordValidation,
  validate
} from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Public routes
router.post('/signup', signupValidation, validate, asyncHandler(signup));
router.post('/verify-email', verifyEmailValidation, validate, asyncHandler(verifyEmail));
router.post('/resend-otp', resendOTPValidation, validate, asyncHandler(resendOTP));
router.post('/login', loginValidation, validate, asyncHandler(login));
router.post('/forgot-password', forgotPasswordValidation, validate, asyncHandler(forgotPassword));
router.post('/reset-password', resetPasswordValidation, validate, asyncHandler(resetPassword));
router.post('/refresh', refreshTokenValidation, validate, asyncHandler(refreshToken));

// Protected routes
// Add this with your protected routes
router.post('/logout', authenticate, asyncHandler(logout));
router.post('/logout-all', authenticate, asyncHandler(logoutAll));
router.get('/me', authenticate, asyncHandler(getProfile));
router.put('/profile', authenticate, asyncHandler(updateProfile));
router.put('/change-password', authenticate, changePasswordValidation, validate, asyncHandler(changePassword));

router.put(
  '/profile-picture',
  authenticate,
  upload.single('profilePicture'),
  asyncHandler(uploadProfilePicture)
);





router.put(
  '/cac-document',
  authenticate,
  requireVendor,
  upload.single('cacDocument'),
  asyncHandler(uploadCACDocument)
);

router.post(
  '/portfolio',
  authenticate,
  requireVendor,
  upload.single('portfolioImage'),
  asyncHandler(uploadPortfolioImage)
);

export default router;