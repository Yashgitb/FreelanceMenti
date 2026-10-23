import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  uploadProfileImage,
  getPublicProfile
} from '../controllers/profileController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize filename: remove spaces and special characters, keep only alphanumeric, dots, hyphens
    const sanitizedExt = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + sanitizedExt);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(requireAuth);

// Profile routes
router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/upload-image', upload.single('image'), uploadProfileImage);
router.get('/public/:userId', getPublicProfile);

export default router;
