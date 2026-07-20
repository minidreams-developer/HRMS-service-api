# Paysheet API

Base URL: `/v1/paysheets`

---

## Endpoint Index

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | GET | `/v1/paysheets/dashboard` | Full dashboard — all sections in one call |
| 2 | GET | `/v1/paysheets/quick-stats` | Five stat cards only |
| 3 | GET | `/v1/paysheets/payroll-overview` | Yearly bar chart data |
| 4 | GET | `/v1/paysheets/payroll-breakdown` | Monthly category breakdown |
| 5 | POST | `/v1/paysheets/generate` | Generate and cache paysheet for a period |
| 6 | POST | `/v1/paysheets/refresh` | Force recompute cached paysheet |
| 7 | GET | `/v1/paysheets/list` | Paginated payroll table |
| 8 | GET | `/v1/paysheets/:payrollId/detail` | Single row full detail |
| 9 | PATCH | `/v1/paysheets/:payrollId/status` | Update row status |

---

## 1. Full Dashboard

Returns all three sections — quick stats, payroll overview chart, and payroll breakdown — in a single call. Data is cached for one hour and recomputed automatically when stale.

**GET** `/v1/paysheets/dashboard`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | 1–12. Defaults to current month |
| `year` | `number` | no | e.g. `2026`. Defaults to current year |
| `organizationId` | `ObjectId` | no | Multi-tenant filter |
| `refresh` | `boolean` | no | Pass `true` to force recompute. Default `false` |

### Example Request

```
GET /v1/paysheets/dashboard?month=7&year=2026
GET /v1/paysheets/dashboard?month=7&year=2026&refresh=true
```

### Response `200`

```json
{
  "period": {
    "month": 7,
    "year": 2026
  },
  "quickStats": {
    "totalSalary": {
      "amount": 2020000,
      "percentageChange": 20.5
    },
    "totalIncentive": {
      "amount": 90000,
      "percentageChange": 20.5
    },
    "totalDeductions": {
      "amount": 20000,
      "percentageChange": 20.5
    },
    "payableEmployees": {
      "count": 456,
      "percentageChange": 12.0
    },
    "onHoldEmployees": {
      "count": 25,
      "percentageChange": 20.5
    }
  },
  "payrollOverview": {
    "totalPayThisMonth": 2020000,
    "monthlyData": [
      { "month": "Jan", "salary": 2020000, "overtime": 50000, "incentives": 90000 },
      { "month": "Feb", "salary": 1950000, "overtime": 45000, "incentives": 75000 },
      { "month": "Mar", "salary": 2100000, "overtime": 60000, "incentives": 100000 },
      { "month": "Apr", "salary": 2000000, "overtime": 55000, "incentives": 85000 },
      { "month": "May", "salary": 1980000, "overtime": 52000, "incentives": 80000 },
      { "month": "Jun", "salary": 2050000, "overtime": 58000, "incentives": 95000 },
      { "month": "Jul", "salary": 2020000, "overtime": 50000, "incentives": 90000 },
      { "month": "Aug", "salary": 0,       "overtime": 0,     "incentives": 0 },
      { "month": "Sep", "salary": 0,       "overtime": 0,     "incentives": 0 },
      { "month": "Oct", "salary": 0,       "overtime": 0,     "incentives": 0 },
      { "month": "Nov", "salary": 0,       "overtime": 0,     "incentives": 0 },
      { "month": "Dec", "salary": 0,       "overtime": 0,     "incentives": 0 }
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
  },
  "computedAt": "2026-07-10T14:30:25.123Z",
  "dataSource": {
    "employeeCount": 500,
    "processedPayrolls": 456,
    "lastPayrollUpdate": "2026-07-10T12:15:30.456Z"
  },
  "dataFreshness": "fresh"
}
```

> `dataFreshness` is `"fresh"` when computed within the last hour, `"stale"` otherwise.

---

## 2. Quick Stats

Returns the five stat cards only. Use this when the "This Month" dropdown changes in the header.

**GET** `/v1/paysheets/quick-stats`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | 1–12. Defaults to current month |
| `year` | `number` | no | Defaults to current year |
| `organizationId` | `ObjectId` | no | Multi-tenant filter |

