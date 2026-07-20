# Dashboard API

Base URL: `/v1/dashboard`

---

## Overview

The Dashboard API powers the main HRMS home screen. It returns three independent sections that map directly to the UI:

| UI Section | Endpoint | Filter |
|---|---|---|
| Quick Stats cards | `GET /v1/dashboard/quick-stats` | Today |
| Attendance Overview chart | `GET /v1/dashboard/attendance-overview` | This Week (7 days) |
| Payroll Breakdown chart | `GET /v1/dashboard/payroll-breakdown` | This Month |
| All sections at once | `GET /v1/dashboard` | Combined |

---

## How It Works

### Quick Stats
Each card is computed from live collections and compared against the previous period to produce a `percentageChange` and `trend` (up/down).

| Card | Data Source | Current | Previous (comparison) |
|---|---|---|---|
| **Total Employees** | `User` collection | Active non-admin users | Count before today |
| **Present Today** | `Attendance` collection | Distinct `employeeId` with a record today | Same count yesterday |
| **On Leave** | `LeaveRequests` collection | Approved leaves overlapping today | Same count yesterday |
| **OT Employees** | `Overtime` collection | Approved overtime entries today | Same count yesterday |
| **Payroll** | `Payroll` collection | Sum of `takeHome` for processed/paid payrolls this month | Same sum last month |

### Attendance Overview
- Fetches all `Attendance` and `LeaveRequests` records for a **7-day window** ending on the `date` param in a single query each.
- Builds per-day counts for **Present**, **On Leave**, and **Late** (`attendanceStatus === 'arrivedLate'`).
- Each day is labelled `DD-MM` for the chart x-axis.

### Payroll Breakdown
- Aggregates all **processed / paid** `Payroll` records for the given `month` / `year`.
- Groups into five categories and computes each category's **percentage of total earnings**.

| Category | Formula |
|---|---|
| **Salary** | `SUM(snapshot.earnedWages)` |
| **Allowances** | `SUM(otherWages)` |
| **Deductions** | `SUM(penalties + loanAndAdvance + otherDeductions)` |
| **Incentives** | `SUM(extras)` |
| **Overtime** | `SUM(snapshot.overtimeAmount)` |
| **Total Pay** | `(salary + allowances + incentives + overtime) − deductions` |

---

## Endpoints

### 1. Full Dashboard

Returns all three sections in a single call. Use this for the initial page load.

**GET** `/v1/dashboard`

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | `date` (ISO) | no | Reference date. Defaults to today |

#### Example Request
```
GET /v1/dashboard?date=2026-07-14
```

#### Response `200`
```json
{
  "meta": {
    "generatedAt": "2026-07-14T10:30:00.000Z",
    "referenceDate": "2026-07-14",
    "month": 7,
    "year": 2026
  },
  "quickStats": {
    "totalEmployees": {
      "count": 256,
      "percentageChange": 20.5,
      "trend": "up"
    },
    "presentToday": {
      "count": 250,
      "percentageChange": 20.5,
      "trend": "up"
    },
    "onLeave": {
      "count": 6,
      "percentageChange": 20.5,
      "trend": "up"
    },
    "otEmployees": {
      "count": 26,
      "percentageChange": 12.0,
      "trend": "up"
    },
    "payroll": {
      "amount": 2020000,
      "percentageChange": 20.5,
      "trend": "up"
    }
  },
  "attendanceOverview": {
    "dailyData": [
      { "label": "14-01", "date": "2026-01-14", "present": 200, "onLeave": 60, "late": 80 },
      { "label": "15-01", "date": "2026-01-15", "present": 90,  "onLeave": 90, "late": 30 },
      { "label": "16-01", "date": "2026-01-16", "present": 240, "onLeave": 30, "late": 10 },
      { "label": "17-01", "date": "2026-01-17", "present": 190, "onLeave": 40, "late": 60 },
      { "label": "18-01", "date": "2026-01-18", "present": 80,  "onLeave": 40, "late": 30 },
      { "label": "19-01", "date": "2026-01-19", "present": 280, "onLeave": 30, "late": 10 },
      { "label": "20-01", "date": "2026-01-20", "present": 60,  "onLeave": 50, "late": 40 }
    ]
  },
  "payrollBreakdown": {
    "totalPayThisMonth": 2020000,
    "categories": {
      "salary":     { "amount": 1804396, "percentage": 89.3 },
      "allowances": { "amount": 101000,  "percentage": 5.0  },
      "deductions": { "amount": 45000,   "percentage": 2.2  },
      "incentives": { "amount": 45000,   "percentage": 2.2  },
      "overtime":   { "amount": 69604,   "percentage": 3.4  }
    }
  }
}
```

---

### 2. Quick Stats Only

**GET** `/v1/dashboard/quick-stats`

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | `date` (ISO) | no | Reference date. Defaults to today |

#### Example Request
```
GET /v1/dashboard/quick-stats?date=2026-07-14
```

#### Response `200`
```json
{
  "totalEmployees": {
    "count": 256,
    "percentageChange": 20.5,
    "trend": "up"
  },
  "presentToday": {
    "count": 250,
    "percentageChange": 20.5,
    "trend": "up"
  },
  "onLeave": {
    "count": 6,
    "percentageChange": 20.5,
    "trend": "up"
  },
  "otEmployees": {
    "count": 26,
    "percentageChange": 12.0,
    "trend": "down"
  },
  "payroll": {
    "amount": 2020000,
    "percentageChange": 20.5,
    "trend": "up"
  }
}
```

