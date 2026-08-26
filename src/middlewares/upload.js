require('../config/config'); // ensure dotenv is loaded before reading process.env
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Returns a multer middleware that uploads files to Cloudinary.
 * @param {string} folder - Cloudinary folder to store uploads in
 * @param {string} fieldName - The multipart field name (default: 'documents', use 'any' to accept any field name)
 * @param {number} maxCount  - Max number of files allowed (default: 10)
 */
const cloudinaryUpload = (folder = 'hrms', fieldName = 'documents', maxCount = 10) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx'],
      resource_type: 'auto', // required for non-image files like PDFs and docs
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  });

  // 'any' accepts files from any field name — handles cases where
  // the frontend sends files under different field names
  if (fieldName === 'any') {
    return upload.any();
  }

  return upload.array(fieldName, maxCount);
};

module.exports = { cloudinaryUpload, cloudinary };
