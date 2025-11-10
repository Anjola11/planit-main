import multer from 'multer';

const storage = multer.memoryStorage(); // Keep in memory, since we'll upload to Cloudinary directly
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPG, PNG, and WEBP allowed.'));
  }
});

export default upload;
