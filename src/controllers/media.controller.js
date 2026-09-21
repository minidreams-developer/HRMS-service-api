const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const mediaService = require('../services/media.service');

/**
 * POST /v1/media/upload
 *
 * Accepts one or more files via multipart/form-data (any field name).
 * Files are already uploaded to Cloudinary by the time this controller runs
 * (the cloudinaryUpload middleware handles the actual transfer).
 *
 * Response:
 * {
 *   "count": 2,
 *   "files": [
 *     {
 *       "originalName": "profile.jpg",
 *       "url": "https://res.cloudinary.com/...",
 *       "publicId": "hrms/media/profile_abc123",
 *       "mimeType": "image/jpeg",
 *       "size": 204800,
 *       "folder": "media"
 *     },
 *     ...
 *   ]
 * }
 */
const uploadMedia = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No files provided. Send files via multipart/form-data.');
  }

  // Diagnostic logging: inspect the Cloudinary metadata returned by multer.
  // Do not log file contents or Cloudinary credentials.
  console.log('[uploadMedia] Cloudinary response:', req.files.map((file) => ({
    originalName: file.originalname,
    path: file.path,
    publicId: file.filename,
    resourceType: file.resource_type,
    mimeType: file.mimetype,
    format: file.format,
    size: file.size,
  })));

  const files = mediaService.processUploadedFiles(req.files);

  res.status(httpStatus.CREATED).send({
    count: files.length,
    files,
  });
});

/**
 * DELETE /v1/media
 *
 * Deletes a file from Cloudinary by publicId.
 * Body: { "publicId": "hrms/media/profile_abc123" }
 */
const deleteMedia = catchAsync(async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'publicId is required');
  }

  const result = await mediaService.deleteFile(publicId);

  if (result.result !== 'ok') {
    throw new ApiError(httpStatus.NOT_FOUND, `File not found or already deleted (publicId: ${publicId})`);
  }

  res.status(httpStatus.OK).send({ message: 'File deleted successfully', publicId });
});

module.exports = {
  uploadMedia,
  deleteMedia,
};
