// Full seed: branches, departments, shifts, teams, then 10 employees with all data linked
// Run: node seed-employees.js

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config/config');
const { userService } = require('./src/services');
const { Branch, Department, Shift, Team, User, Address, BankDetails, SalaryDetails } = require('./src/models');
const EmergencyContact = require('./src/models/emergencyContact.model');

// ─── BRANCHES ────────────────────────────────────────────────────────────────
const branchesData = [
  { branchName: 'Chennai HQ',      branchNumber: 'BR001', activeStatus: 'active' },
  { branchName: 'Coimbatore',      branchNumber: 'BR002', activeStatus: 'active' },
  { branchName: 'Madurai',         branchNumber: 'BR003', activeStatus: 'active' },
];

// ─── DEPARTMENTS ─────────────────────────────────────────────────────────────
const departmentsData = [
  { departmentName: 'Engineering',      departmentCode: 'DEP001', departmentDescription: 'Software development team' },
  { departmentName: 'Human Resources',  departmentCode: 'DEP002', departmentDescription: 'HR and people operations' },
  { departmentName: 'Quality Assurance',departmentCode: 'DEP003', departmentDescription: 'QA and testing team' },
  { departmentName: 'Product',          departmentCode: 'DEP004', departmentDescription: 'Product and design team' },
];

// ─── SHIFTS ──────────────────────────────────────────────────────────────────
const shiftsData = [
  {
    shiftName: 'Morning Shift', shiftCode: 'SH001', shiftType: 'Fixed',
    totalShiftDuration: '9h', minWorkingHours: '8h',
    weekOff: ['Sunday'],
    timings: [
      { day: 'Monday',    startTime: '09:00', endTime: '18:00', off: false },
      { day: 'Tuesday',   startTime: '09:00', endTime: '18:00', off: false },
      { day: 'Wednesday', startTime: '09:00', endTime: '18:00', off: false },
      { day: 'Thursday',  startTime: '09:00', endTime: '18:00', off: false },
      { day: 'Friday',    startTime: '09:00', endTime: '18:00', off: false },
      { day: 'Saturday',  startTime: '09:00', endTime: '13:00', off: false },
      { day: 'Sunday',    startTime: '00:00', endTime: '00:00', off: true  },
    ],
    gracePeriod: { earlyCheckIn: 10, lateCheckIn: 15, earlyCheckOut: 10, lateCheckOut: 15 },
  },
  {
    shiftName: 'General Shift', shiftCode: 'SH002', shiftType: 'Fixed',
    totalShiftDuration: '8h', minWorkingHours: '7.5h',
    weekOff: ['Saturday', 'Sunday'],
    timings: [
      { day: 'Monday',    startTime: '10:00', endTime: '18:00', off: false },
      { day: 'Tuesday',   startTime: '10:00', endTime: '18:00', off: false },
      { day: 'Wednesday', startTime: '10:00', endTime: '18:00', off: false },
      { day: 'Thursday',  startTime: '10:00', endTime: '18:00', off: false },
      { day: 'Friday',    startTime: '10:00', endTime: '18:00', off: false },
      { day: 'Saturday',  startTime: '00:00', endTime: '00:00', off: true  },
      { day: 'Sunday',    startTime: '00:00', endTime: '00:00', off: true  },
    ],
    gracePeriod: { earlyCheckIn: 10, lateCheckIn: 15, earlyCheckOut: 10, lateCheckOut: 15 },
  },
];

