# Payroll API

Base URL: `/v1/payroll`

---

## Overview

The payroll API manages employee payroll computation and lifecycle, including **Stop** and **Resume** functionality. Payroll figures are computed on-the-fly from attendance, leave, and overtime data, while manual adjustments are stored separately.

### Attendance reconciliation

Payroll uses the persisted `Attendance.attendanceCategory` (`fullDay`, `halfDay`, or `absent`) as the source of truth. It does not reclassify current attendance from worked hours; this preserves audited manual overrides. Attendance records without a category are reported as legacy records and are excluded from day-category counts until separately migrated or corrected. Approved `Overtime` records remain the only payroll overtime source.

### Payroll Status Lifecycle

```
draft → processed → paid
  ↓
stopped → resumed
```

| Status | Description |
|---|---|
| `draft` | Adjustments saved, not yet locked |
| `processed` | Snapshot saved — figures are frozen |
| `paid` | Payroll has been disbursed |
| `stopped` | Payroll stopped with reason and effective date |
| `resumed` | Payroll resumed after being stopped |

### Stop/Resume Features

- **Stop Payroll**: Temporarily or permanently halt payroll with reason tracking
- **Resume Payroll**: Restore payroll processing for previously stopped employees
- **Stop Types**: `temporary`, `permanent`, `suspension`, `leave_without_pay`, `disciplinary`
- **Reasons**: `resignation`, `termination`, `suspension`, `medical_leave`, `personal_leave`, `disciplinary_action`, `other`

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/v1/payroll` | Paginated payroll list for all employees |
| GET | `/v1/payroll/stopped` | List all stopped payrolls |
| GET | `/v1/payroll/:employeeId/preview` | Single employee detailed breakdown |
| PUT | `/v1/payroll/:employeeId` | Save/update manual adjustments |
| POST | `/v1/payroll/:employeeId/process` | Lock and snapshot payroll |
| POST | `/v1/payroll/:employeeId/stop` | Stop payroll for employee |
| POST | `/v1/payroll/:employeeId/resume` | Resume payroll for employee |
| DELETE | `/v1/payroll/:payrollId` | Remove a payroll adjustment record |

---

## 1. Get Payroll List

Returns a paginated list of all active non-admin employees with computed payroll figures for the requested month and year.

**GET** `/v1/payroll`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | Month 1–12. Defaults to current month |
| `year` | `number` | no | Year e.g. `2026`. Defaults to current year |
| `departmentId` | `ObjectId` | no | Filter employees by department |
| `shiftId` | `ObjectId` | no | Filter employees by shift |
| `search` | `string` | no | Search by employee `name` or `employeeId` |
| `page` | `number` | no | Page number. Default `1` |
| `limit` | `number` | no | Results per page. Default `10`, max `100` |
| `sortBy` | `string` | no | Sort field and order e.g. `name:asc` |

### Example Request

```
GET /v1/payroll?month=7&year=2026&departmentId=664f1b2c8e4a2b001c8ddef1&page=1&limit=10
```

### Response `200`

```json
{
  "results": [
    {
      "_id": "664f1b2c8e4a2b001c8d0001",
      "employeeId": "EMP6740",
      "name": "Manoj Kumar",
      "designation": "UI/UX Designer",
      "department": "Design",
      "profilePic": "https://example.com/uploads/manoj.jpg",
      "payrollId": "664f1b2c8e4a2b001c8dff01",
      "status": "draft",
      "fullDays": 20,
      "halfDays": 2,
      "offDays": 1,
      "paidLeaves": 2,
      "unpaidLeaves": 1,
      "dailyRate": 1923.08,
      "grossWages": 50000,
      "earnedWages": 44230.88,
      "otherWages": 0,
      "overtimeAmount": 720.42,
      "extras": 0,
      "grossEarnings": 44951.3,
      "penalties": 0,
      "loanAndAdvance": 0,
      "otherDeductions": 0,
      "takeHome": 44951.3
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 2,
  "totalResults": 20,
  "month": 7,
  "year": 2026
}
```

---

## 2. Get Stopped Payrolls

Returns a paginated list of all employees with stopped payroll status.

**GET** `/v1/payroll/stopped`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | Filter by month 1–12 |
| `year` | `number` | no | Filter by year e.g. `2026` |
| `stopType` | `string` | no | Filter by stop type |
| `reason` | `string` | no | Filter by stop reason |
| `page` | `number` | no | Page number. Default `1` |
| `limit` | `number` | no | Results per page. Default `10`, max `100` |

### Example Request

```
GET /v1/payroll/stopped?month=7&year=2026&stopType=temporary&page=1&limit=10
```

### Response `200`

```json
{
  "results": [
    {
      "_id": "664f1b2c8e4a2b001c8dff02",
      "employeeId": {
        "_id": "664f1b2c8e4a2b001c8d0002",
        "name": "Jane Smith",
        "employeeId": "EMP6741",
        "workInformation": {
          "designation": "Software Engineer"
        },
        "profilePic": null
      },
      "month": 7,
      "year": 2026,
      "status": "stopped",
      "stopDetails": {
        "stopType": "temporary",
        "reason": "medical_leave",
        "effectiveFrom": "2026-07-15T00:00:00.000Z",
        "resumeOn": "2026-08-15T00:00:00.000Z",
        "impactMonth": "July 2026",
        "stopRemarks": "Extended medical leave for surgery recovery",
        "stoppedAt": "2026-07-10T08:30:00.000Z"
      }
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

## 3. Preview Employee Payroll

Returns a full payroll breakdown for a single employee including stop/resume details if applicable.

**GET** `/v1/payroll/:employeeId/preview`

### Path Parameter

| Param | Type | Description |
|---|---|---|
| `employeeId` | `ObjectId` | MongoDB `_id` of the employee |

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | Month 1–12. Defaults to current month |
| `year` | `number` | no | Year e.g. `2026`. Defaults to current year |

### Example Request

```
GET /v1/payroll/664f1b2c8e4a2b001c8d0001/preview?month=7&year=2026
```

### Response `200`

```json
{
  "_id": "664f1b2c8e4a2b001c8d0001",
  "employeeId": "EMP6740",
  "name": "Manoj Kumar",
  "designation": "UI/UX Designer",
  "department": "Design",
  "profilePic": "https://example.com/uploads/manoj.jpg",
  "payrollId": "664f1b2c8e4a2b001c8dff01",
  "status": "stopped",
  "remarks": "Performance bonus included.",
  "month": 7,
  "year": 2026,
  "fullDays": 15,
  "halfDays": 1,
  "offDays": 2,
  "paidLeaves": 0,
  "unpaidLeaves": 3,
  "dailyRate": 1923.08,
  "grossWages": 50000,
  "earnedWages": 29807.23,
  "otherWages": 500,
  "overtimeAmount": 360.21,
  "extras": 2000,
  "grossEarnings": 32667.44,
  "penalties": 500,
  "loanAndAdvance": 1000,
  "otherDeductions": 200,
  "takeHome": 30967.44
}
```

### Response `404`

```json
{
  "code": 404,
  "message": "Employee not found"
}
```

---

## 4. Upsert Payroll Adjustments

Creates or updates manual adjustment fields for an employee's payroll. Safe to call multiple times — it upserts using `employeeId + month + year` as the unique key.

**PUT** `/v1/payroll/:employeeId`

### Path Parameter

| Param | Type | Description |
|---|---|---|
| `employeeId` | `ObjectId` | MongoDB `_id` of the employee |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | **yes** | Month 1–12 |
| `year` | `number` | **yes** | Year e.g. `2026` |
| `extras` | `number` | no | One-time additions — bonus, incentive. Min `0` |
| `penalties` | `number` | no | Deductions for late marks, misconduct. Min `0` |
| `loanAndAdvance` | `number` | no | Loan repayment or salary advance recovery. Min `0` |
| `otherDeductions` | `number` | no | PF, ESI, TDS or any other deduction. Min `0` |
| `otherWages` | `number` | no | Extra wage components outside salary structure. Min `0` |
| `status` | `string` | no | `draft` \| `processed` \| `paid` \| `stopped` \| `resumed` |
| `remarks` | `string` | no | Internal notes for this payroll record |

### Example Request Body

```json
{
  "month": 7,
  "year": 2026,
  "extras": 2000,
  "penalties": 500,
  "loanAndAdvance": 1000,
  "otherDeductions": 200,
  "otherWages": 500,
  "remarks": "Performance bonus applied. Loan EMI recovery started."
}
```

### Response `200`

```json
{
  "id": "664f1b2c8e4a2b001c8dff01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "month": 7,
  "year": 2026,
  "extras": 2000,
  "penalties": 500,
  "loanAndAdvance": 1000,
  "otherDeductions": 200,
  "otherWages": 500,
  "status": "draft",
  "remarks": "Performance bonus applied. Loan EMI recovery started.",
  "stopDetails": null,
  "snapshot": {
    "fullDays": 0,
    "halfDays": 0,
    "offDays": 0,
    "paidLeaves": 0,
    "unpaidLeaves": 0,
    "dailyRate": 0,
    "grossWages": 0,
    "earnedWages": 0,
    "overtimeAmount": 0,
    "grossEarnings": 0,
    "takeHome": 0
  },
  "createdAt": "2026-07-09T08:30:00.000Z",
  "updatedAt": "2026-07-09T08:30:00.000Z"
}
```

---

## 5. Process (Lock) Payroll

Computes final payroll figures for an employee, writes them into the `snapshot`, and sets `status` to `"processed"`.

**POST** `/v1/payroll/:employeeId/process`

### Path Parameter

| Param | Type | Description |
|---|---|---|
| `employeeId` | `ObjectId` | MongoDB `_id` of the employee |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | **yes** | Month 1–12 |
| `year` | `number` | **yes** | Year e.g. `2026` |

### Example Request Body

```json
{
  "month": 7,
  "year": 2026
}
```

### Response `200`

```json
{
  "fullDays": 20,
  "halfDays": 2,
  "offDays": 1,
  "paidLeaves": 2,
  "unpaidLeaves": 1,
  "dailyRate": 1923.08,
  "grossWages": 50000,
  "earnedWages": 44230.88,
  "otherWages": 500,
  "overtimeAmount": 720.42,
  "extras": 2000,
  "grossEarnings": 47450.88,
  "penalties": 500,
  "loanAndAdvance": 1000,
  "otherDeductions": 200,
  "takeHome": 45750.88,
  "payrollId": "664f1b2c8e4a2b001c8dff01",
  "status": "processed"
}
```

---

## 6. Stop Payroll

Stops payroll for an employee with detailed reason tracking and optional resume date.

**POST** `/v1/payroll/:employeeId/stop`

### Path Parameter

| Param | Type | Description |
|---|---|---|
| `employeeId` | `ObjectId` | MongoDB `_id` of the employee |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | **yes** | Month 1–12 |
| `year` | `number` | **yes** | Year e.g. `2026` |
| `stopType` | `string` | **yes** | `temporary` \| `permanent` \| `suspension` \| `leave_without_pay` \| `disciplinary` |
| `reason` | `string` | **yes** | `resignation` \| `termination` \| `suspension` \| `medical_leave` \| `personal_leave` \| `disciplinary_action` \| `other` |
| `effectiveFrom` | `date` | **yes** | Date when the stop becomes effective |
| `resumeOn` | `date` | no | Optional date when payroll should resume |
| `impactMonth` | `string` | **yes** | Human-readable month impact e.g. "March 2026" |
| `stopRemarks` | `string` | no | Additional notes about the stop |

### Example Request Body

```json
{
  "month": 7,
  "year": 2026,
  "stopType": "temporary",
  "reason": "medical_leave",
  "effectiveFrom": "2026-07-15T00:00:00.000Z",
  "resumeOn": "2026-08-15T00:00:00.000Z",
  "impactMonth": "July 2026",
  "stopRemarks": "Extended medical leave for surgery recovery"
}
```

### Response `200`

```json
{
  "id": "664f1b2c8e4a2b001c8dff01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "month": 7,
  "year": 2026,
  "status": "stopped",
  "stopDetails": {
    "stopType": "temporary",
    "reason": "medical_leave",
    "effectiveFrom": "2026-07-15T00:00:00.000Z",
    "resumeOn": "2026-08-15T00:00:00.000Z",
    "impactMonth": "July 2026",
    "stopRemarks": "Extended medical leave for surgery recovery",
    "stoppedAt": "2026-07-10T08:30:00.000Z",
    "resumedAt": null
  },
  "extras": 0,
  "penalties": 0,
  "loanAndAdvance": 0,
  "otherDeductions": 0,
  "otherWages": 0,
  "createdAt": "2026-07-09T08:30:00.000Z",
  "updatedAt": "2026-07-10T08:30:00.000Z"
}
```

### Response `404`

```json
{
  "code": 404,
  "message": "Employee not found"
}
```

---

## 7. Resume Payroll

Resumes payroll for an employee that was previously stopped. Sets status to `"resumed"` and records resumption timestamp.

**POST** `/v1/payroll/:employeeId/resume`

### Path Parameter

| Param | Type | Description |
|---|---|---|
| `employeeId` | `ObjectId` | MongoDB `_id` of the employee |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | **yes** | Month 1–12 |
| `year` | `number` | **yes** | Year e.g. `2026` |
| `resumeRemarks` | `string` | no | Additional notes about the resumption |

### Example Request Body

```json
{
  "month": 7,
  "year": 2026,
  "resumeRemarks": "Employee returned from medical leave. Cleared to work."
}
```

### Response `200`

```json
{
  "id": "664f1b2c8e4a2b001c8dff01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "month": 7,
  "year": 2026,
  "status": "resumed",
  "stopDetails": {
    "stopType": "temporary",
    "reason": "medical_leave",
    "effectiveFrom": "2026-07-15T00:00:00.000Z",
    "resumeOn": "2026-08-15T00:00:00.000Z",
    "impactMonth": "July 2026",
    "stopRemarks": "Extended medical leave for surgery recovery",
    "stoppedAt": "2026-07-10T08:30:00.000Z",
    "resumedAt": "2026-08-10T09:15:00.000Z"
  },
  "remarks": "[RESUMED] Employee returned from medical leave. Cleared to work.",
  "createdAt": "2026-07-09T08:30:00.000Z",
  "updatedAt": "2026-08-10T09:15:00.000Z"
}
```

### Response `400` — Invalid Status

```json
{
  "code": 400,
  "message": "Cannot resume payroll. Current status is 'draft', expected 'stopped'"
}
```

### Response `404`

```json
{
  "code": 404,
  "message": "Payroll record not found. Employee may not have stopped payroll."
}
```

---

## 8. Delete Payroll Record

Removes the stored payroll adjustments and snapshot for a specific payroll document.

**DELETE** `/v1/payroll/:payrollId`

### Path Parameter

| Param | Type | Description |
|---|---|---|
| `payrollId` | `ObjectId` | MongoDB `_id` of the `Payroll` document |

### Response `204`

No content.

### Response `404`

```json
{
  "code": 404,
  "message": "Payroll record not found"
}
```

---

## Data Model

### Payroll Document Schema

```javascript
{
  employeeId: ObjectId,        // ref: 'User'
  month: Number,               // 1-12
  year: Number,                // e.g., 2026
  
  // Status enum
  status: 'draft' | 'processed' | 'paid' | 'stopped' | 'resumed',
  
  // Manual adjustments
  extras: Number,
  penalties: Number,
  loanAndAdvance: Number,
  otherDeductions: Number,
  otherWages: Number,
  remarks: String,
  
  // Stop/Resume details
  stopDetails: {
    stopType: 'temporary' | 'permanent' | 'suspension' | 'leave_without_pay' | 'disciplinary',
    reason: 'resignation' | 'termination' | 'suspension' | 'medical_leave' | 'personal_leave' | 'disciplinary_action' | 'other',
    effectiveFrom: Date,
    resumeOn: Date,             // Optional
    impactMonth: String,
    stopRemarks: String,
    stoppedAt: Date,
    resumedAt: Date
  },
  
  // Computed snapshot (populated on process)
  snapshot: {
    fullDays: Number,
    halfDays: Number,
    offDays: Number,
    paidLeaves: Number,
    unpaidLeaves: Number,
    dailyRate: Number,
    grossWages: Number,
    earnedWages: Number,
    overtimeAmount: Number,
    grossEarnings: Number,
    takeHome: Number
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## Usage Guide

### Standard Payroll Processing

1. **List all employees**: `GET /v1/payroll?month=7&year=2026`
2. **Preview individual**: `GET /v1/payroll/:employeeId/preview?month=7&year=2026`
3. **Add adjustments**: `PUT /v1/payroll/:employeeId` with extras/penalties
4. **Process payroll**: `POST /v1/payroll/:employeeId/process`
5. **Mark as paid**: `PUT /v1/payroll/:employeeId` with `status: "paid"`

### Stop/Resume Workflow

1. **Stop payroll**: `POST /v1/payroll/:employeeId/stop` with reason and dates
2. **View stopped**: `GET /v1/payroll/stopped` to see all stopped payrolls
3. **Resume payroll**: `POST /v1/payroll/:employeeId/resume` when ready

### Stop Types & Reasons

| Stop Type | Common Reasons | Typical Duration |
|---|---|---|
| `temporary` | `medical_leave`, `personal_leave` | Days to months |
| `permanent` | `resignation`, `termination` | Indefinite |
| `suspension` | `disciplinary_action` | Days to weeks |
| `leave_without_pay` | Extended unpaid leave | Weeks to months |
| `disciplinary` | `disciplinary_action` | Varies |

### Status Transitions

```
draft ────────► processed ────────► paid
  │               │                   │
  ▼               ▼                   ▼
stopped ────────► resumed ───────► processed ────► paid
```

- Any status can transition to `stopped`
- Only `stopped` can transition to `resumed`
- `resumed` can continue normal flow: `processed` → `paid`

---

## Error Reference

| HTTP Code | Message | Cause |
|---|---|---|
| `400` | `stopType, reason, effectiveFrom, and impactMonth are required` | Missing required stop fields |
| `400` | `Cannot resume payroll. Current status is 'X', expected 'stopped'` | Trying to resume non-stopped payroll |
| `400` | `"month" must be between 1 and 12` | Invalid month |
| `400` | `"year" must be at least 2000` | Invalid year |
| `404` | `Employee not found` | Invalid employeeId |
| `404` | `Payroll record not found` | No payroll exists for employee/month/year |
