# Users Filter API

Endpoint: `GET /v1/users`

---

## Overview

The `/v1/users` endpoint supports a filter panel with six sections. All filters are passed as query parameters. Every filter is optional and can be combined freely.

---

## All Query Parameters

| Param | Type | Required | Filter Panel | Description |
|---|---|---|---|---|
| `name` | `string` | no | Search bar | Case-insensitive name search |
| `empId` | `string` | no | Search bar | Exact employee ID match |
| `role` | `string` | no | — | Role filter |
| `departmentId` | `ObjectId` | no | Department | Filter by department |
| `designation` | `string` | no | Designations | Filter by designation |
| `joinedFrom` | `date` (ISO) | no | Date Range | Joined date — from |
| `joinedTo` | `date` (ISO) | no | Date Range | Joined date — to |
| `status` | `string` | no | Status | `active` \| `inactive` \| `relieved` |
| `shiftId` | `ObjectId` | no | Shift | Filter by assigned shift |
| `sortBy` | `string` | no | Sort By | `date:asc/desc` \| `name:asc/desc` \| `status:asc/desc` |
| `page` | `number` | no | Pagination | Default `1` |
| `limit` | `number` | no | Pagination | Default `10`, max `100` |

---

## Filter 1 — Department

Select one department from the list. Pass the department's MongoDB `_id`.

**Param:** `departmentId`
**Type:** `ObjectId` (24-character hex string)

### How it works internally

```
departmentId = "664f1b2c8e4a2b001c8ddef1"
→ { 'workInformation.department': ObjectId('664f1b2c8e4a2b001c8ddef1') }
```

### Example Request

```
GET /v1/users?departmentId=664f1b2c8e4a2b001c8ddef1
```

> To populate the department list in the UI, call `GET /v1/departments` and display `departmentName` as the label with `_id` as the value.

---

## Filter 2 — Designations

Select one designation from the list. Partial, case-insensitive match — so searching `designer` also matches `UI/UX Designer`.

**Param:** `designation`
**Type:** `string`

### How it works internally

```
designation = "UI/UX Designer"
→ { 'workInformation.designation': { $regex: 'UI/UX Designer', $options: 'i' } }
```

### Example Request

```
GET /v1/users?designation=UI%2FUX+Designer
GET /v1/users?designation=Accountant
GET /v1/users?designation=Manager
```

> To populate the designations list in the UI, call `GET /v1/users` with `limit=1000` and collect unique `workInformation.designation` values, or maintain a separate designations reference list.

---

## Filter 3 — Date Range

Filter employees by their joining date (`workInformation.joinedDate`). Both `joinedFrom` and `joinedTo` are optional — use one or both.

**Params:** `joinedFrom`, `joinedTo`
**Type:** ISO date string (`YYYY-MM-DD`)

### How it works internally

```
joinedFrom = "2026-01-01"
joinedTo   = "2026-07-31"

→ { 'workInformation.joinedDate': { $gte: 2026-01-01T00:00:00Z, $lte: 2026-07-31T23:59:59Z } }
```

> `joinedTo` is automatically extended to `23:59:59.999` on the same day so employees who joined on the end date are included.

### Example Requests

```
GET /v1/users?joinedFrom=2026-01-01&joinedTo=2026-07-31
GET /v1/users?joinedFrom=2026-06-01
GET /v1/users?joinedTo=2026-03-31
```

---

## Filter 4 — Status

Select one status from: **Active**, **In-Active**, **Relieved**.

**Param:** `status`
**Type:** `string`
**Allowed values:** `active` | `inactive` | `relieved`

### Status Mapping

| UI Label | Param value | Internal filter applied |
|---|---|---|
| Active | `active` | `isActive: true` + `approvalStatus: 'approved'` |
| In-Active | `inactive` | `isActive: false` |
| Relieved | `relieved` | `approvalStatus: 'rejected'` |

### How it works internally

```
status = "active"   → { isActive: true, approvalStatus: 'approved' }
status = "inactive" → { isActive: false }
status = "relieved" → { approvalStatus: 'rejected' }
```

### Example Requests

```
GET /v1/users?status=active
GET /v1/users?status=inactive
GET /v1/users?status=relieved
```

---

## Filter 5 — Shift

Filter employees by their assigned shift. Pass the shift's MongoDB `_id`.

**Param:** `shiftId`
**Type:** `ObjectId` (24-character hex string)

