const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const teamValidation = require('../../validations/team.validation');
const teamController = require('../../controllers/team.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageUsers'), validate(teamValidation.createTeam), teamController.createTeam)
  .get(auth('getUsers'), validate(teamValidation.getTeams), teamController.getTeams);

router
  .route('/:teamId')
  .get(auth('getUsers'), validate(teamValidation.getTeam), teamController.getTeam)
  .patch(auth('manageUsers'), validate(teamValidation.updateTeam), teamController.updateTeam)
  .delete(auth('manageUsers'), validate(teamValidation.deleteTeam), teamController.deleteTeam);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Team management and retrieval
 */

/**
 * @swagger
 * /teams:
 *   post:
 *     summary: Create a team
 *     description: Only admins can create teams.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamName
 *               - teamDescription
 *               - teamCode
 *               - teamLead
 *             properties:
 *               teamName:
 *                 type: string
 *               teamDescription:
 *                 type: string
 *               teamCode:
 *                 type: string
 *               teamLead:
 *                 type: string
 *               teamEmployees:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               teamName: Frontend Team
 *               teamDescription: Handles all UI/UX development
 *               teamCode: FE-001
 *               teamLead: 664f1b2c3e4a5b6c7d8e9f00
 *               teamEmployees: []
 *     responses:
 *       "201":
 *         description: Created
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all teams
 *     description: Only admins can retrieve all teams.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamName
 *         schema:
 *           type: string
 *         description: Team name
 *       - in: query
 *         name: teamCode
 *         schema:
 *           type: string
 *         description: Team code
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. teamName:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of teams
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
 * /teams/{id}:
 *   get:
 *     summary: Get a team
 *     description: Logged in users can fetch team information.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team id
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
 *     summary: Update a team
 *     description: Only admins can update teams.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamName:
 *                 type: string
 *               teamDescription:
 *                 type: string
 *               teamCode:
 *                 type: string
 *               teamLead:
 *                 type: string
 *               teamEmployees:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               teamName: Backend Team
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
 *     summary: Delete a team
 *     description: Only admins can delete teams.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team id
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
