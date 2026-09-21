const { cloudinary } = require('../middlewares/upload');

/**
 * Build a normalised file object from a multer-cloudinary file entry.
 * multer-storage-cloudinary puts the secure URL in file.path and the
 * public_id in file.filename.
 *
 * @param {Object} file - multer file object
 * @returns {Object}
 */
const buildFilePayload = (file) => ({
  originalName: file.originalname,
  url: file.path,           // Cloudinary secure URL
  publicId: file.filename,  // Cloudinary public_id (used for deletion)
  mimeType: file.mimetype,
  resourceType: file.resource_type || (file.mimetype === 'application/pdf' || file.mimetype?.includes('word') ? 'raw' : 'image'),
  size: file.size,          // bytes
  folder: file.path.split('/upload/')[1]?.split('/')[1] ?? null,
});

/**
 * Process files already uploaded to Cloudinary by the multer middleware
 * and return a structured array of file metadata.
 *
 * @param {Array} files - req.files from multer
 * @returns {Array<Object>}
 */
const processUploadedFiles = (files = []) => files.map(buildFilePayload);

/**
 * Delete a file from Cloudinary by its public_id.
 *
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<Object>} Cloudinary deletion result
 */
const deleteFile = async (publicId) => {
  const resourceType = publicId.endsWith('.pdf') ? 'raw' : 'image';
  const result = await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: resourceType });
  return result;
};

module.exports = {
  processUploadedFiles,
  deleteFile,
};
