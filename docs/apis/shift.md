# Shift API

Base URL: `/v1/shifts`

---

## Generate Shift ID

Generates a unique `shiftCode` that does not already exist in the database. Returns the same code on repeated calls until it has been saved to the DB.

**GET** `/v1/shifts/generate-id`

### Request
No payload required.

### Response `200`
```json
{
  "shiftCode": "SHF847291"
}
```

---

## Create Shift

**POST** `/v1/shifts`

### Request Body

```json
{
  "userId": "664f1b2c8e4a2b001c8d0001",
  "shiftName": "Morning Shift",
  "shiftCode": "MS-001",
  "shiftType": "Fixed",
  "sameTimingForAllDays": false,
  "timings": [
    { "day": "Monday", "startTime": "09:00", "endTime": "18:00", "off": false },
    { "day": "Saturday", "startTime": "", "endTime": "", "off": true }
  ],
  "totalShiftDuration": "9h",
  "minWorkingHours": "8h",
  "gracePeriod": {
    "earlyCheckIn": 10,
    "lateCheckIn": 15,
    "earlyCheckOut": 10,
    "lateCheckOut": 15
  },
  "breakManagement": {
    "enabled": true,
    "breakType": "Fixed",
    "duration": 60,
    "multipleBreaksSupport": false,
    "breaks": [
      { "breakName": "Lunch", "duration": 60, "startTime": "13:00", "endTime": "14:00" }
    ]
  },
  "attendanceRules": {
    "lateMarkAfter": 15,
    "autoHalfDayAfterLate": 60
  },
  "weekOff": ["Sunday"],
  "compOff": [],
  "isShiftActive": true
}
```

#### Top-level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `ObjectId` | no | Owner/creator of the shift |
| `shiftName` | `string` | no | Display name of the shift |
| `shiftCode` | `string` | no | Unique shift code |
| `shiftType` | `string` | no | e.g. `Fixed`, `Flexible` (default: `Fixed`) |
| `sameTimingForAllDays` | `boolean` | no | Whether all days share the same timing (default: false) |
| `timings` | `object[]` | no | Per-day timing configuration (see below) |
| `totalShiftDuration` | `string` | no | Total shift duration e.g. `9h` |
| `minWorkingHours` | `string` | no | Minimum required working hours e.g. `8h` |
| `gracePeriod` | `object` | no | Grace period rules in minutes (see below) |
| `breakManagement` | `object` | no | Break configuration (see below) |
| `attendanceRules` | `object` | no | Late mark and half-day rules (see below) |
| `weekOff` | `string[]` | no | Days off e.g. `["Sunday"]` |
| `compOff` | `string[]` | no | Compensatory off days |
| `isShiftActive` | `boolean` | no | Whether shift is active (default: true) |

#### timings[]

| Field | Type | Description |
|-------|------|-------------|
| `day` | `string` | Day name e.g. `Monday` |
| `startTime` | `string` | Start time e.g. `09:00` |
| `endTime` | `string` | End time e.g. `18:00` |
| `off` | `boolean` | Whether this day is a day off (default: false) |

#### gracePeriod (all values in minutes)

| Field | Type | Description |
|-------|------|-------------|
| `earlyCheckIn` | `number` | Allowed early check-in buffer (default: 0) |
| `lateCheckIn` | `number` | Allowed late check-in buffer (default: 0) |
| `earlyCheckOut` | `number` | Allowed early check-out buffer (default: 0) |
| `lateCheckOut` | `number` | Allowed late check-out buffer (default: 0) |

#### breakManagement

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Whether break management is active (default: false) |
| `breakType` | `string` | Type of break e.g. `Fixed`, `Flexible` |
| `duration` | `number` | Global break duration in minutes |
| `multipleBreaksSupport` | `boolean` | Whether multiple breaks are allowed (default: false) |
| `breaks` | `object[]` | List of break definitions (see below) |

#### breakManagement.breaks[]

| Field | Type | Description |
|-------|------|-------------|
| `breakName` | `string` | Name of the break e.g. `Lunch` |
| `duration` | `number` | Duration in minutes |
| `startTime` | `string` | Break start time e.g. `13:00` |
| `endTime` | `string` | Break end time e.g. `14:00` |

#### attendanceRules (all values in minutes)

| Field | Type | Description |
|-------|------|-------------|
| `lateMarkAfter` | `number` | Minutes after shift start before marking late (default: 0) |
| `autoHalfDayAfterLate` | `number` | Minutes late before auto half-day is applied (default: 0) |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8dsh01",
  "shiftName": "Morning Shift",
  "shiftCode": "MS-001",
  "shiftType": "Fixed",
  "isShiftActive": true,
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All Shifts

**GET** `/v1/shifts`

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | `ObjectId` | Filter by owner |
| `shiftName` | `string` | Filter by shift name |
| `shiftCode` | `string` | Filter by shift code |
| `shiftType` | `string` | Filter by shift type |
| `isShiftActive` | `boolean` | Filter by active status |
| `sortBy` | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit` | `number` | Results per page (default: 10) |
| `page` | `number` | Page number (default: 1) |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dsh01",
      "shiftName": "Morning Shift",
      "shiftCode": "MS-001",
      "shiftType": "Fixed",
      "isShiftActive": true,
      "createdAt": "2024-06-01T10:00:00.000Z",
      "updatedAt": "2024-06-01T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

## Get Shift by ID

**GET** `/v1/shifts/:shiftId`

### Path Parameter

| Param | Type | Description |
|-------|------|-------------|
| `shiftId` | `ObjectId` | MongoDB ID of the shift |

### Response `200`
Returns the full shift object including timings, gracePeriod, breakManagement, and attendanceRules.

### Response `404`
```json
{ "code": 404, "message": "Shift not found" }
```

---

## Update Shift

**PATCH** `/v1/shifts/:shiftId`

All fields optional, at least one required.

### Request Body

```json
{
  "isShiftActive": false,
  "gracePeriod": {
    "lateCheckIn": 20
  },
  "attendanceRules": {
    "lateMarkAfter": 20,
    "autoHalfDayAfterLate": 90
  }
}
```

### Response `200`
Returns the updated shift object.

### Response `404`
```json
{ "code": 404, "message": "Shift not found" }
```

---

## Delete Shift

**DELETE** `/v1/shifts/:shiftId`

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Shift not found" }
```

---

## Instructions

### Timing configuration

- Set `sameTimingForAllDays: true` and provide a single entry in `timings` to apply the same schedule to all working days.
- Set `sameTimingForAllDays: false` and provide one entry per day in `timings` for a custom per-day schedule.
- Mark a day as off by setting `off: true` on its timing entry.

### Break management

- Set `breakManagement.enabled: true` to activate break tracking.
- Use `multipleBreaksSupport: true` and populate the `breaks` array for multiple named breaks.
- Use `duration` at the top level of `breakManagement` for a single global break duration.

### Attendance rules

- `lateMarkAfter`: employee is marked late only after this many minutes past shift start.
- `autoHalfDayAfterLate`: employee is automatically marked half-day if late by this many minutes.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=createdAt:desc`.

### shiftCode format

Auto-generated as `SHF` followed by a 6-digit number, e.g. `SHF847291`. Calling `generate-id` multiple times before saving returns the same code — a new one is only issued after the previous one is saved to the DB.