### Example Request

```
GET /v1/paysheets/quick-stats?month=7&year=2026
```

### Response `200`

```json
{
  "period": {
    "month": 7,
    "year": 2026
  },
  "quickStats": {
    "totalSalary": {
      "amount": 2020000,
      "percentageChange": 20.5
    },
    "totalIncentive": {
      "amount": 90000,
      "percentageChange": 20.5
    },
    "totalDeductions": {
      "amount": 20000,
      "percentageChange": 20.5
    },
    "payableEmployees": {
      "count": 456,
      "percentageChange": 12.0
    },
    "onHoldEmployees": {
      "count": 25,
      "percentageChange": 20.5
    }
  },
  "dataSource": {
    "employeeCount": 500,
    "processedPayrolls": 456,
    "lastPayrollUpdate": "2026-07-10T12:15:30.456Z"
  }
}
```

### Quick Stats Card Mapping

| UI Card | Field | Formula |
|---|---|---|
| Total Salary | `quickStats.totalSalary.amount` | `SUM(snapshot.grossWages)` for processed/paid payrolls |
| Total Incentive | `quickStats.totalIncentive.amount` | `SUM(extras + otherWages)` |
| Total Deductions | `quickStats.totalDeductions.amount` | `SUM(penalties + loanAndAdvance + otherDeductions)` |
| Payable Employees | `quickStats.payableEmployees.count` | Count of payrolls with `status = processed` |
| On Hold Employees | `quickStats.onHoldEmployees.count` | Count of payrolls with `status = stopped` |

> `percentageChange` is computed against the previous month automatically.

---

## 3. Payroll Overview

Returns 12-month data for the yearly bar chart (Salary / Overtime / Incentives series). Months with no processed payrolls return `0` for all values.

**GET** `/v1/paysheets/payroll-overview`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `year` | `number` | no | Defaults to current year |
| `organizationId` | `ObjectId` | no | Multi-tenant filter |

### Example Request

```
GET /v1/paysheets/payroll-overview?year=2026
```

### Response `200`

```json
{
  "year": 2026,
  "totalPayThisYear": 24240000,
  "monthlyData": [
    { "month": "Jan", "salary": 2020000, "overtime": 50000, "incentives": 90000 },
    { "month": "Feb", "salary": 1950000, "overtime": 45000, "incentives": 75000 },
    { "month": "Mar", "salary": 2100000, "overtime": 60000, "incentives": 100000 },
    { "month": "Apr", "salary": 2000000, "overtime": 55000, "incentives": 85000 },
    { "month": "May", "salary": 1980000, "overtime": 52000, "incentives": 80000 },
    { "month": "Jun", "salary": 2050000, "overtime": 58000, "incentives": 95000 },
    { "month": "Jul", "salary": 2020000, "overtime": 50000, "incentives": 90000 },
    { "month": "Aug", "salary": 0,       "overtime": 0,     "incentives": 0 },
    { "month": "Sep", "salary": 0,       "overtime": 0,     "incentives": 0 },
    { "month": "Oct", "salary": 0,       "overtime": 0,     "incentives": 0 },
    { "month": "Nov", "salary": 0,       "overtime": 0,     "incentives": 0 },
    { "month": "Dec", "salary": 0,       "overtime": 0,     "incentives": 0 }
  ],
  "computedAt": "2026-07-10T14:30:25.123Z"
}
```

### Chart Series Mapping

| Chart series | Field | Color |
|---|---|---|
| Salary | `monthlyData[n].salary` | Teal |
| Overtime | `monthlyData[n].overtime` | Yellow |
| Incentives | `monthlyData[n].incentives` | Grey |

---

## 4. Payroll Breakdown

Returns category-level payroll totals and percentages for a specific month. Drives the stacked bar and legend in the "This Month" breakdown panel.

**GET** `/v1/paysheets/payroll-breakdown`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | 1–12. Defaults to current month |
| `year` | `number` | no | Defaults to current year |
| `organizationId` | `ObjectId` | no | Multi-tenant filter |

