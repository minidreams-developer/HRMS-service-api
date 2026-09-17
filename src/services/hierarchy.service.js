const mongoose = require('mongoose');
const { User } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// ROLE ORDER — defines the top-down precedence for the org chart.
// Lower index = higher in the hierarchy.
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_ORDER = [
  'admin',
  'subAdmin',
  'manager',
  'hr_manager',
  'team_lead',
  'staff',
  'employee',
  'contractor',
  'agent',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely convert any value to string for comparison.
 */
const toStr = (v) => (v ? String(v) : null);

/**
 * Project only the fields needed for hierarchy nodes.
 */
const NODE_SELECT = {
  _id: 1,
  name: 1,
  employeeId: 1,
  profilePic: 1,
  role: 1,
  'workInformation.designation': 1,
  'workInformation.department': 1,
  'workInformation.reportingPerson': 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// NODE BUILDER — shapes a raw user doc into a hierarchy node
// ─────────────────────────────────────────────────────────────────────────────

const buildNode = (user, children = []) => ({
  id:          String(user._id),
  name:        user.name || 'Unknown',
  employeeId:  user.employeeId || null,
  profilePic:  user.profilePic || null,
  role:        user.role || null,
  designation: user.workInformation?.designation || null,
  department:  user.workInformation?.department
    ? typeof user.workInformation.department === 'object' && user.workInformation.department.departmentName
      ? user.workInformation.department.departmentName
      : null
    : null,
  reportingPersonId: toStr(user.workInformation?.reportingPerson) || null,
  children,
});

// ─────────────────────────────────────────────────────────────────────────────
// TREE BUILDER — recursive, operates fully in-memory after a single DB fetch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an in-memory tree from a flat array of users.
 * Uses reportingPerson as the parent link.
 *
 * @param {string|null} parentId  — null for root nodes
 * @param {Map}         userMap   — Map<id, userDoc>
 * @param {Map}         childMap  — Map<parentId, userDoc[]>
 * @param {Set}         visited   — cycle guard
 */
const buildTree = (parentId, userMap, childMap, visited = new Set()) => {
  const children = childMap.get(parentId) || [];
  return children.map((user) => {
    const id = String(user._id);
    if (visited.has(id)) return buildNode(user, []); // cycle guard
    visited.add(id);
    const subtree = buildTree(id, userMap, childMap, visited);
    visited.delete(id);
    return buildNode(user, subtree);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET FULL HIERARCHY TREE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the complete organisation hierarchy as a tree.
 * Root nodes are users whose reportingPerson is null / undefined / invalid.
 *
 * Options:
 *   rootId   — start tree from a specific user (subtree view)
 *   maxDepth — limit tree depth (0 = unlimited)
 */
const getHierarchyTree = async ({ rootId = null, maxDepth = 0 } = {}) => {
  // Single query — fetch all active employees
  const users = await User.find(
    { isActive: 'Active', isDeleted: { $ne: true }, role: { $ne: 'admin' } },
    NODE_SELECT,
  ).lean();

  // Also fetch admin/subAdmin as possible roots
  const topUsers = await User.find(
    { isActive: 'Active', isDeleted: { $ne: true }, role: { $in: ['admin', 'subAdmin'] } },
    NODE_SELECT,
  ).lean();

  const allUsers = [...topUsers, ...users.filter((u) => !['admin', 'subAdmin'].includes(u.role))];

  // Build lookup maps
  const userMap  = new Map(allUsers.map((u) => [String(u._id), u]));
  const childMap = new Map(); // parentId → children[]

  const validIds = new Set(allUsers.map((u) => String(u._id)));

  for (const user of allUsers) {
    const rawParent = toStr(user.workInformation?.reportingPerson);
    // A parent is valid only if another user with that id exists
    const parentId  = rawParent && validIds.has(rawParent) ? rawParent : null;

    if (!childMap.has(parentId)) childMap.set(parentId, []);
    childMap.get(parentId).push(user);
  }

  // Sort children within each level by role order then name
  for (const [, children] of childMap) {
    children.sort((a, b) => {
      const ra = ROLE_ORDER.indexOf(a.role) === -1 ? 99 : ROLE_ORDER.indexOf(a.role);
      const rb = ROLE_ORDER.indexOf(b.role) === -1 ? 99 : ROLE_ORDER.indexOf(b.role);
      if (ra !== rb) return ra - rb;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  let tree;

  if (rootId) {
    // Subtree mode — start from a specific user
    const rootUser = userMap.get(rootId);
    if (!rootUser) return { tree: [], totalNodes: 0 };
    const subtree = buildTree(rootId, userMap, childMap);
    tree = [buildNode(rootUser, subtree)];
  } else {
    // Full tree — roots are nodes with no valid parent
    const roots = childMap.get(null) || [];
    tree = roots.map((user) => {
      const id = String(user._id);
      return buildNode(user, buildTree(id, userMap, childMap));
    });
  }

  // Apply maxDepth if specified
  if (maxDepth > 0) {
    const trimDepth = (nodes, depth) => {
      if (depth >= maxDepth) return nodes.map((n) => ({ ...n, children: [] }));
      return nodes.map((n) => ({ ...n, children: trimDepth(n.children, depth + 1) }));
    };
    tree = trimDepth(tree, 1);
  }

  // Count total nodes
  const countNodes = (nodes) =>
    nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);

  return {
    tree,
    totalNodes: countNodes(tree),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET FLAT LIST (for role-grouped view)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all employees grouped by role, sorted by ROLE_ORDER.
 * Useful for the flat role-hierarchy panel.
 */
const getHierarchyByRole = async () => {
  const users = await User.find({ isActive: 'Active', isDeleted: { $ne: true } }, NODE_SELECT).lean();

  const grouped = {};
  for (const role of ROLE_ORDER) {
    grouped[role] = [];
  }

  for (const user of users) {
    const role = user.role || 'employee';
    if (!grouped[role]) grouped[role] = [];
    grouped[role].push(buildNode(user));
  }

  // Remove empty groups
  const result = ROLE_ORDER
    .filter((role) => grouped[role].length > 0)
    .map((role) => ({
      role,
      level:  ROLE_ORDER.indexOf(role) + 1,
      count:  grouped[role].length,
      users:  grouped[role],
    }));

  return { levels: result, totalUsers: users.length };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE USER'S CHAIN (upward path to root)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the reporting chain for a specific user, from the user up to the root.
 * [ employee → team_lead → manager → admin ]
 */
const getReportingChain = async (userId) => {
  const chain = [];
  const visited = new Set();
  let currentId = userId;

  while (currentId) {
    if (visited.has(String(currentId))) break; // cycle guard
    visited.add(String(currentId));

    // eslint-disable-next-line no-await-in-loop
    const user = await User.findById(currentId, NODE_SELECT).lean();
    if (!user) break;

    chain.push(buildNode(user));

    const parentRaw = toStr(user.workInformation?.reportingPerson);
    currentId = parentRaw && mongoose.Types.ObjectId.isValid(parentRaw) ? parentRaw : null;
  }

  return { chain, depth: chain.length };
};

module.exports = {
  getHierarchyTree,
  getHierarchyByRole,
  getReportingChain,
};
