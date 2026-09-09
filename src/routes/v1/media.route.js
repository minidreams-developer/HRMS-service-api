const express = require('express');
const { cloudinaryUpload } = require('../../middlewares/upload');
const mediaController = require('../../controllers/media.controller');

const router = express.Router();

/**
 * POST /v1/media/upload
 *
 * Upload one or more files to Cloudinary.
 * - Content-Type : multipart/form-data
 * - Field name   : any (accepts any field name the client uses)
 * - Max files    : 10
 * - Max size     : 5 MB per file
 * - Allowed types: jpg, jpeg, png, webp, gif, pdf, doc, docx
 *
 * Response 201:
 * {
 *   "count": 1,
 *   "files": [
 *     {
 *       "originalName": "photo.jpg",
 *       "url": "https://res.cloudinary.com/demo/image/upload/...",
 *       "publicId": "hrms/media/photo_abc123",
 *       "mimeType": "image/jpeg",
 *       "size": 102400,
 *       "folder": "media"
 *     }
 *   ]
 * }
 */
router
  .route('/upload')
  .post(
    cloudinaryUpload('hrms/media', 'any', 10),
    mediaController.uploadMedia
  );

/**
 * DELETE /v1/media
 *
 * Delete a previously uploaded file from Cloudinary.
 * Body: { "publicId": "hrms/media/photo_abc123" }
 *
 * Response 200:
 * { "message": "File deleted successfully", "publicId": "hrms/media/photo_abc123" }
 */
router
  .route('/')
  .delete(mediaController.deleteMedia);

module.exports = router;