### How it works internally

```
shiftId = "664f1b2c8e4a2b001c8d0099"
→ { 'workInformation.shiftId': ObjectId('664f1b2c8e4a2b001c8d0099') }
```

### Example Request

```
GET /v1/users?shiftId=664f1b2c8e4a2b001c8d0099
```

> To populate the shift list in the UI, call `GET /v1/shifts` and display `shiftName` as the label with `_id` as the value.

---

## Filter 6 — Sort By

Sort results by one of four fields. Each option maps to an actual database field.

**Param:** `sortBy`
**Format:** `field:direction` where direction is `asc` or `desc`

### Sort Options

| UI Label | Param value | Sorts by field |
|---|---|---|
| Date | `date:asc` or `date:desc` | `workInformation.joinedDate` |
| Name | `name:asc` or `name:desc` | `name` |
| Status | `status:asc` or `status:desc` | `isActive` |
| Amount | `amount:asc` or `amount:desc` | `name` (fallback) |

### Example Requests

```
GET /v1/users?sortBy=name:asc
GET /v1/users?sortBy=date:desc
GET /v1/users?sortBy=status:asc
```

---

## Combined Filter Examples

### Department + Status (most common)

```
GET /v1/users?departmentId=664f1b2c8e4a2b001c8ddef1&status=active
```

### Department + Designation

```
GET /v1/users?departmentId=664f1b2c8e4a2b001c8ddef1&designation=UI%2FUX+Designer
```

### Date Range + Sort

```
GET /v1/users?joinedFrom=2026-01-01&joinedTo=2026-06-30&sortBy=date:desc
```

### Shift + Status

```
GET /v1/users?shiftId=664f1b2c8e4a2b001c8d0099&status=active
```

### All filters combined

```
GET /v1/users?departmentId=664f1b2c8e4a2b001c8ddef1&designation=Designer&status=active&shiftId=664f1b2c8e4a2b001c8d0099&joinedFrom=2026-01-01&joinedTo=2026-12-31&sortBy=name:asc&page=1&limit=10
```

---

## Response `200`

All filter combinations return the same paginated response shape:

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8d0001",
      "name": "Manoj Kumar",
      "employeeId": "EMP6740",
      "email": "manoj@company.com",
      "phone": 9876543210,
      "role": "employee",
      "profilePic": "https://example.com/uploads/manoj.jpg",
      "isActive": true,
      "approvalStatus": "approved",
      "workInformation": {
        "joinedDate": "2026-01-14T00:00:00.000Z",
        "designation": "UI/UX Designer",
        "department": {
          "id": "664f1b2c8e4a2b001c8ddef1",
          "departmentName": "Design Department",
          "departmentCode": "DEPT001"
        },
        "shiftId": {
          "id": "664f1b2c8e4a2b001c8d0099",
          "shiftName": "Morning Shift",
          "shiftCode": "MS001"
        },
        "SalaryDetails": {
          "basicSalary": 35000,
          "monthlyCTC": 50000,
          "annualCTC": 600000
        }
      },
      "createdAt": "2026-01-14T10:30:00.000Z",
      "updatedAt": "2026-07-01T08:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 48
}
```

---

## Error Responses

### `400` — Invalid departmentId or shiftId

```json
{
  "code": 400,
  "message": "\"departmentId\" must be a valid ObjectId"
}
```

### `400` — Invalid status value

```json
{
  "code": 400,
  "message": "\"status\" must be one of [active, inactive, relieved]"
}
```

### `400` — Invalid date format

```json
{
  "code": 400,
  "message": "\"joinedFrom\" must be in ISO 8601 date format"
}
```

### `400` — Invalid role value

```json
{
  "code": 400,
  "message": "\"role\" must be one of [employee, hr_manager, team_lead, agent, staff, manager, subAdmin, admin, contractor]"
}
```

---

## Helper Endpoints

Use these to populate dropdown options in the filter panel UI.

| Filter Panel | Helper Endpoint | Label field | Value field |
|---|---|---|---|
| Department list | `GET /v1/departments` | `departmentName` | `id` |
| Shift list | `GET /v1/shifts` | `shiftName` | `id` |
| Status list | hardcoded | Active / In-Active / Relieved | `active` / `inactive` / `relieved` |
| Designations list | `GET /v1/users?limit=1000` | unique `workInformation.designation` values | same string |