### Example Request

```
GET /v1/paysheets/payroll-breakdown?month=7&year=2026
```

### Response `200`

```json
{
  "period": {
    "month": 7,
    "year": 2026
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
  },
  "computedAt": "2026-07-10T14:30:25.123Z"
}
```

### Category Mapping to UI Labels

| UI Label | Response key | Formula |
|---|---|---|
| Salary — 89.3% | `categories.salary` | `SUM(snapshot.earnedWages)` |
| Allowances — 89.3% | `categories.allowances` | `SUM(grossWages − earnedWages + otherWages)` |
| Deduction — 89.3% | `categories.deductions` | `SUM(penalties + loanAndAdvance + otherDeductions)` |
| Incentives — 89.3% | `categories.incentives` | `SUM(extras)` |
| Overtime — 89.3% | `categories.overtime` | `SUM(snapshot.overtimeAmount)` |
| ₹20,20,000 Total Pay | `totalPayThisMonth` | `totalEarnings − deductions` |

---

## 5. Generate Paysheet

Computes and caches paysheet analytics for a specific month/year. If a record already exists it is overwritten (upsert). Returns HTTP `201`.

**POST** `/v1/paysheets/generate`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | **yes** | 1–12 |
| `year` | `number` | **yes** | e.g. `2026` |
| `organizationId` | `ObjectId` | no | Multi-tenant |

### Example Request Body

```json
{
  "month": 8,
  "year": 2026
}
```

### Response `201`

Returns the same shape as `GET /v1/paysheets/dashboard` without the `period` wrapper.

```json
{
  "_id": "664f1b2c8e4a2b001c8dff01",
  "month": 8,
  "year": 2026,
  "organizationId": null,
  "quickStats": {
    "totalSalary":      { "amount": 2150000, "percentageChange": 6.4 },
    "totalIncentive":   { "amount": 95000,   "percentageChange": 5.6 },
    "totalDeductions":  { "amount": 22000,   "percentageChange": 10.0 },
    "payableEmployees": { "count": 462,      "percentageChange": 1.3 },
    "onHoldEmployees":  { "count": 23,       "percentageChange": -8.0 }
  },
  "payrollOverview": {
    "totalPayThisMonth": 2150000,
    "monthlyData": [ ]
  },
  "payrollBreakdown": {
    "totalPayThisMonth": 2150000,
    "categories": {
      "salary":     { "amount": 1920350, "percentage": 89.3 },
      "allowances": { "amount": 107500,  "percentage": 5.0  },
      "deductions": { "amount": 47300,   "percentage": 2.2  },
      "incentives": { "amount": 47300,   "percentage": 2.2  },
      "overtime":   { "amount": 74850,   "percentage": 3.5  }
    }
  },
  "computedAt": "2026-08-01T09:00:00.000Z",
  "dataSource": {
    "employeeCount": 512,
    "processedPayrolls": 462,
    "lastPayrollUpdate": "2026-07-31T18:30:00.000Z"
  },
  "createdAt": "2026-08-01T09:00:00.000Z",
  "updatedAt": "2026-08-01T09:00:00.000Z"
}
```

---

## 6. Refresh Paysheet

Forces recomputation of an existing paysheet from live payroll data. Identical body to generate but returns HTTP `200`.

**POST** `/v1/paysheets/refresh`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | **yes** | 1–12 |
| `year` | `number` | **yes** | e.g. `2026` |
| `organizationId` | `ObjectId` | no | Multi-tenant |

### Example Request Body

```json
{
  "month": 7,
  "year": 2026
}
```

### Response `200`

Same shape as `POST /generate`.

---

## 7. Payroll List

Paginated table of employee payroll rows for a given month/year. Supports search, status filter, department filter, sort, and pagination. Maps directly to the table in Screen 2.

**GET** `/v1/paysheets/list`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | 1–12. Defaults to current month |
| `year` | `number` | no | Defaults to current year |
| `search` | `string` | no | Filter by employee name or employee code |
| `status` | `string` | no | `paid` \| `pending` \| `cancelled` \| `processed` \| `draft` |
| `departmentId` | `ObjectId` | no | Filter by department |
| `page` | `number` | no | Default `1` |
| `limit` | `number` | no | Default `10`, max `100` |
| `sortBy` | `string` | no | `field:asc` or `field:desc` e.g. `total:desc` |