// ─── TEAMS (built after departments are created) ──────────────────────────────
const buildTeams = (deptMap) => [
  { teamName: 'Backend Team',  teamCode: 'TM001', teamDescription: 'Node.js backend developers',  department: deptMap['Engineering'] },
  { teamName: 'Frontend Team', teamCode: 'TM002', teamDescription: 'React frontend developers',   department: deptMap['Engineering'] },
  { teamName: 'HR Operations', teamCode: 'TM003', teamDescription: 'Core HR operations team',     department: deptMap['Human Resources'] },
  { teamName: 'QA Team',       teamCode: 'TM004', teamDescription: 'Manual and automation QA',    department: deptMap['Quality Assurance'] },
  { teamName: 'Product Team',  teamCode: 'TM005', teamDescription: 'Product management and UX',   department: deptMap['Product'] },
];

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
// refs filled in dynamically after seed data is created
const buildEmployees = (refs) => {
  const { branches, departments, shifts, teams } = refs;
  return [
    {
      name: 'Arjun Murugesan', email: 'arjun.murugesan@company.com', password: 'Pass1234',
      phone: 9876541001, gender: 'male', dateOfBirth: '1993-04-12', age: 31,
      spokenLanguages: ['Tamil', 'English'], martialStatus: 'married',
      motherTongue: 'Tamil', identificationMark: 'Scar on right hand',
      religion: 'Hindu', documentNo: { aadharNo: 234567890123, panNo: 'ARJMU1234A' },
      addresses: [{ addressLine1: '12 Anna Nagar East', addressLine2: 'Near Roundtana', city: 'Chennai', state: 'Tamil Nadu', pincode: 600102 }],
      emergencyContacts: [{ contactName: 'Kavitha Murugesan', phone: 9876541002, relattionship: 'Spouse', mobileNumber: 9876541002 }],
      workInformation: {
        joinedDate: '2021-06-01', experienceType: 'experienced', AttendanceType: 'biometric',
        designation: 'Software Engineer', companyName: 'Ace Workforce',
        department: departments['Engineering'],
        team: teams['Backend Team'],
        branch: branches['Chennai HQ'],
        shiftId: shifts['Morning Shift'],
        userRemarks: 'Relocated from Coimbatore',
      },
      salaryDetails: { basicSalary: 35000, annualCTC: 700000, monthlyCTC: 58333, houseRentAllowance: 14000, conveyanceAllowance: 2000, specialAllowance: 5000, otherFixedAllowance: 2333 },
      bankDetails: [{ accountHolderName: 'Arjun Murugesan', bankName: 'Indian Bank', accountNumber: 5001234567, ifscCode: 'IDIB000A001', branch: 'Anna Nagar Branch', esiAndPf: { esiNumber: 1112223334, pfNumber: 4443332221 } }],
    },
    {
      name: 'Priya Sundaram', email: 'priya.sundaram@company.com', password: 'Pass1234',
      phone: 9876541003, gender: 'female', dateOfBirth: '1996-09-25', age: 28,
      spokenLanguages: ['Tamil', 'English', 'Telugu'], martialStatus: 'unMarried',
      motherTongue: 'Tamil', identificationMark: 'Birthmark on left arm',
      religion: 'Hindu', documentNo: { aadharNo: 345678901234, panNo: 'PRISU5678B' },
      addresses: [{ addressLine1: '45 Velachery Main Road', addressLine2: 'Opposite to Phoenix Mall', city: 'Chennai', state: 'Tamil Nadu', pincode: 600042 }],
      emergencyContacts: [{ contactName: 'Rajan Sundaram', phone: 9876541004, relattionship: 'Father', mobileNumber: 9876541004 }],
      workInformation: {
        joinedDate: '2022-03-15', experienceType: 'experienced', AttendanceType: 'biometric',
        designation: 'UI/UX Designer', companyName: 'Ace Workforce',
        department: departments['Product'],
        team: teams['Product Team'],
        branch: branches['Chennai HQ'],
        shiftId: shifts['General Shift'],
      },
      salaryDetails: { basicSalary: 30000, annualCTC: 600000, monthlyCTC: 50000, houseRentAllowance: 12000, conveyanceAllowance: 2000, specialAllowance: 4000, otherFixedAllowance: 2000 },
      bankDetails: [{ accountHolderName: 'Priya Sundaram', bankName: 'Canara Bank', accountNumber: 5002345678, ifscCode: 'CNRB0001234', branch: 'Velachery Branch', esiAndPf: { esiNumber: 2223334445, pfNumber: 5554443332 } }],
    },
    {
      name: 'Karthik Rajendran', email: 'karthik.rajendran@company.com', password: 'Pass1234',
      phone: 9876541005, gender: 'male', dateOfBirth: '1990-01-30', age: 34,
      spokenLanguages: ['Tamil', 'English'], martialStatus: 'married',
      motherTongue: 'Tamil', identificationMark: 'Mole on chin',
      religion: 'Hindu', documentNo: { aadharNo: 456789012345, panNo: 'KARRA9012C' },
      addresses: [{ addressLine1: '78 Gandhipuram', addressLine2: '2nd Cross Street', city: 'Coimbatore', state: 'Tamil Nadu', pincode: 641012 }],
      emergencyContacts: [{ contactName: 'Meena Karthik', phone: 9876541006, relattionship: 'Spouse', mobileNumber: 9876541006 }],
      workInformation: {
        joinedDate: '2020-08-10', experienceType: 'experienced', AttendanceType: 'manual',
        designation: 'Senior Backend Developer', companyName: 'Ace Workforce',
        department: departments['Engineering'],
        team: teams['Backend Team'],
        branch: branches['Coimbatore'],
        shiftId: shifts['Morning Shift'],
        userRemarks: 'Remote employee',
      },
      salaryDetails: { basicSalary: 45000, annualCTC: 900000, monthlyCTC: 75000, houseRentAllowance: 18000, conveyanceAllowance: 2500, specialAllowance: 7000, otherFixedAllowance: 2500 },
      bankDetails: [{ accountHolderName: 'Karthik Rajendran', bankName: 'State Bank of India', accountNumber: 5003456789, ifscCode: 'SBIN0001234', branch: 'Gandhipuram Branch', esiAndPf: { esiNumber: 3334445556, pfNumber: 6665554443 } }],
    },
    {
      name: 'Deepa Venkatesh', email: 'deepa.venkatesh@company.com', password: 'Pass1234',
      phone: 9876541007, gender: 'female', dateOfBirth: '1994-11-08', age: 30,
      spokenLanguages: ['Tamil', 'English', 'Kannada'], martialStatus: 'married',
      motherTongue: 'Tamil', identificationMark: 'Small scar on forehead',
      religion: 'Hindu', documentNo: { aadharNo: 567890123456, panNo: 'DEEPV3456D' },
      addresses: [{ addressLine1: '23 Racecourse Road', addressLine2: 'Near Collector Office', city: 'Coimbatore', state: 'Tamil Nadu', pincode: 641018 }],
      emergencyContacts: [{ contactName: 'Venkatesh Iyer', phone: 9876541008, relattionship: 'Spouse', mobileNumber: 9876541008 }],
      workInformation: {
        joinedDate: '2021-11-22', experienceType: 'experienced', AttendanceType: 'biometric',
        designation: 'HR Executive', companyName: 'Ace Workforce',
        department: departments['Human Resources'],
        team: teams['HR Operations'],
        branch: branches['Coimbatore'],
        shiftId: shifts['General Shift'],
      },
      salaryDetails: { basicSalary: 28000, annualCTC: 540000, monthlyCTC: 45000, houseRentAllowance: 11200, conveyanceAllowance: 1800, specialAllowance: 3000, otherFixedAllowance: 1000 },
      bankDetails: [{ accountHolderName: 'Deepa Venkatesh', bankName: 'Bank of Baroda', accountNumber: 5004567890, ifscCode: 'BARB0COIMBT', branch: 'Racecourse Branch', esiAndPf: { esiNumber: 4445556667, pfNumber: 7776665554 } }],
    },
    {
      name: 'Suresh Palaniswamy', email: 'suresh.palaniswamy@company.com', password: 'Pass1234',
      phone: 9876541009, gender: 'male', dateOfBirth: '1988-07-14', age: 36,
      spokenLanguages: ['Tamil', 'English'], martialStatus: 'married',
      motherTongue: 'Tamil', identificationMark: 'Tattoo on right wrist',
      religion: 'Hindu', documentNo: { aadharNo: 678901234567, panNo: 'SURPA7890E' },
      addresses: [{ addressLine1: '56 Meenakshi Nagar', addressLine2: 'West Masi Street', city: 'Madurai', state: 'Tamil Nadu', pincode: 625001 }],
      emergencyContacts: [{ contactName: 'Selvi Suresh', phone: 9876541010, relattionship: 'Spouse', mobileNumber: 9876541010 }],
      workInformation: {
        joinedDate: '2019-04-01', experienceType: 'experienced', AttendanceType: 'biometric',
        designation: 'Team Lead', companyName: 'Ace Workforce',
        department: departments['Engineering'],
        team: teams['Frontend Team'],
        branch: branches['Madurai'],
        shiftId: shifts['Morning Shift'],
        userRemarks: 'Promoted from senior developer',
      },
      salaryDetails: { basicSalary: 50000, annualCTC: 1000000, monthlyCTC: 83333, houseRentAllowance: 20000, conveyanceAllowance: 3000, specialAllowance: 8000, otherFixedAllowance: 2333 },
      bankDetails: [{ accountHolderName: 'Suresh Palaniswamy', bankName: 'Indian Overseas Bank', accountNumber: 5005678901, ifscCode: 'IOBA0001234', branch: 'Madurai Main Branch', esiAndPf: { esiNumber: 5556667778, pfNumber: 8887776665 } }],
    },
    {
      name: 'Anitha Krishnamurthy', email: 'anitha.krishnamurthy@company.com', password: 'Pass1234',
      phone: 9876541011, gender: 'female', dateOfBirth: '1997-02-19', age: 27,
      spokenLanguages: ['Tamil', 'English'], martialStatus: 'unMarried',
      motherTongue: 'Tamil', identificationMark: 'Mole on right cheek',
      religion: 'Hindu', documentNo: { aadharNo: 789012345678, panNo: 'ANIKU2345F' },
      addresses: [{ addressLine1: '9 Krishnapuram Colony', addressLine2: 'Near Bus Stand', city: 'Tiruchirappalli', state: 'Tamil Nadu', pincode: 620001 }],
      emergencyContacts: [{ contactName: 'Krishnamurthy Pillai', phone: 9876541012, relattionship: 'Father', mobileNumber: 9876541012 }],
      workInformation: {
        joinedDate: '2023-01-09', experienceType: 'fresher', AttendanceType: 'biometric',
        designation: 'Junior Developer', companyName: 'Ace Workforce',
        department: departments['Engineering'],
        team: teams['Frontend Team'],
        branch: branches['Chennai HQ'],
        shiftId: shifts['General Shift'],
        userRemarks: 'Fresh graduate from NIT Trichy',
      },
      salaryDetails: { basicSalary: 20000, annualCTC: 360000, monthlyCTC: 30000, houseRentAllowance: 8000, conveyanceAllowance: 1500, specialAllowance: 500, otherFixedAllowance: 0 },
      bankDetails: [{ accountHolderName: 'Anitha Krishnamurthy', bankName: 'Union Bank of India', accountNumber: 5006789012, ifscCode: 'UBIN0567890', branch: 'Trichy Main Branch', esiAndPf: { esiNumber: 6667778889, pfNumber: 9998887776 } }],
    },
    {
      name: 'Vijay Shanmugam', email: 'vijay.shanmugam@company.com', password: 'Pass1234',
      phone: 9876541013, gender: 'male', dateOfBirth: '1991-05-05', age: 33,
      spokenLanguages: ['Tamil', 'English', 'Malayalam'], martialStatus: 'married',
      motherTongue: 'Tamil', identificationMark: 'Scar on left knee',
      religion: 'Hindu', documentNo: { aadharNo: 890123456789, panNo: 'VIJSH6789G' },
      addresses: [{ addressLine1: '34 Lawspet Main Road', addressLine2: 'Opp. to Government Hospital', city: 'Puducherry', state: 'Tamil Nadu', pincode: 605008 }],
      emergencyContacts: [{ contactName: 'Lakshmi Vijay', phone: 9876541014, relattionship: 'Spouse', mobileNumber: 9876541014 }],
      workInformation: {
        joinedDate: '2020-12-01', experienceType: 'experienced', AttendanceType: 'manual',
        designation: 'QA Engineer', companyName: 'Ace Workforce',
        department: departments['Quality Assurance'],
        team: teams['QA Team'],
        branch: branches['Chennai HQ'],
        shiftId: shifts['Morning Shift'],
      },
      salaryDetails: { basicSalary: 32000, annualCTC: 624000, monthlyCTC: 52000, houseRentAllowance: 12800, conveyanceAllowance: 2000, specialAllowance: 4200, otherFixedAllowance: 1000 },
      bankDetails: [{ accountHolderName: 'Vijay Shanmugam', bankName: 'Punjab National Bank', accountNumber: 5007890123, ifscCode: 'PUNB0001234', branch: 'Puducherry Branch', esiAndPf: { esiNumber: 7778889990, pfNumber: 1110009998 } }],
    },
    {
      name: 'Kavitha Subramanian', email: 'kavitha.subramanian@company.com', password: 'Pass1234',
      phone: 9876541015, gender: 'female', dateOfBirth: '1995-08-30', age: 29,
      spokenLanguages: ['Tamil', 'English'], martialStatus: 'unMarried',
      motherTongue: 'Tamil', identificationMark: 'Dimple on left cheek',
      religion: 'Hindu', documentNo: { aadharNo: 901234567890, panNo: 'KAVSU1234H' },
      addresses: [{ addressLine1: '67 Bypass Road', addressLine2: 'Near Collectorate', city: 'Salem', state: 'Tamil Nadu', pincode: 636001 }],
      emergencyContacts: [{ contactName: 'Subramanian Nadar', phone: 9876541016, relattionship: 'Father', mobileNumber: 9876541016 }],
      workInformation: {
        joinedDate: '2022-07-18', experienceType: 'experienced', AttendanceType: 'biometric',
        designation: 'Business Analyst',
        department: departments['Product'],
        team: teams['Product Team'],
        branch: branches['Madurai'],
        shiftId: shifts['General Shift'],
        userRemarks: 'Transferred from Salem office',
      },
      salaryDetails: { basicSalary: 38000, annualCTC: 756000, monthlyCTC: 63000, houseRentAllowance: 15200, conveyanceAllowance: 2200, specialAllowance: 5600, otherFixedAllowance: 2000 },
      bankDetails: [{ accountHolderName: 'Kavitha Subramanian', bankName: 'Axis Bank', accountNumber: 5008901234, ifscCode: 'UTIB0001234', branch: 'Salem Main Branch', esiAndPf: { esiNumber: 8889990001, pfNumber: 2221110009 } }],
    },
    {
      name: 'Ramesh Govindasamy', email: 'ramesh.govindasamy@company.com', password: 'Pass1234',
      phone: 9876541017, gender: 'male', dateOfBirth: '1989-12-22', age: 35,
      spokenLanguages: ['Tamil', 'English'], martialStatus: 'married',
      motherTongue: 'Tamil', identificationMark: 'Mole on left shoulder',
      religion: 'Hindu', documentNo: { aadharNo: 112233445566, panNo: 'RAMGO5678I' },
      addresses: [{ addressLine1: '101 Nehru Street', addressLine2: 'Opp. to Town Hall', city: 'Tirunelveli', state: 'Tamil Nadu', pincode: 627001 }],
      emergencyContacts: [{ contactName: 'Parvathi Ramesh', phone: 9876541018, relattionship: 'Spouse', mobileNumber: 9876541018 }],
      workInformation: {
        joinedDate: '2018-09-03', experienceType: 'experienced', AttendanceType: 'biometric',
        designation: 'DevOps Engineer',
        department: departments['Engineering'],
        team: teams['Backend Team'],
        branch: branches['Chennai HQ'],
        shiftId: shifts['Morning Shift'],
        userRemarks: 'Handles production deployments',
      },
      salaryDetails: { basicSalary: 48000, annualCTC: 960000, monthlyCTC: 80000, houseRentAllowance: 19200, conveyanceAllowance: 2800, specialAllowance: 7500, otherFixedAllowance: 2500 },
      bankDetails: [{ accountHolderName: 'Ramesh Govindasamy', bankName: 'HDFC Bank', accountNumber: 5009012345, ifscCode: 'HDFC0001234', branch: 'Tirunelveli Branch', esiAndPf: { esiNumber: 9990001112, pfNumber: 3332221110 } }],
    },
    {
      name: 'Nithya Balasubramanian', email: 'nithya.balasubramanian@company.com', password: 'Pass1234',
      phone: 9876541019, gender: 'female', dateOfBirth: '1998-03-11', age: 26,
      spokenLanguages: ['Tamil', 'English', 'Hindi'], martialStatus: 'unMarried',
      motherTongue: 'Tamil', identificationMark: 'Small mole on nose',
      religion: 'Hindu', documentNo: { aadharNo: 223344556677, panNo: 'NITHB9012J' },
      addresses: [{ addressLine1: '15 Kamarajar Salai', addressLine2: 'Near Railway Station', city: 'Vellore', state: 'Tamil Nadu', pincode: 632001 }],
      emergencyContacts: [{ contactName: 'Balasubramanian Iyer', phone: 9876541020, relattionship: 'Father', mobileNumber: 9876541020 }],
      workInformation: {
        joinedDate: '2023-06-05', experienceType: 'fresher', AttendanceType: 'biometric',
        designation: 'Junior QA Analyst',
        department: departments['Quality Assurance'],
        team: teams['QA Team'],
        branch: branches['Coimbatore'],
        shiftId: shifts['General Shift'],
        userRemarks: 'Fresh graduate from VIT Vellore',
      },
      salaryDetails: { basicSalary: 22000, annualCTC: 396000, monthlyCTC: 33000, houseRentAllowance: 8800, conveyanceAllowance: 1500, specialAllowance: 700, otherFixedAllowance: 0 },
      bankDetails: [{ accountHolderName: 'Nithya Balasubramanian', bankName: 'ICICI Bank', accountNumber: 5010123456, ifscCode: 'ICIC0001234', branch: 'Vellore Main Branch', esiAndPf: { esiNumber: 1231231234, pfNumber: 4324324321 } }],
    },
  ];
};

