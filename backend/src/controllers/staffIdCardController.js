import { staffIdCardService } from '../services/staffIdCardService.js';

/**
 * GET /api/staff-id-cards/lookup?query=...
 * Single-Record / Egress-Minimized Staff Lookup by Staff ID or Name
 */
export const lookupStaffMember = async (req, res, next) => {
  try {
    const query = req.query.query || req.params.staffId || '';
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Search query or Staff ID is required.' });
    }

    const result = await staffIdCardService.lookupStaff(query.trim());
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/staff-id-cards
 * List saved card configurations (minimal metadata)
 */
export const getSavedCards = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const result = await staffIdCardService.getSavedCards({ search });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/staff-id-cards/:id
 * Get single card configuration with source profile verification
 */
export const getCardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cardData = await staffIdCardService.getCardById(id);
    if (!cardData) {
      return res.status(404).json({ success: false, message: 'Staff ID card configuration not found.' });
    }
    return res.json({
      success: true,
      ...cardData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/staff-id-cards
 * Save or update card configuration (card-only display overrides)
 */
export const saveCard = async (req, res, next) => {
  try {
    const adminEmail = req.user?.email || 'admin';
    const card = await staffIdCardService.saveCard(req.body, adminEmail);
    return res.status(200).json({
      success: true,
      message: 'Staff ID card configuration saved successfully.',
      card,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/staff-id-cards/:id
 * Safely delete card configuration with Cloudinary unreferenced asset cleanup
 */
export const deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await staffIdCardService.deleteCard(id);
    return res.json({
      success: true,
      message: 'Staff ID card configuration deleted successfully.',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/staff-id-cards/upload-photo
 * Upload cropped card photo buffer to Cloudinary
 */
export const uploadCardPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided for upload.' });
    }

    const staffId = req.body.staff_id || req.body.staffId || 'staff-card';
    const uploadedAsset = await staffIdCardService.uploadCardPhoto(
      req.file.buffer,
      staffId,
      req.file.originalname
    );

    return res.status(201).json({
      success: true,
      message: 'Card photo cropped and uploaded successfully to Cloudinary.',
      ...uploadedAsset,
    });
  } catch (err) {
    next(err);
  }
};
