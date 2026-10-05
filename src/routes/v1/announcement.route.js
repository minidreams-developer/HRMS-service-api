const express = require('express');
const announcementController = require('../../controllers/announcement.controller');
const validate = require('../../middlewares/validate');
const { announcementValidation } = require('../../validations');
const { cloudinaryUpload } = require('../../middlewares/upload');
const auth = require('../../middlewares/auth');

const router = express.Router();

// ── Collection ──────────────────────────────────────────────────────────────
router
  .route('/')
  // cloudinaryUpload runs first: parses multipart/form-data and uploads files to Cloudinary.
  // After it completes, req.files contains the uploaded file info.
  // The controller then merges them into req.body.images before saving.
  .post(auth('manageAnnouncements'), cloudinaryUpload('announcements', 'images', 10), validate(announcementValidation.createAnnouncement), announcementController.createAnnouncement)
  .get(auth('manageAnnouncements'), validate(announcementValidation.getAnnouncements), announcementController.getAnnouncements);

router.get('/me', auth(), validate(announcementValidation.getAnnouncements), announcementController.getMyAnnouncements);

// ── Single announcement ──────────────────────────────────────────────────────
router
  .route('/:announcementId')
  .get(auth('manageAnnouncements'), validate(announcementValidation.getAnnouncement), announcementController.getAnnouncement)
  .patch(auth('manageAnnouncements'), validate(announcementValidation.updateAnnouncement), announcementController.updateAnnouncement)
  .delete(auth('manageAnnouncements'), validate(announcementValidation.deleteAnnouncement), announcementController.deleteAnnouncement);

router.get('/me/:announcementId', auth(), validate(announcementValidation.getAnnouncement), announcementController.getMyAnnouncement);

// ── Schedule an announcement ─────────────────────────────────────────────────
// PATCH /v1/announcements/:announcementId/schedule
// Body: { scheduleDateAndTime: "2026-08-20T09:00:00.000Z" }
router
  .route('/:announcementId/schedule')
  .patch(auth('manageAnnouncements'), announcementController.scheduleAnnouncement);

// ── Image management ─────────────────────────────────────────────────────────
router
  .route('/:announcementId/images')
  .post(auth('manageAnnouncements'), cloudinaryUpload('announcements', 'images', 10), validate(announcementValidation.addImages), announcementController.addImages);

router
  .route('/:announcementId/images/:imgName')
  .delete(auth('manageAnnouncements'), validate(announcementValidation.removeImage), announcementController.removeImage);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Announcements
 *   description: Announcement management
 */

/**
 * @swagger
 * /announcements:
 *   post:
 *     summary: Create an announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               scheduleDateAndTime:
 *                 type: string
 *                 format: date-time
 *               images:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AnnouncementImage'
 *             example:
 *               title: Office Closure Notice
 *               description: The office will be closed on June 15th.
 *               content: Dear team, please note the office will be closed on Saturday June 15th.
 *               scheduleDateAndTime: "2024-06-15T09:00:00.000Z"
 *               images:
 *                 - imgName: notice-banner
 *                   imgUrl: https://cdn.example.com/notice-banner.png
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   get:
 *     summary: Get all announcements
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by title
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search across title, description and content
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: "e.g. scheduleDateAndTime:desc"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Announcement'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalResults:
 *                   type: integer
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /announcements/{announcementId}:
 *   get:
 *     summary: Get an announcement by ID
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update an announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               scheduleDateAndTime:
 *                 type: string
 *                 format: date-time
 *               images:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AnnouncementImage'
 *             example:
 *               title: "Updated: Office Closure Notice"
 *               scheduleDateAndTime: "2024-06-16T09:00:00.000Z"
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete an announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /announcements/{announcementId}/images:
 *   post:
 *     summary: Add images to an announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/AnnouncementImage'
 *             example:
 *               images:
 *                 - imgName: banner-2
 *                   imgUrl: https://cdn.example.com/banner-2.png
 *     responses:
 *       "200":
 *         description: OK — updated announcement returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /announcements/{announcementId}/images/{imgName}:
 *   delete:
 *     summary: Remove an image from an announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imgName
 *         required: true
 *         schema:
 *           type: string
 *         description: The imgName value of the image to remove
 *     responses:
 *       "200":
 *         description: OK — updated announcement returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AnnouncementImage:
 *       type: object
 *       required:
 *         - imgName
 *         - imgUrl
 *       properties:
 *         imgName:
 *           type: string
 *           example: notice-banner
 *         imgUrl:
 *           type: string
 *           format: uri
 *           example: https://cdn.example.com/notice-banner.png
 *
 *     Announcement:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         content:
 *           type: string
 *         scheduleDateAndTime:
 *           type: string
 *           format: date-time
 *         images:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AnnouncementImage'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
