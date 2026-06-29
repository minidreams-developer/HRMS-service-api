const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const branchValidation = require('../../validations/branch.validation');
const branchController = require('../../controllers/branch.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageUsers'), validate(branchValidation.createBranch), branchController.createBranch)
  .get(auth('getUsers'), validate(branchValidation.getBranches), branchController.getBranches);

router
  .route('/:branchId')
  .get(auth('getUsers'), validate(branchValidation.getBranch), branchController.getBranch)
  .patch(auth('manageUsers'), validate(branchValidation.updateBranch), branchController.updateBranch)
  .delete(auth('manageUsers'), validate(branchValidation.deleteBranch), branchController.deleteBranch);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Branch management and retrieval
 */

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Create a branch
 *     description: Only admins can create branches.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchName
 *               - branchHead
 *               - branchNumber
 *             properties:
 *               branchName:
 *                 type: string
 *               branchHead:
 *                 type: string
 *               branchNumber:
 *                 type: string
 *               activeStatus:
 *                 type: string
 *                 enum: [active, inactive]
 *             example:
 *               branchName: Headquarters
 *               branchHead: 664f1b2c3e4a5b6c7d8e9f00
 *               branchNumber: BR-001
 *               activeStatus: active
 *     responses:
 *       "201":
 *         description: Created
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all branches
 *     description: Only admins can retrieve all branches.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchName
 *         schema:
 *           type: string
 *         description: Branch name
 *       - in: query
 *         name: activeStatus
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. branchName:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of branches
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
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: Get a branch
 *     description: Logged in users can fetch branch information.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch id
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a branch
 *     description: Only admins can update branches.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branchName:
 *                 type: string
 *               branchHead:
 *                 type: string
 *               branchNumber:
 *                 type: string
 *               activeStatus:
 *                 type: string
 *                 enum: [active, inactive]
 *             example:
 *               activeStatus: inactive
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a branch
 *     description: Only admins can delete branches.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch id
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
