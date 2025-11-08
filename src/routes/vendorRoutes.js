import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireVendor, requireAdmin } from '../middleware/roleCheck.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { vendorProfileUpdateValidation, validate } from '../utils/validators.js';
import { Vendor } from '../models/vendor.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @desc    Get all vendors (with filters)
 * @route   GET /api/vendors
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
    const { category, city, state, verified, availability } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (city) filters.city = city;
    if (state) filters.state = state;
    if (verified !== undefined) filters.verified = verified === 'true';
    if (availability !== undefined) filters.availability = availability === 'true';

    const vendors = await Vendor.getAll(filters);

    res.status(200).json({
        success: true,
        count: vendors.length,
        data: vendors
    });
}));

/**
 * @desc    Search vendors
 * @route   GET /api/vendors/search
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q) {
        throw new ValidationError('Search query is required');
    }

    const vendors = await Vendor.search(q);

    res.status(200).json({
        success: true,
        count: vendors.length,
        data: vendors
    });
}));

/**
 * @desc    Get vendor by ID
 * @route   GET /api/vendors/:id
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
        throw new NotFoundError('Vendor not found');
    }

    if (vendor.role !== 'vendor') {
        throw new NotFoundError('Vendor not found');
    }

    const { password, ...vendorProfile } = vendor;

    res.status(200).json({
        success: true,
        data: vendorProfile
    });
}));

/**
 * @desc    Get vendor profile completion status
 * @route   GET /api/vendors/profile/completion
 * @access  Private (Vendor only)
 */
router.get('/profile/completion', authenticate, requireVendor, asyncHandler(async (req, res) => {
    const completion = await Vendor.getProfileCompletion(req.user.id);

    res.status(200).json({
        success: true,
        data: completion
    });
}));

/**
 * @desc    Update vendor profile (self)
 * @route   PUT /api/vendors/profile
 * @access  Private (Vendor only)
 */
router.put('/profile', authenticate, requireVendor, vendorProfileUpdateValidation, validate, asyncHandler(async (req, res) => {
    const updatedVendor = await Vendor.updateProfile(req.user.id, req.body);

    const { password, ...vendorProfile } = updatedVendor;

    res.status(200).json({
        success: true,
        message: 'Vendor profile updated successfully',
        data: vendorProfile
    });
}));

/**
 * @desc    Add portfolio item
 * @route   POST /api/vendors/portfolio
 * @access  Private (Vendor only)
 */
router.post('/portfolio', authenticate, requireVendor, asyncHandler(async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        throw new ValidationError('Image URL is required');
    }

    const updatedVendor = await Vendor.addPortfolioItem(req.user.id, imageUrl);

    res.status(200).json({
        success: true,
        message: 'Portfolio item added successfully',
        data: updatedVendor.portfolio
    });
}));

/**
 * @desc    Remove portfolio item
 * @route   DELETE /api/vendors/portfolio
 * @access  Private (Vendor only)
 */
router.delete('/portfolio', authenticate, requireVendor, asyncHandler(async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        throw new ValidationError('Image URL is required');
    }

    const updatedVendor = await Vendor.removePortfolioItem(req.user.id, imageUrl);

    res.status(200).json({
        success: true,
        message: 'Portfolio item removed successfully',
        data: updatedVendor.portfolio
    });
}));

/**
 * @desc    Update vendor verification status
 * @route   PUT /api/vendors/:id/verification
 * @access  Private (Admin only)
 */
router.put('/:id/verification', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        throw new ValidationError('Invalid verification status');
    }

    const updatedVendor = await Vendor.updateVerificationStatus(
        req.params.id,
        status,
        req.user.id
    );

    res.status(200).json({
        success: true,
        message: 'Vendor verification status updated successfully',
        data: {
            verificationStatus: updatedVendor.verificationStatus,
            verified: updatedVendor.verified
        }
    });
}));

/**
 * @desc    Update vendor rating
 * @route   PUT /api/vendors/:id/rating
 * @access  Private (Admin or system only)
 */
router.put('/:id/rating', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { rating, reviewCount } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        throw new ValidationError('Rating must be a number between 0 and 5');
    }

    if (typeof reviewCount !== 'number' || reviewCount < 0) {
        throw new ValidationError('Review count must be a positive number');
    }

    const updatedVendor = await Vendor.updateRating(req.params.id, rating, reviewCount);

    res.status(200).json({
        success: true,
        message: 'Vendor rating updated successfully',
        data: {
            rating: updatedVendor.rating,
            reviewCount: updatedVendor.reviewCount
        }
    });
}));

export default router;