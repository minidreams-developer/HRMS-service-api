// Script to seed test data for employees and leaderboard
// Run this with: node seed-test-data.js

const mongoose = require('mongoose');
require('dotenv').config();

const config = require('./src/config/config');
const { User } = require('./src/models');
const { Leaderboard } = require('./src/models');

// Sample employee data
const employeesData = [
  {
    name: 'John Doe',
    email: 'john.doe@company.com',
    phone: '9876543210',
    gender: 'Male',
    dateOfBirth: new Date('1990-05-15'),
    age: 34,
    maritalStatus: 'Married',
    motherTongue: 'English',
    religion: 'Christian',
    address: '123 Main Street',
    city: 'New York',
    district: 'Manhattan',
    state: 'New York',
    pinCode: '10001',
    password: 'password123',
    role: 'employee',
    employee: {
      employeeId: 'EMP001',
      designation: 'Senior Software Engineer',
      department: 'Engineering',
      team: 'Backend Team',
      shift: 'Day Shift',
      employeeType: 'full_time',
      employeeStatus: 'active',
      attendanceType: 'Regular',
      attendancePermission: true,
      workInformation: {
        joinedDate: new Date('2020-01-15'),
        experienceType: 'Experienced',
        totalYearsOfExperience: 8,
        lastCompanyName: 'Tech Corp',
        location: 'New York',
      },
    },
    salaryDetails: {
      ctcAnnual: 1200000,
      monthlyCTC: 100000,
      basicSalary: 60000,
      hra: 24000,
      conveyanceAllowance: 2000,
      specialAllowance: 10000,
      otherFixedAllowances: 4000,
    },
    bankDetails: {
      salaryDisbursementType: 'Bank Transfer',
      accHolderName: 'John Doe',
      bank: 'Chase Bank',
      accNumber: '1234567890',
      ifscCode: 'CHAS0001234',
      bankBranch: 'Manhattan Branch',
      esiNumber: 'ESI123456',
      pfNumber: 'PF987654',
    },
    emergencyContacts: [
      {
        emergencyContactName: 'Jane Doe',
        emergencyContact: '9876543211',
        relationship: 'Spouse',
      },
    ],
  },
  {
    name: 'Sarah Smith',
    email: 'sarah.smith@company.com',
    phone: '9876543220',
    gender: 'Female',
    dateOfBirth: new Date('1992-08-22'),
    age: 32,
    maritalStatus: 'Single',
    motherTongue: 'English',
    religion: 'Christian',
    address: '456 Oak Avenue',
    city: 'Los Angeles',
    district: 'Downtown',
    state: 'California',
    pinCode: '90001',
    password: 'password123',
    role: 'employee',
    employee: {
      employeeId: 'EMP002',
      designation: 'Product Manager',
      department: 'Product',
      team: 'Product Team A',
      shift: 'Day Shift',
      employeeType: 'full_time',
      employeeStatus: 'active',
      attendanceType: 'Regular',
      attendancePermission: true,
      workInformation: {
        joinedDate: new Date('2021-03-10'),
        experienceType: 'Experienced',
        totalYearsOfExperience: 6,
        lastCompanyName: 'Startup Inc',
        location: 'Los Angeles',
      },
    },
    salaryDetails: {
      ctcAnnual: 1500000,
      monthlyCTC: 125000,
      basicSalary: 75000,
      hra: 30000,
      conveyanceAllowance: 2500,
      specialAllowance: 12500,
      otherFixedAllowances: 5000,
    },
    bankDetails: {
      salaryDisbursementType: 'Bank Transfer',
      accHolderName: 'Sarah Smith',
      bank: 'Bank of America',
      accNumber: '2345678901',
      ifscCode: 'BOFA0002345',
      bankBranch: 'LA Downtown',
      esiNumber: 'ESI234567',
      pfNumber: 'PF876543',
    },
    emergencyContacts: [
      {
        emergencyContactName: 'Robert Smith',
        emergencyContact: '9876543221',
        relationship: 'Father',
      },
    ],
  },
  {
    name: 'Michael Johnson',
    email: 'michael.johnson@company.com',
    phone: '9876543230',
    gender: 'Male',
    dateOfBirth: new Date('1988-12-10'),
    age: 36,
    maritalStatus: 'Married',
    motherTongue: 'English',
    religion: 'Christian',
    address: '789 Pine Road',
    city: 'Chicago',
    district: 'North Side',
    state: 'Illinois',
    pinCode: '60601',
    password: 'password123',
    role: 'hr_manager',
    employee: {
      employeeId: 'EMP003',
      designation: 'HR Manager',
      department: 'Human Resources',
      team: 'HR Team',
      shift: 'Day Shift',
      employeeType: 'full_time',
      employeeStatus: 'active',
      attendanceType: 'Regular',
      attendancePermission: true,
      workInformation: {
        joinedDate: new Date('2019-06-01'),
        experienceType: 'Experienced',
        totalYearsOfExperience: 10,
        lastCompanyName: 'HR Solutions',
        location: 'Chicago',
      },
    },
    salaryDetails: {
      ctcAnnual: 1000000,
      monthlyCTC: 83333,
      basicSalary: 50000,
      hra: 20000,
      conveyanceAllowance: 2000,
      specialAllowance: 8333,
      otherFixedAllowances: 3000,
    },
    bankDetails: {
      salaryDisbursementType: 'Bank Transfer',
      accHolderName: 'Michael Johnson',
      bank: 'Wells Fargo',
      accNumber: '3456789012',
      ifscCode: 'WELL0003456',
      bankBranch: 'Chicago North',
      esiNumber: 'ESI345678',
      pfNumber: 'PF765432',
    },
    emergencyContacts: [
      {
        emergencyContactName: 'Emily Johnson',
        emergencyContact: '9876543231',
        relationship: 'Spouse',
      },
    ],
  },
  {
    name: 'Emily Davis',
    email: 'emily.davis@company.com',
    phone: '9876543240',
    gender: 'Female',
    dateOfBirth: new Date('1995-03-18'),
    age: 29,
    maritalStatus: 'Single',
    motherTongue: 'English',
    religion: 'Christian',
    address: '321 Elm Street',
    city: 'Boston',
    district: 'Back Bay',
    state: 'Massachusetts',
    pinCode: '02101',
    password: 'password123',
    role: 'employee',
    employee: {
      employeeId: 'EMP004',
      designation: 'UI/UX Designer',
      department: 'Design',
      team: 'Design Team',
      shift: 'Day Shift',
      employeeType: 'full_time',
      employeeStatus: 'active',
      attendanceType: 'Regular',
      attendancePermission: true,
      workInformation: {
        joinedDate: new Date('2022-01-20'),
        experienceType: 'Experienced',
        totalYearsOfExperience: 4,
        lastCompanyName: 'Creative Agency',
        location: 'Boston',
      },
    },
    salaryDetails: {
      ctcAnnual: 900000,
      monthlyCTC: 75000,
      basicSalary: 45000,
      hra: 18000,
      conveyanceAllowance: 1800,
      specialAllowance: 7500,
      otherFixedAllowances: 2700,
    },
    bankDetails: {
      salaryDisbursementType: 'Bank Transfer',
      accHolderName: 'Emily Davis',
      bank: 'TD Bank',
      accNumber: '4567890123',
      ifscCode: 'TDBA0004567',
      bankBranch: 'Boston Back Bay',
      esiNumber: 'ESI456789',
      pfNumber: 'PF654321',
    },
    emergencyContacts: [
      {
        emergencyContactName: 'David Davis',
        emergencyContact: '9876543241',
        relationship: 'Brother',
      },
    ],
  },
  {
    name: 'David Wilson',
    email: 'david.wilson@company.com',
    phone: '9876543250',
    gender: 'Male',
    dateOfBirth: new Date('1993-07-25'),
    age: 31,
    maritalStatus: 'Married',
    motherTongue: 'English',
    religion: 'Christian',
    address: '654 Maple Drive',
    city: 'Seattle',
    district: 'Downtown',
    state: 'Washington',
    pinCode: '98101',
    password: 'password123',
    role: 'team_lead',
    employee: {
      employeeId: 'EMP005',
      designation: 'Team Lead - Frontend',
      department: 'Engineering',
      team: 'Frontend Team',
      shift: 'Day Shift',
      employeeType: 'full_time',
      employeeStatus: 'active',
      attendanceType: 'Regular',
      attendancePermission: true,
      workInformation: {
        joinedDate: new Date('2020-09-15'),
        experienceType: 'Experienced',
        totalYearsOfExperience: 7,
        lastCompanyName: 'Web Solutions',
        location: 'Seattle',
      },
    },
    salaryDetails: {
      ctcAnnual: 1400000,
      monthlyCTC: 116666,
      basicSalary: 70000,
      hra: 28000,
      conveyanceAllowance: 2333,
      specialAllowance: 11666,
      otherFixedAllowances: 4667,
    },
    bankDetails: {
      salaryDisbursementType: 'Bank Transfer',
      accHolderName: 'David Wilson',
      bank: 'US Bank',
      accNumber: '5678901234',
      ifscCode: 'USBA0005678',
      bankBranch: 'Seattle Downtown',
      esiNumber: 'ESI567890',
      pfNumber: 'PF543210',
    },
    emergencyContacts: [
      {
        emergencyContactName: 'Lisa Wilson',
        emergencyContact: '9876543251',
        relationship: 'Spouse',
      },
    ],
  },
];