### Example Requests

```
GET /v1/paysheets/list?month=7&year=2026
GET /v1/paysheets/list?month=7&year=2026&status=paid
GET /v1/paysheets/list?month=7&year=2026&search=Manoj
GET /v1/paysheets/list?month=7&year=2026&search=Manoj&status=paid&page=1&limit=10
GET /v1/paysheets/list?month=7&year=2026&sortBy=total:desc&limit=20
```

### Response `200`

```json
{
  "results": [
    {
      "_id": "664f1b2c8e4a2b001c8dff01",
      "month": 7,
      "year": 2026,
      "status": "paid",
      "employeeId": "664f1b2c8e4a2b001c8d0001",
      "empCode": "ST5683",
      "name": "Manoj Kumar",
      "profilePic": "https://example.com/uploads/manoj.jpg",
      "designation": "UI UX Designer",
      "department": "Design",
      "issueDate": "2026-01-14T00:00:00.000Z",
      "salary": 42853,
      "overtime": 5693,
      "total": 48486
    },
    {
      "_id": "664f1b2c8e4a2b001c8dff02",
      "month": 7,
      "year": 2026,
      "status": "pending",
      "employeeId": "664f1b2c8e4a2b001c8d0002",
      "empCode": "ST5683",
      "name": "Cristofer Dias",
      "profilePic": null,
      "designation": "Web Developer",
      "department": "Design",
      "issueDate": "2026-01-14T00:00:00.000Z",
      "salary": 42853,
      "overtime": 5693,
      "total": 48486
    },
    {
      "_id": "664f1b2c8e4a2b001c8dff03",
      "month": 7,
      "year": 2026,
      "status": "cancelled",
      "employeeId": "664f1b2c8e4a2b001c8d0003",
      "empCode": "ST5683",
      "name": "Hanna Lipshutz",
      "profilePic": null,
      "designation": "Marketing Ex",
      "department": "Design",
      "issueDate": "2026-01-14T00:00:00.000Z",
      "salary": 42853,
      "overtime": 5693,
      "total": 48486
    },
    {
      "_id": "664f1b2c8e4a2b001c8dff04",
      "month": 7,
      "year": 2026,
      "status": "paid",
      "employeeId": "664f1b2c8e4a2b001c8d0004",
      "empCode": "ST5683",
      "name": "Lydia Donin",
      "profilePic": null,
      "designation": "Business Development",
      "department": "Design",
      "issueDate": "2026-01-14T00:00:00.000Z",
      "salary": 42853,
      "overtime": 5693,
      "total": 48486
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "totalResults": 28,
  "month": 7,
  "year": 2026
}
```

### Column Mapping

| UI Column | Response field | Notes |
|---|---|---|
| Name (avatar) | `profilePic` | Null when not uploaded |
| Name (text) | `name` | Employee full name |
| Employee code | `empCode` | Displayed as `#ST5683` |
| Department column (top) | `designation` | e.g. UI UX Designer |
| Department column (bottom) | `department` | e.g. Design |
| Issue Date | `issueDate` | ISO date — format as `DD-MM-YYYY` in UI |
| Salary | `salary` | `earnedWages + otherWages − all deductions` |
| OT | `overtime` | `snapshot.overtimeAmount` |
| Total | `total` | `salary + overtime + extras` |
| Status | `status` | `paid` / `pending` / `cancelled` |
| Action `...` | — | Calls `PATCH /:payrollId/status` |

---

## 8. Payroll Detail

Returns the complete breakdown for a single payroll row including snapshot, stop details, and employee info. Used when opening the `...` action menu or a row detail drawer.

**GET** `/v1/paysheets/:payrollId/detail`

### Path Parameter

| Param | Type | Description |
|---|---|---|
| `payrollId` | `ObjectId` | MongoDB `_id` of the Payroll document |

### Example Request

