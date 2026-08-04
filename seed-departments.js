// Seed departments into the Department collection
// Run: NODE_ENV=development node seed-departments.js

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config/config');
const Department = require('./src/models/department.model');

// ─── Department data ──────────────────────────────────────────────────────────

const departmentsData = [
  {
    departmentName: 'Engineering',
    departmentCode: 'DEPT-001',
    departmentDescription: 'Software development, architecture and DevOps',
  },
  {
    departmentName: 'Human Resources',
    departmentCode: 'DEPT-002',
    departmentDescription: 'Recruitment, onboarding, and people operations',
  },
  {
    departmentName: 'Finance',
    departmentCode: 'DEPT-003',
    departmentDescription: 'Accounts, payroll, and financial planning',
  },
  {
    departmentName: 'Sales',
    departmentCode: 'DEPT-004',
    departmentDescription: 'Business development and client acquisition',
  },
  {
    departmentName: 'Marketing',
    departmentCode: 'DEPT-005',
    departmentDescription: 'Brand, campaigns, and digital marketing',
  },
  {
    departmentName: 'Quality Assurance',
    departmentCode: 'DEPT-006',
    departmentDescription: 'Testing, QA processes, and quality control',
  },
  {
    departmentName: 'Product',
    departmentCode: 'DEPT-007',
    departmentDescription: 'Product management and design',
  },
  {
    departmentName: 'Operations',
    departmentCode: 'DEPT-008',
    departmentDescription: 'Day-to-day operations and logistics',
  },
  {
    departmentName: 'Customer Support',
    departmentCode: 'DEPT-009',
    departmentDescription: 'Client support and issue resolution',
  },
  {
    departmentName: 'Legal',
    departmentCode: 'DEPT-010',
    departmentDescription: 'Legal compliance, contracts, and governance',
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

async function seedDepartments() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const dept of departmentsData) {
      // Skip if a department with the same code already exists
      const exists = await Department.findOne({ departmentCode: dept.departmentCode });
      if (exists) {
        console.log(`  SKIP  ${dept.departmentName} (${dept.departmentCode}) — already exists`);
        skipped++;
        continue;
      }

      await Department.create(dept);
      console.log(`  OK    ${dept.departmentName} (${dept.departmentCode})`);
      created++;
    }

    console.log(`\nDone. Created: ${created}  Skipped: ${skipped}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seedDepartments();
