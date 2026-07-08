const mongoose = require('mongoose');
const config = require('./src/config/config');
const User = require('./src/models/user.model');
const Role = require('./src/models/roleAccess.model');
const { buildDefaultPermissions } = require('./src/models/roleAccess.model');

const run = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log('Connected to MongoDB\n');

  // ── 1. Create a custom Role ──────────────────────────────────────────────
  let role = await Role.findOne({ name: 'HR Manager' });

  if (role) {
    console.log(`[SKIP]  Role "HR Manager" already exists  →  ${role._id}`);
  } else {
    // Build default permissions and enable a few modules for this role
    const permissions = buildDefaultPermissions();

    // Enable dashboard (standalone group)
    permissions[0].modules[0].enabled = true;
    permissions[0].modules[0].permissions = { view: true, add: false, edit: false, delete: false };

    // Enable employees module (peopleHub group)
    permissions[1].modules[1].enabled = true;
    permissions[1].modules[1].permissions = { view: true, add: true, edit: true, delete: false };

    // Enable attendance module (timeHub group)
    permissions[3].modules[0].enabled = true;
    permissions[3].modules[0].permissions = { view: true, add: true, edit: true, delete: false };

    role = await Role.create({
      name:        'HR Manager',
      description: 'Manages employee records and attendance',
      isSystemRole: false,
      isDefault:   false,
      isActive:    true,
      permissions,
    });

    console.log(`[OK]    Role created`);
    console.log(`        Name : ${role.name}`);
    console.log(`        ID   : ${role._id}\n`);
  }

  // ── 2. Create the User linked to that Role ────────────────────────────────
  const email = 'hrmanager@example.com';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`[SKIP]  User already exists  →  ${email}`);
  } else {
    const user = await User.create({
      name:            'HR Manager User',
      email,
      password:        'HrManager@123',
      role:            'manager',        // system-level role (enum in User model)
      isEmailVerified: true,
      isActive:        true,
      workInformation: {
        designation: 'HR Manager',
      },
    });

    // Link the custom Role doc back to the user
    await Role.findByIdAndUpdate(role._id, { user: user._id });

    console.log(`[OK]    User created`);
    console.log(`        Name        : ${user.name}`);
    console.log(`        Email       : ${email}`);
    console.log(`        Password    : HrManager@123`);
    console.log(`        System Role : ${user.role}`);
    console.log(`        Custom Role : ${role.name}  (${role._id})`);
    console.log(`        User ID     : ${user._id}`);
  }

  process.exit(0);
};

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