// Function to create leaderboard entries for users
const createLeaderboardEntries = (users) => {
  return users.map((user, index) => ({
    user: user._id,
    totalPoints: 500 - (index * 50),
    weekPoints: 150 - (index * 20),
    todayPoints: 30 - (index * 5),
    badges: getBadges(index),
    streakDays: 15 - (index * 2),
  }));
};

// Function to generate badges based on rank
const getBadges = (index) => {
  const allBadges = [
    ['champion', 'consistent', 'early-bird', 'weekend-warrior'],
    ['consistent', 'early-bird', 'team-player'],
    ['early-bird', 'helpful'],
    ['consistent'],
    ['early-bird'],
  ];
  return allBadges[index] || [];
};

async function seedData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('\nClearing existing data...');
    await User.deleteMany({});
    await Leaderboard.deleteMany({});
    console.log('Existing data cleared');

    // Create employees
    console.log('\nCreating employees...');
    const createdUsers = await User.insertMany(employeesData);
    console.log(`Created ${createdUsers.length} employees`);

    // Display created employees
    createdUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.employee.employeeId}) - ${user.email}`);
    });

    // Create leaderboard entries
    console.log('\nCreating leaderboard entries...');
    const leaderboardData = createLeaderboardEntries(createdUsers);
    const createdLeaderboard = await Leaderboard.insertMany(leaderboardData);
    console.log(`Created ${createdLeaderboard.length} leaderboard entries`);

    // Display leaderboard
    console.log('\n=== LEADERBOARD ===');
    for (let i = 0; i < createdLeaderboard.length; i++) {
      const entry = createdLeaderboard[i];
      const user = createdUsers[i];
      console.log(`  ${i + 1}. ${user.name} - ${entry.totalPoints} points (Streak: ${entry.streakDays} days)`);
      console.log(`     Badges: ${entry.badges.join(', ') || 'None'}`);
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\nYou can now login with:');
    console.log('  Email: john.doe@company.com');
    console.log('  Password: password123');
    console.log('\n(All test users have the same password: password123)');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
