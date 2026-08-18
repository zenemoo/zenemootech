import multer from 'multer';
import { uploadFileToDrive, deleteFileFromDrive, verifyDriveHealth } from '../services/googleDriveService.js';

// Configure Multer for Memory Storage (up to 100MB per dataset sample)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max sample file limit
  fileFilter: (req, file, cb) => {
    // Supported mime types & extensions check
    const allowedMimePrefixes = ['audio/', 'video/', 'image/', 'application/json', 'text/csv', 'application/pdf', 'text/plain'];
    const isAllowed = allowedMimePrefixes.some((prefix) => file.mimetype.startsWith(prefix) || file.mimetype === prefix);
    if (isAllowed || file.originalname.endsWith('.json') || file.originalname.endsWith('.csv') || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Allowed types: Audio (MP3/WAV/M4A), Video (MP4/MOV/WEBM), Images (JPG/PNG/WEBP), Data (JSON/CSV), PDF.'));
    }
  },
}).single('file');

/**
 * Controller: Upload Dataset File to Google Drive via Service Account
 */
export const uploadDatasetDriveFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const category = req.body.category || 'Audio';
    const buffer = req.file.buffer;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;

    const result = await uploadFileToDrive({
      buffer,
      originalName,
      mimeType,
      category,
    });

    return res.status(200).json({
      success: true,
      message: 'File successfully uploaded to Google Drive via Service Account.',
      fileId: result.fileId,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      fileSize: result.fileSize,
      storageProvider: 'google_drive',
    });
  } catch (err) {
    console.error('[Drive Portfolio Controller Upload Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to upload dataset file to Google Drive.',
    });
  }
};

/**
 * Controller: Delete Dataset File from Google Drive via Service Account
 */
export const deleteDatasetDriveFile = async (req, res, next) => {
  try {
    const fileId = req.params.fileId || req.body.fileId || req.query.fileId;
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'File ID is required for deletion.' });
    }

    const result = await deleteFileFromDrive(fileId);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    console.error('[Drive Portfolio Controller Delete Error]:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete file from Google Drive.',
    });
  }
};

/**
 * Controller: Drive API Health Check Endpoint
 */
export const checkDriveHealth = async (req, res) => {
  try {
    const health = await verifyDriveHealth();
    if (health.success) {
      return res.status(200).json(health);
    } else {
      return res.status(500).json(health);
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