// ─── SEED ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log(`Connected to ${config.mongoose.url}\n`);

  // Clear existing data
  console.log('Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Address.deleteMany({}),
    EmergencyContact.deleteMany({}),
    BankDetails.deleteMany({}),
    SalaryDetails.deleteMany({}),
    Branch.deleteMany({}),
    Department.deleteMany({}),
    Shift.deleteMany({}),
    Team.deleteMany({}),
  ]);
  console.log('Cleared: users, addresses, emergency contacts, bank details, salary details, branches, departments, shifts, teams\n');

  // 1. Branches
  console.log('Creating branches...');
  const createdBranches = await Branch.insertMany(branchesData);
  const branches = Object.fromEntries(createdBranches.map(b => [b.branchName, b._id]));
  createdBranches.forEach(b => console.log(`  ✅ ${b.branchName}`));

  // 2. Departments
  console.log('\nCreating departments...');
  const createdDepts = await Department.insertMany(departmentsData);
  const departments = Object.fromEntries(createdDepts.map(d => [d.departmentName, d._id]));
  createdDepts.forEach(d => console.log(`  ✅ ${d.departmentName}`));

  // 3. Shifts
  console.log('\nCreating shifts...');
  const createdShifts = await Shift.insertMany(shiftsData);
  const shifts = Object.fromEntries(createdShifts.map(s => [s.shiftName, s._id]));
  createdShifts.forEach(s => console.log(`  ✅ ${s.shiftName}`));

  // 4. Teams (linked to departments)
  console.log('\nCreating teams...');
  const createdTeams = await Team.insertMany(buildTeams(departments));
  const teams = Object.fromEntries(createdTeams.map(t => [t.teamName, t._id]));
  createdTeams.forEach(t => console.log(`  ✅ ${t.teamName}`));

  // 5. Employees
  console.log('\nRegistering employees...');
  const employees = buildEmployees({ branches, departments, shifts, teams });
  const results = { success: [], failed: [] };

  for (const employee of employees) {
    try {
      const user = await userService.registerEmployee(employee);
      results.success.push({ name: employee.name, employeeId: user.employeeId });
      console.log(`  ✅ ${employee.name} (${user.employeeId}) — ${employee.workInformation.designation}`);
    } catch (err) {
      results.failed.push({ name: employee.name, reason: err.message });
      console.log(`  ❌ ${employee.name} — ${err.message}`);
    }
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log(`Branches:    ${createdBranches.length}`);
  console.log(`Departments: ${createdDepts.length}`);
  console.log(`Shifts:      ${createdShifts.length}`);
  console.log(`Teams:       ${createdTeams.length}`);
  console.log(`Employees:   ${results.success.length} success, ${results.failed.length} failed`);

  if (results.failed.length) {
    console.log('\nFailed:');
    results.failed.forEach(f => console.log(`  - ${f.name}: ${f.reason}`));
  }

  console.log('\nAll employee passwords: Pass1234');
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
