/**
 * seed-hierarchy.js
 *
 * Populates a demo organisation hierarchy matching the UI image:
 *
 *                        Manoj Kumar  (admin — CEO)
 *                 ┌──────────┬──────────────┬──────────────┐
 *          Marcus Wright  Sarah Jenkins  David Chen    Priya Sharma
 *          (manager —     (manager —     (hr_manager — (subAdmin —
 *           Head of Fin)   Ops Director)  HR Head)      Exec Board)
 *                               │
 *                    ┌──────────┴──────────┐
 *              Sarah Jenkins Jr        Marcus Wright Jr
 *              (team_lead —             (team_lead —
 *               Ops Director)            Head of Finance)
 *
 * Run:  node seed-hierarchy.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/hrms';

// ── Schema (inline — avoids importing the full app stack) ────────────────────
const userSchema = new mongoose.Schema(
  {
    name:           String,
    employeeId:     String,
    email:          { type: String, unique: true, sparse: true, lowercase: true },
    password:       String,
    role:           { type: String, default: 'employee' },
    profilePic:     String,
    isActive:       { type: Boolean, default: true },
    approvalStatus: { type: String, default: 'approved' },
    workInformation: {
      designation:     String,
      department:      mongoose.Schema.Types.Mixed,
      reportingPerson: mongoose.Schema.Types.Mixed,
      joinedDate:      Date,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ── Seed data definition ─────────────────────────────────────────────────────

const SEED_USERS = [
  // ── Level 0 — Root ────────────────────────────────────────────────────────
  {
    _key:          'ceo',
    name:          'Manoj Kumar',
    employeeId:    'EMP001',
    email:         'manoj.kumar@company.com',
    role:          'admin',
    designation:   'Chief Executive Officer',
    department:    'Executive Board',
    reportingKey:  null,
  },

  // ── Level 1 — Reports to CEO ──────────────────────────────────────────────
  {
    _key:          'hof',
    name:          'Marcus Wright',
    employeeId:    'EMP002',
    email:         'marcus.wright@company.com',
    role:          'manager',
    designation:   'Head of Finance',
    department:    'Finance Department',
    reportingKey:  'ceo',
  },
  {
    _key:          'ops_dir',
    name:          'Sarah Jenkins',
    employeeId:    'EMP003',
    email:         'sarah.jenkins@company.com',
    role:          'manager',
    designation:   'Operations Director',
    department:    'Operations Unit',
    reportingKey:  'ceo',
  },
  {
    _key:          'hr_head',
    name:          'David Chen',
    employeeId:    'EMP004',
    email:         'david.chen@company.com',
    role:          'hr_manager',
    designation:   'HR Head',
    department:    'Human Resources',
    reportingKey:  'ceo',
  },
  {
    _key:          'exec_board',
    name:          'Priya Sharma',
    employeeId:    'EMP005',
    email:         'priya.sharma@company.com',
    role:          'subAdmin',
    designation:   'Chief Executive Officer',
    department:    'Executive Board',
    reportingKey:  'ceo',
  },

  // ── Level 2 — Reports to Ops Director ────────────────────────────────────
  {
    _key:          'ops_tl1',
    name:          'Jocelyn Bergson',
    employeeId:    'EMP006',
    email:         'jocelyn.bergson@company.com',
    role:          'team_lead',
    designation:   'Operations Director',
    department:    'Operations Unit',
    reportingKey:  'ops_dir',
  },
  {
    _key:          'ops_tl2',
    name:          'Nolan Dokidis',
    employeeId:    'EMP007',
    email:         'nolan.dokidis@company.com',
    role:          'team_lead',
    designation:   'Head of Finance',
    department:    'Finance Department',
    reportingKey:  'ops_dir',
  },

  // ── Level 2 — Reports to Head of Finance ─────────────────────────────────
  {
    _key:          'fin_emp1',
    name:          'Lydia Donin',
    employeeId:    'EMP008',
    email:         'lydia.donin@company.com',
    role:          'employee',
    designation:   'Financial Analyst',
    department:    'Finance Department',
    reportingKey:  'hof',
  },
  {
    _key:          'fin_emp2',
    name:          'Jaxson Carder',
    employeeId:    'EMP009',
    email:         'jaxson.carder@company.com',
    role:          'employee',
    designation:   'Finance Executive',
    department:    'Finance Department',
    reportingKey:  'hof',
  },

  // ── Level 2 — Reports to HR Head ─────────────────────────────────────────
  {
    _key:          'hr_emp1',
    name:          'Cristofer Dias',
    employeeId:    'EMP010',
    email:         'cristofer.dias@company.com',
    role:          'staff',
    designation:   'HR Executive',
    department:    'Human Resources',
    reportingKey:  'hr_head',
  },

  // ── Level 3 — Reports to Ops TL1 ─────────────────────────────────────────
  {
    _key:          'ops_emp1',
    name:          'Marilyn Press',
    employeeId:    'EMP011',
    email:         'marilyn.press@company.com',
    role:          'employee',
    designation:   'Operations Executive',
    department:    'Operations Unit',
    reportingKey:  'ops_tl1',
  },
  {
    _key:          'ops_emp2',
    name:          'Cheyenne Workman',
    employeeId:    'EMP012',
    email:         'cheyenne.workman@company.com',
    role:          'employee',
    designation:   'Operations Executive',
    department:    'Operations Unit',
    reportingKey:  'ops_tl1',
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  const hashedPwd = await bcrypt.hash('Password1', 8);

  // First pass — insert users without reportingPerson so we get real ObjectIds
  const keyToId = {};

  for (const def of SEED_USERS) {
    const existing = await User.findOne({ email: def.email });
    if (existing) {
      keyToId[def._key] = existing._id;
      console.log(`  skip (exists): ${def.name} <${def.email}>`);
      continue;
    }

    const created = await User.create({
      name:           def.name,
      employeeId:     def.employeeId,
      email:          def.email,
      password:       hashedPwd,
      role:           def.role,
      profilePic:     null,
      isActive:       true,
      approvalStatus: 'approved',
      workInformation: {
        designation:  def.designation,
        department:   def.department,
        joinedDate:   new Date('2024-01-14'),
        reportingPerson: null, // will be patched in the second pass
      },
    });

    keyToId[def._key] = created._id;
    console.log(`  created: ${def.name} (${def.role}) — ${created._id}`);
  }

  // Second pass — wire reportingPerson references
  for (const def of SEED_USERS) {
    if (!def.reportingKey) continue;
    const userId    = keyToId[def._key];
    const parentId  = keyToId[def.reportingKey];
    if (!userId || !parentId) continue;

    await User.updateOne(
      { _id: userId },
      { $set: { 'workInformation.reportingPerson': parentId } }
    );
    console.log(`  linked: ${def.name} → reports to key(${def.reportingKey}) [${parentId}]`);
  }

  console.log('\nHierarchy seed complete.');
  console.log('Call GET /v1/hierarchy/tree to see the org chart.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
