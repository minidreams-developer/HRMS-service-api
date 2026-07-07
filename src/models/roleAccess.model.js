const mongoose = require("mongoose");
const { toJSON, paginate } = require('./plugins');

// Module list per group — mirrors the UI sidebar
const MODULE_GROUPS = {
  standalone:  ['dashboard', 'announcement'],
  peopleHub:   ['onboarding', 'employees', 'agents', 'teams', 'branch', 'hierarchy', 'offBoarding'],
  contractors: ['contractorOverview', 'contractorContractors', 'contractorPayments'],
  timeHub:     ['attendance', 'leaveAttendance', 'overtimeManagement', 'shiftManagement', 'leaderboard', 'dayOffHolidays'],
  payHub:      ['payroll', 'paysheet', 'stopPayroll', 'additionDeductions'],
  help:        ['help'],
  settings:    ['generalSettings', 'organizationDetails', 'daySettings', 'seriesConfiguration', 'departments', 'roles'],
};

const ALL_MODULES = Object.values(MODULE_GROUPS).flat();

const modulePermissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      // no enum — accept any module name
    },

    enabled: {
      type: Boolean,
      default: false,
    },

    permissions: {
      view:   { type: Boolean, default: false },
      add:    { type: Boolean, default: false },
      edit:   { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    group: {
      type: String,
      required: true,
      // no enum — accept any group name
    },

    modules: [modulePermissionSchema],
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    roleId: {
      type: String,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    isSystemRole: {
      type: Boolean,
      default: false,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    permissions: {
      type: [groupSchema],
      default: () => buildDefaultPermissions(),
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * Builds the default permissions structure with all groups and modules
 * set to disabled — ready to be toggled by the admin.
 */
function buildDefaultPermissions() {
  return Object.entries(MODULE_GROUPS).map(([group, modules]) => ({
    group,
    modules: modules.map((module) => ({
      module,
      enabled: false,
      permissions: { view: false, add: false, edit: false, delete: false },
    })),
  }));
}

roleSchema.plugin(toJSON);
roleSchema.plugin(paginate);

module.exports = mongoose.model('Role', roleSchema);
module.exports.MODULE_GROUPS = MODULE_GROUPS;
module.exports.ALL_MODULES = ALL_MODULES;
module.exports.buildDefaultPermissions = buildDefaultPermissions;