---

### 3. Attendance Overview

**GET** `/v1/dashboard/attendance-overview`

Returns daily **Present / On Leave / Late** counts for the 7-day window ending on `date`. Drives the bar chart with the three coloured series.

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | `date` (ISO) | no | Last day of the 7-day window. Defaults to today |

#### Example Request
```
GET /v1/dashboard/attendance-overview?date=2026-07-20
```

#### Response `200`
```json
{
  "dailyData": [
    { "label": "14-07", "date": "2026-07-14", "present": 200, "onLeave": 60, "late": 80 },
    { "label": "15-07", "date": "2026-07-15", "present": 90,  "onLeave": 90, "late": 30 },
    { "label": "16-07", "date": "2026-07-16", "present": 240, "onLeave": 30, "late": 10 },
    { "label": "17-07", "date": "2026-07-17", "present": 190, "onLeave": 40, "late": 60 },
    { "label": "18-07", "date": "2026-07-18", "present": 80,  "onLeave": 40, "late": 30 },
    { "label": "19-07", "date": "2026-07-19", "present": 280, "onLeave": 30, "late": 10 },
    { "label": "20-07", "date": "2026-07-20", "present": 60,  "onLeave": 50, "late": 40 }
  ]
}
```

#### Chart Series Mapping

| Response field | Chart series | Color (from image) |
|---|---|---|
| `present` | Present | Teal |
| `onLeave` | On Leave | Yellow |
| `late` | Late | Grey |

---

### 4. Payroll Breakdown

**GET** `/v1/dashboard/payroll-breakdown`

Returns category-level payroll totals and percentages for a specific month. Drives the stacked bar / breakdown chart.

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | Month 1–12. Defaults to current month |
| `year` | `number` | no | Year e.g. `2026`. Defaults to current year |

#### Example Request
```
GET /v1/dashboard/payroll-breakdown?month=7&year=2026
```

#### Response `200`
```json
{
  "totalPayThisMonth": 2020000,
  "categories": {
    "salary": {
      "amount": 1804396,
      "percentage": 89.3
    },
    "allowances": {
      "amount": 101000,
      "percentage": 5.0
    },
    "deductions": {
      "amount": 45000,
      "percentage": 2.2
    },
    "incentives": {
      "amount": 45000,
      "percentage": 2.2
    },
    "overtime": {
      "amount": 69604,
      "percentage": 3.4
    }
  }
}
```

#### Category Mapping to UI Labels

| Response key | UI label |
|---|---|
| `salary` | Salary — 89.3% |
| `allowances` | Allowances — 89.3% |
| `deductions` | Deduction — 89.3% |
| `incentives` | Incentives — 89.3% |
| `overtime` | Overtime — 89.3% |

---

## Error Responses

| HTTP Code | Message | Cause |
|---|---|---|
| `400` | `"date" must be a valid date | Invalid date format |
| `400` | `"month" must be between 1 and 12` | Month out of range |
| `400` | `"year" must be between 2000 and 2100` | Year out of range |

---

## Frontend Integration Guide

### Initial Page Load (single call)
```javascript
const fetchDashboard = async (date = new Date()) => {
  const isoDate = date.toISOString().split('T')[0];
  const res = await fetch(`/api/v1/dashboard?date=${isoDate}`);
  return res.json();
  // Use result.quickStats       → stat cards
  // Use result.attendanceOverview.dailyData → bar chart
  // Use result.payrollBreakdown → breakdown chart
};
```

### Switching the "This Week" dropdown (attendance chart only)
```javascript
const fetchAttendance = async (endDate) => {
  const isoDate = new Date(endDate).toISOString().split('T')[0];
  const res = await fetch(`/api/v1/dashboard/attendance-overview?date=${isoDate}`);
  return res.json(); // returns dailyData array for the 7 days ending on endDate
};
```

### Switching the "This Month" dropdown (payroll breakdown only)
```javascript
const fetchBreakdown = async (month, year) => {
  const res = await fetch(`/api/v1/dashboard/payroll-breakdown?month=${month}&year=${year}`);
  return res.json();
};
```

### Refreshing the "Today" dropdown (quick stats only)
```javascript
const fetchStats = async (date = new Date()) => {
  const isoDate = date.toISOString().split('T')[0];
  const res = await fetch(`/api/v1/dashboard/quick-stats?date=${isoDate}`);
  return res.json();
};
```

---

## Data Flow Diagram

```
GET /v1/dashboard
        │
        ├── getQuickStats(date)
        │       ├── User.countDocuments()         → totalEmployees
        │       ├── Attendance.distinct()         → presentToday
        │       ├── LeaveRequests.distinct()      → onLeave
        │       ├── Overtime.distinct()           → otEmployees
        │       └── Payroll.aggregate()           → payroll amount
        │
        ├── getAttendanceOverview(date)
        │       ├── Attendance.find(7-day window) → all attendance records
        │       └── LeaveRequests.find(overlap)   → all leave records
        │               └── per-day: present / onLeave / late
        │
        └── getPayrollBreakdown(month, year)
                └── Payroll.aggregate(month+year) → salary / allowances /
                                                    deductions / incentives /
                                                    overtime / totalPay
```

All three sections run in **parallel** (`Promise.all`) so the full dashboard
response is as fast as the slowest individual section.
