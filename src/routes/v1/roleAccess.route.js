const express = require('express');
const roleAccessController = require('../../controllers/roleAccess.controller');
const validate = require('../../middlewares/validate');
const { roleAccessValidation } = require('../../validations');

const router = express.Router();

// ── Collection ──────────────────────────────────────────────────────────────
router
  .route('/')
  .post(validate(roleAccessValidation.createRole), roleAccessController.createRole)
  .get(validate(roleAccessValidation.getRoles), roleAccessController.getRoles);

// ── Single role ──────────────────────────────────────────────────────────────
router
  .route('/:roleId')
  .get(validate(roleAccessValidation.getRole), roleAccessController.getRole)
  .patch(validate(roleAccessValidation.updateRole), roleAccessController.updateRole)
  .delete(validate(roleAccessValidation.deleteRole), roleAccessController.deleteRole);

// ── Permissions — full group array ───────────────────────────────────────────
router
  .route('/:roleId/permissions')
  .get(validate(roleAccessValidation.getRolePermissions), roleAccessController.getRolePermissions)
  .patch(validate(roleAccessValidation.updateRolePermissions), roleAccessController.updateRolePermissions);

// ── Permissions — single module inside a group ───────────────────────────────
router
  .route('/:roleId/permissions/:group/:module')
  .patch(validate(roleAccessValidation.updateModulePermissions), roleAccessController.updateModulePermissions);

// ── Permissions — reset to all-false ─────────────────────────────────────────
router
  .route('/:roleId/permissions/reset')
  .post(validate(roleAccessValidation.getRole), roleAccessController.resetRolePermissions);

// ── Clone ─────────────────────────────────────────────────────────────────────
router
  .route('/:roleId/clone')
  .post(validate(roleAccessValidation.cloneRole), roleAccessController.cloneRole);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: RoleAccess
 *   description: Role and permission management
 */

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a role
 *     tags: [RoleAccess]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isSystemRole:
 *                 type: boolean
 *               isDefault:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               permissions:
 *                 type: array
 *                 description: If omitted, defaults to all-false for every group/module.
 *                 items:
 *                   $ref: '#/components/schemas/PermissionGroup'
 *             example:
 *               name: HR Manager
 *               description: Manages people hub modules
 *               isSystemRole: false
 *               isDefault: false
 *               isActive: true
 *     responses:
 *       "201":
 *         description: Created
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   get:
 *     summary: Get all roles
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *       - in: query
 *         name: isSystemRole
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isDefault
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: "e.g. name:asc"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /roles/{roleId}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update role metadata
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       "200":
 *         description: OK
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a role (system roles cannot be deleted)
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "204":
 *         description: No content
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /roles/{roleId}/permissions:
 *   get:
 *     summary: Get all permissions for a role (full grouped structure)
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PermissionGroup'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Replace the full grouped permissions array for a role
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
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
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/PermissionGroup'
 *             example:
 *               permissions:
 *                 - group: peopleHub
 *                   modules:
 *                     - module: employees
 *                       enabled: true
 *                       permissions:
 *                         view: true
 *                         add: true
 *                         edit: true
 *                         delete: false
 *     responses:
 *       "200":
 *         description: OK
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /roles/{roleId}/permissions/{group}/{module}:
 *   patch:
 *     summary: Update a single module inside a group
 *     description: >
 *       Granular update — only the specified module is changed.
 *       Valid groups: standalone | peopleHub | timeHub | payHub.
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: group
 *         required: true
 *         schema:
 *           type: string
 *           enum: [standalone, peopleHub, timeHub, payHub]
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - dashboard
 *             - announcement
 *             - onboarding
 *             - employees
 *             - agents
 *             - teams
 *             - branch
 *             - hierarchy
 *             - offBoarding
 *             - attendance
 *             - leaveAttendance
 *             - overtimeManagement
 *             - shiftManagement
 *             - leaderboard
 *             - dayOffAndHolidays
 *             - payroll
 *             - paysheet
 *             - stopPayroll
 *             - additionAndDeductions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               permissions:
 *                 type: object
 *                 properties:
 *                   view:
 *                     type: boolean
 *                   add:
 *                     type: boolean
 *                   edit:
 *                     type: boolean
 *                   delete:
 *                     type: boolean
 *           example:
 *             enabled: true
 *             permissions:
 *               view: true
 *               add: true
 *               edit: false
 *               delete: false
 *     responses:
 *       "200":
 *         description: OK
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /roles/{roleId}/permissions/reset:
 *   post:
 *     summary: Reset all permissions to the all-false default
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /roles/{roleId}/clone:
 *   post:
 *     summary: Clone a role with a new name
 *     tags: [RoleAccess]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
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
 *               - newName
 *             properties:
 *               newName:
 *                 type: string
 *           example:
 *             newName: Junior HR Manager
 *     responses:
 *       "201":
 *         description: Created
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ModulePermission:
 *       type: object
 *       properties:
 *         module:
 *           type: string
 *           enum:
 *             - dashboard
 *             - announcement
 *             - onboarding
 *             - employees
 *             - agents
 *             - teams
 *             - branch
 *             - hierarchy
 *             - offBoarding
 *             - attendance
 *             - leaveAttendance
 *             - overtimeManagement
 *             - shiftManagement
 *             - leaderboard
 *             - dayOffAndHolidays
 *             - payroll
 *             - paysheet
 *             - stopPayroll
 *             - additionAndDeductions
 *         enabled:
 *           type: boolean
 *         permissions:
 *           type: object
 *           properties:
 *             view:
 *               type: boolean
 *             add:
 *               type: boolean
 *             edit:
 *               type: boolean
 *             delete:
 *               type: boolean
 *
 *     PermissionGroup:
 *       type: object
 *       properties:
 *         group:
 *           type: string
 *           enum: [standalone, peopleHub, timeHub, payHub]
 *         modules:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ModulePermission'
 */