```
GET /v1/paysheets/664f1b2c8e4a2b001c8dff01/detail
```

### Response `200`

```json
{
  "_id": "664f1b2c8e4a2b001c8dff01",
  "month": 7,
  "year": 2026,
  "status": "paid",
  "remarks": null,
  "extras": 0,
  "penalties": 500,
  "loanAndAdvance": 500,
  "otherDeductions": 137.88,
  "otherWages": 0,
  "issueDate": "2026-07-01T00:00:00.000Z",
  "employee": {
    "_id": "664f1b2c8e4a2b001c8d0001",
    "employeeId": "ST5683",
    "name": "Manoj Kumar",
    "profilePic": "https://example.com/uploads/manoj.jpg",
    "email": "manoj@company.com",
    "phone": 9876543210,
    "designation": "UI UX Designer"
  },
  "department": "Design",
  "salary": 42853,
  "overtime": 5693,
  "total": 48486,
  "snapshot": {
    "fullDays": 20,
    "halfDays": 2,
    "offDays": 1,
    "paidLeaves": 2,
    "unpaidLeaves": 0,
    "dailyRate": 1923.08,
    "grossWages": 50000,
    "earnedWages": 44230.88,
    "overtimeAmount": 5693,
    "grossEarnings": 49923.88,
    "takeHome": 48486
  },
  "stopDetails": null,
  "createdAt": "2026-07-01T00:00:00.000Z",
  "updatedAt": "2026-07-10T14:30:25.123Z"
}
```

### Response `404`

```json
{
  "code": 404,
  "message": "Payroll record not found"
}
```

---

## 9. Update Payroll Status

Updates the `status` field of a single payroll row. Triggered from the `...` action menu in the table.

**PATCH** `/v1/paysheets/:payrollId/status`

### Path Parameter

| Param | Type | Description |
|---|---|---|
| `payrollId` | `ObjectId` | MongoDB `_id` of the Payroll document |

### Request Body

| Field | Type | Required | Allowed Values |
|---|---|---|---|
| `status` | `string` | **yes** | `paid` \| `pending` \| `cancelled` \| `processed` \| `draft` |

### Example Request Body

```json
{
  "status": "paid"
}
```

### Response `200`

```json
{
  "id": "664f1b2c8e4a2b001c8dff01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "month": 7,
  "year": 2026,
  "status": "paid",
  "extras": 0,
  "penalties": 500,
  "loanAndAdvance": 500,
  "otherDeductions": 137.88,
  "otherWages": 0,
  "updatedAt": "2026-07-10T15:00:00.000Z",
  "createdAt": "2026-07-01T00:00:00.000Z"
}
```

### Response `400` — Invalid Status

```json
{
  "code": 400,
  "message": "\"status\" must be one of [paid, pending, cancelled, processed, draft]"
}
```

### Response `404`

```json
{
  "code": 404,
  "message": "Payroll record not found"
}
```

---

## Status Values

| Value | UI Label | UI Color |
|---|---|---|
| `paid` | Paid | Green |
| `pending` | Pending | Orange |
| `cancelled` | Canceled | Red |
| `processed` | Processed | Blue |
| `draft` | Draft | Grey |

---

## Validation Rules

| Field | Rule |
|---|---|
| `month` | Integer, 1–12 |
| `year` | Integer, 2000–2100 |
| `organizationId` | Valid 24-character hex ObjectId |
| `departmentId` | Valid 24-character hex ObjectId |
| `payrollId` (path) | Valid 24-character hex ObjectId |
| `status` | One of `paid`, `pending`, `cancelled`, `processed`, `draft` |
| `limit` | Integer, 1–100 |
| `page` | Integer, min 1 |

---

## Error Reference

| HTTP | Message | Cause |
|---|---|---|
| `400` | `"month" must be between 1 and 12` | Month out of range |
| `400` | `"year" must be between 2000 and 2100` | Year out of range |
| `400` | `"status" must be one of [paid, pending, cancelled, processed, draft]` | Invalid status value |
| `400` | `"payrollId" must be a valid ObjectId` | Malformed path param |
| `404` | `Payroll record not found` | No document for that `payrollId` |
