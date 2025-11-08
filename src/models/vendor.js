import { db, collections } from '../config/firebase.js';
import { BaseUser, ROLES } from './baseUser.js';

/**
 * Vendor class with vendor-specific functionality
 */
export class Vendor extends BaseUser {
  /**
   * Create a new vendor (minimal fields required at signup)
   */
  static async create(vendorData) {
    const {
      email,
      password,
      fullName,
      phoneNumber,
      profilePicture
    } = vendorData;

    // Create base user
    const baseUser = await super.create({
      email,
      password,
      fullName,
      role: ROLES.VENDOR,
      phoneNumber,
      profilePicture
    });

    // Add vendor-specific data with defaults (all optional at signup)
    const vendorSpecificData = {
      businessName: fullName, // Default to user's full name
      businessDescription: null,
      category: null,
      location: null,
      address: {
        street: null,
        city: null,
        state: null,
        country: null,
        zipCode: null
      },
      cacNumber: null,
      cacDocument: null,
      socialMedia: {
        facebook: null,
        instagram: null,
        twitter: null,
        linkedin: null
      },
      website: null,
      portfolio: [],
      services: [],
      priceRange: { min: 0, max: 0, currency: 'NGN' },
      availability: true,
      rating: 0,
      reviewCount: 0,
      verified: false,
      verificationStatus: 'pending',
      profileCompleted: false, // Track if vendor completed their profile
      profileCompletionPercentage: 20 // Basic info = 20%
    };

    // Update user document with vendor-specific fields
    await db().collection(collections.USERS).doc(baseUser.id).update(vendorSpecificData);

    return {
      id: baseUser.id,
      ...baseUser,
      ...vendorSpecificData
    };
  }

  /**
   * Update vendor profile with completion tracking
   */
  static async updateProfile(vendorId, updateData) {
    const allowedFields = [
      'businessName',
      'businessDescription',
      'category',
      'location',
      'address',
      'cacNumber',
      'cacDocument',
      'socialMedia',
      'website',
      'portfolio',
      'services',
      'priceRange',
      'availability',
      'phoneNumber',
      'profilePicture',
      'fullName'
    ];

    const filteredUpdates = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updateData[key];
      }
    });

    // Calculate profile completion percentage
    const vendor = await super.findById(vendorId);
    const completionPercentage = this.calculateProfileCompletion({
      ...vendor,
      ...filteredUpdates
    });

    filteredUpdates.profileCompletionPercentage = completionPercentage;
    filteredUpdates.profileCompleted = completionPercentage === 100;

    return await super.update(vendorId, filteredUpdates);
  }

  /**
   * Calculate profile completion percentage
   */
  static calculateProfileCompletion(vendor) {
    let score = 0;
    
    // Basic info (20%)
    if (vendor.fullName) score += 5;
    if (vendor.email) score += 5;
    if (vendor.phoneNumber) score += 5;
    if (vendor.profilePicture) score += 5;

    // Business info (30%)
    if (vendor.businessName) score += 5;
    if (vendor.businessDescription) score += 10;
    if (vendor.category) score += 10;
    if (vendor.website) score += 5;

    // Location (15%)
    if (vendor.address?.city) score += 5;
    if (vendor.address?.state) score += 5;
    if (vendor.address?.street) score += 5;

    // Services & Pricing (20%)
    if (vendor.services && vendor.services.length > 0) score += 10;
    if (vendor.priceRange && vendor.priceRange.min > 0) score += 10;

    // Portfolio & Social (10%)
    if (vendor.portfolio && vendor.portfolio.length > 0) score += 5;
    const hasSocial = vendor.socialMedia && Object.values(vendor.socialMedia).some(v => v);
    if (hasSocial) score += 5;

    // Verification (5%)
    if (vendor.cacNumber) score += 3;
    if (vendor.cacDocument) score += 2;

    return Math.min(score, 100);
  }

  /**
   * Get profile completion status
   */
  static async getProfileCompletion(vendorId) {
    const vendor = await super.findById(vendorId);
    
    const missingFields = [];
    
    if (!vendor.businessDescription) missingFields.push('Business Description');
    if (!vendor.category) missingFields.push('Business Category');
    if (!vendor.address?.city || !vendor.address?.state) missingFields.push('Business Location');
    if (!vendor.services || vendor.services.length === 0) missingFields.push('Services Offered');
    if (!vendor.priceRange || vendor.priceRange.min === 0) missingFields.push('Price Range');
    if (!vendor.portfolio || vendor.portfolio.length === 0) missingFields.push('Portfolio Images');
    if (!vendor.cacNumber) missingFields.push('CAC Registration Number');
    if (!vendor.cacDocument) missingFields.push('CAC Document');

    return {
      percentage: vendor.profileCompletionPercentage || 20,
      completed: vendor.profileCompleted || false,
      missingFields
    };
  }

  /**
   * Get all vendors with optional filters
   */
  static async getAll(filters = {}) {
    let query = db()
      .collection(collections.USERS)
      .where('role', '==', ROLES.VENDOR);

    // Apply filters
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }

    if (filters.city) {
      query = query.where('address.city', '==', filters.city);
    }

    if (filters.state) {
      query = query.where('address.state', '==', filters.state);
    }

    if (filters.verified !== undefined) {
      query = query.where('verified', '==', filters.verified);
    }

    if (filters.availability !== undefined) {
      query = query.where('availability', '==', filters.availability);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      password: undefined
    }));
  }

  /**
   * Search vendors by name or business name
   */
  static async search(searchTerm) {
    const allVendors = await this.getAll();
    
    const term = searchTerm.toLowerCase();
    return allVendors.filter(vendor => 
      vendor.businessName?.toLowerCase().includes(term) ||
      vendor.fullName?.toLowerCase().includes(term)
    );
  }

  /**
   * Update vendor verification status (admin only)
   */
  static async updateVerificationStatus(vendorId, status, verifiedBy) {
    return await super.update(vendorId, {
      verificationStatus: status,
      verified: status === 'approved',
      verifiedBy,
      verifiedAt: new Date().toISOString()
    });
  }

  /**
   * Update vendor rating
   */
  static async updateRating(vendorId, newRating, newReviewCount) {
    return await super.update(vendorId, {
      rating: newRating,
      reviewCount: newReviewCount
    });
  }

  /**
   * Add portfolio item
   */
  static async addPortfolioItem(vendorId, imageUrl) {
    const vendor = await super.findById(vendorId);
    const portfolio = vendor.portfolio || [];
    portfolio.push(imageUrl);

    return await super.update(vendorId, { portfolio });
  }

  /**
   * Remove portfolio item
   */
  static async removePortfolioItem(vendorId, imageUrl) {
    const vendor = await super.findById(vendorId);
    const portfolio = (vendor.portfolio || []).filter(url => url !== imageUrl);

    return await super.update(vendorId, { portfolio });
  }
}