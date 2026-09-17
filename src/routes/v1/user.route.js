const express = require('express');
const userController = require('../../controllers/user.controller');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const agentController = require('../../controllers/agent.controller');
const { cloudinaryUpload } = require('../../middlewares/upload');
const router = express.Router();
// validate(userValidation.registerEmployee), 
router
  .route('/employee-registration')
  .post(userController.registerEmployee);

router
  .route('/count')
  .get(userController.getEmployeeCount);

router
  .route('/generate-employeeId')
  .get(userController.generateEmployeeId);

router
  .route('/generate-staffId')
  .get(userController.generateStaffId);

router
  .route('/generate-agentId')
  .get(userController.generateAgentId);

// GET /v1/users/dropdown
// Dropdown API for agents, staff, and employees
// Query params: ?role=agent,staff,employee&search=john
router
  .route('/dropdown')
  .get(validate(userValidation.getUsersDropdown), userController.getUsersDropdown);

router
  .route('/employee/:employeeId')
  .get(validate(userValidation.getEmployeeByEmpId), userController.getEmployeeByEmpId);

router
  .route('/')
  .post(userController.createUser)
  .get(validate(userValidation.getUsers), userController.getUsers);

router
  .route('/agent')
  .post(agentController.createAgent)
  .get(agentController.getAgentId);

// GET /v1/users/agent/:agentId/members
// Returns employees & staff linked to the agent via workInformation.contractAgent
// with summary counts: total, active, inActive, relieved, newToday
// Query params: ?page=1&limit=10
router
  .route('/agent/:agentId/members')
  .get(userController.getAgentMembers);

router
  .route('/:userId')
  .get(userController.getUser)
  .patch(
    cloudinaryUpload('hrms/user-documents', 'any', 10),
    userController.updateUser
  )
  .delete(userController.deleteUser);

// ── Document upload/link ──────────────────────────────────────────────────────
// POST /v1/users/:userId/documents
// Supports two modes:
// 1. multipart/form-data: Direct file upload (uses cloudinaryUpload middleware)
// 2. application/json: Pre-uploaded URLs from /v1/media/upload
//    Body: { documents: [{ fileUrl, documentName, fileName, mimeType, publicId }] }
//    or  : { documentImage: [...] }
// Query param: ?documentType=government | personal (default: personal)
router
  .route('/:userId/documents')
  .post(userController.uploadUserDocuments);

// DELETE /v1/users/:userId/documents/:documentId
// Deletes a specific user document
// PATCH /v1/users/:userId/documents/:documentId
// Updates a specific user document's metadata
router
  .route('/:userId/documents/:documentId')
  .patch(userController.updateUserDocument)
  .delete(userController.deleteUserDocument);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and retrieval
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user
 *     description: Only admins can create other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 description: must be unique
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: At least one number and one letter
 *               role:
 *                  type: string
 *                  enum: [user, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: user
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all users
 *     description: Only admins can retrieve all users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: User name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: User role
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of users
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
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
 *                     $ref: '#/components/schemas/User'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user
 *     description: Logged in users can fetch only their own user information. Only admins can fetch other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a user
 *     description: Logged in users can only update their own information. Only admins can update other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 description: must be unique
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: At least one number and one letter
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/User'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a user
 *     description: Logged in users can delete only themselves. Only admins can delete other users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
