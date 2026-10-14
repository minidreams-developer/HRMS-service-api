const express = require('express');
const validate = require('../../middlewares/validate');
const hierarchyValidation = require('../../validations/hierarchy.validation');
const { hierarchyController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

/**
 * Hierarchy routes
 *
 * GET /v1/hierarchy/tree             - Full org-chart tree (nested, from root)
 * GET /v1/hierarchy/tree?rootId=X    - Subtree starting from a specific user
 * GET /v1/hierarchy/tree?maxDepth=N  - Tree limited to N levels deep
 * GET /v1/hierarchy/roles            - All users grouped by role (flat, ordered)
 * GET /v1/hierarchy/chain/:userId    - Upward reporting chain for one user
 */

router
  .route('/tree')
  .get(auth({ group: 'peopleHub', module: 'hierarchy' }), validate(hierarchyValidation.getHierarchyTree), hierarchyController.getHierarchyTree);

router
  .route('/roles')
  .get(auth({ group: 'peopleHub', module: 'hierarchy' }), validate(hierarchyValidation.getHierarchyByRole), hierarchyController.getHierarchyByRole);

router
  .route('/chain/:userId')
  .get(auth({ group: 'peopleHub', module: 'hierarchy' }), validate(hierarchyValidation.getReportingChain), hierarchyController.getReportingChain);

router.route('/reports/:managerId').get(auth({ group: 'peopleHub', module: 'hierarchy' }), validate(hierarchyValidation.getDirectReports), hierarchyController.getDirectReports);

module.exports = router;
