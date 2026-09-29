import multer from 'multer';
import path from 'path';

// Multer memory storage for direct streaming to Cloudinary
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|svg|mp3|wav|ogg|mp4|mov/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image, audio, and video files are supported!'));
  },
});

// Dedicated PDF Upload Multer (Max 15MB for Company Portfolio)
export const uploadPdf = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdfExt = ext === '.pdf';
    const isPdfMime =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/x-pdf' ||
      file.mimetype === 'application/acrobat' ||
      file.mimetype === 'applications/vnd.pdf' ||
      file.mimetype === 'text/pdf';

    if (isPdfExt || isPdfMime) {
      return cb(null, true);
    }
    cb(new Error('Only PDF files (.pdf) are allowed!'));
  },
});

