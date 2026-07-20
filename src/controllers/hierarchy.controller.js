const catchAsync = require('../utils/catchAsync');
const { hierarchyService } = require('../services');

/**
 * GET /v1/hierarchy/tree
 * Full org-chart tree from root.
 * Query: rootId? (start from a specific user), maxDepth? (limit levels)
 */
const getHierarchyTree = catchAsync(async (req, res) => {
  const rootId   = req.query.rootId   || null;
  const maxDepth = parseInt(req.query.maxDepth, 10) || 0;
  const result   = await hierarchyService.getHierarchyTree({ rootId, maxDepth });
  res.send(result);
});

/**
 * GET /v1/hierarchy/roles
 * All users grouped by role, ordered top-down.
 */
const getHierarchyByRole = catchAsync(async (req, res) => {
  const result = await hierarchyService.getHierarchyByRole();
  res.send(result);
});

/**
 * GET /v1/hierarchy/chain/:userId
 * Upward reporting chain for a specific user (employee → … → CEO).
 */
const getReportingChain = catchAsync(async (req, res) => {
  const result = await hierarchyService.getReportingChain(req.params.userId);
  res.send(result);
});

module.exports = {
  getHierarchyTree,
  getHierarchyByRole,
  getReportingChain,
};
