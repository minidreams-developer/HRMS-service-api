# Attendance API

Base URL: `/v1/attendance`

---

## Create Attendance Record

**POST** `/v1/attendance`

### Request Body

```json
{
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "date": "2024-06-01",
  "shiftId": "664f1b2c8e4a2b001c8dsh01",
  "loginTime": "2024-06-01T09:00:00.000Z",
  "logoutTime": "2024-06-01T18:00:00.000Z",
  "IsOverTimeWoked": false,
  "overTimeWorkedHours": 0,
  "totalWorkedHours": 9,
  "attendanceStatus": "onTime",
  "remarks": "Present"
}
```

| Field                | Type       | Required | Description                                          |
|----------------------|------------|----------|------------------------------------------------------|
| `employeeId`         | `ObjectId` | yes      | Reference to the employee (User)                     |
| `date`               | `Date`     | yes      | Date of attendance                                   |
| `shiftId`            | `ObjectId` | no       | Reference to the shift                               |
| `loginTime`          | `Date`     | no       | Check-in timestamp                                   |
| `logoutTime`         | `Date`     | no       | Check-out timestamp                                  |
| `IsOverTimeWoked`    | `boolean`  | no       | Whether overtime was worked (default: `false`)       |
| `overTimeWorkedHours`| `number`   | no       | Overtime hours worked, min 0 (default: `0`)          |
| `totalWorkedHours`   | `number`   | no       | Total hours worked, min 0 (default: `0`)             |
| `attendanceStatus`   | `string`   | no       | `onTime` \| `earlyOut` \| `arrivedLate` (default: `onTime`) |
| `remarks`            | `string`   | no       | Additional remarks                                   |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8dat01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "date": "2024-06-01T00:00:00.000Z",
  "shiftId": "664f1b2c8e4a2b001c8dsh01",
  "loginTime": "2024-06-01T09:00:00.000Z",
  "logoutTime": "2024-06-01T18:00:00.000Z",
  "IsOverTimeWoked": false,
  "overTimeWorkedHours": 0,
  "totalWorkedHours": 9,
  "attendanceStatus": "onTime",
  "remarks": "Present"
}
```

---

## Get All Attendance Records

**GET** `/v1/attendance`

### Query Parameters

| Param              | Type       | Description                                              |
|--------------------|------------|----------------------------------------------------------|
| `employeeId`       | `ObjectId` | Filter by employee                                       |
| `date`             | `Date`     | Filter by date                                           |
| `shiftId`          | `ObjectId` | Filter by shift                                          |
| `attendanceStatus` | `string`   | Filter by status: `onTime` \| `earlyOut` \| `arrivedLate`|
| `sortBy`           | `string`   | Sort field and order e.g. `date:desc`                    |
| `limit`            | `number`   | Results per page (default: 10)                           |
| `page`             | `number`   | Page number (default: 1)                                 |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dat01",
      "employeeId": "664f1b2c8e4a2b001c8d0001",
      "date": "2024-06-01T00:00:00.000Z",
      "shiftId": "664f1b2c8e4a2b001c8dsh01",
      "loginTime": "2024-06-01T09:00:00.000Z",
      "logoutTime": "2024-06-01T18:00:00.000Z",
      "IsOverTimeWoked": false,
      "overTimeWorkedHours": 0,
      "totalWorkedHours": 9,
      "attendanceStatus": "onTime",
      "remarks": "Present"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

## Get Attendance Record by ID

**GET** `/v1/attendance/:attendanceId`

### Path Parameter

| Param          | Type       | Description                         |
|----------------|------------|-------------------------------------|
| `attendanceId` | `ObjectId` | MongoDB ID of the attendance record |

### Response `200`
Returns the full attendance record (same shape as results array above).

### Response `404`
```json
{ "code": 404, "message": "Attendance not found" }
```

---

## Update Attendance Record

**PATCH** `/v1/attendance/:attendanceId`

All fields optional, at least one required. `employeeId` cannot be updated.

### Request Body

```json
{
  "logoutTime": "2024-06-01T19:30:00.000Z",
  "IsOverTimeWoked": true,
  "overTimeWorkedHours": 1.5,
  "totalWorkedHours": 10.5,
  "attendanceStatus": "onTime",
  "remarks": "Stayed late for project deadline"
}
```

| Field                | Type       | Description                                          |
|----------------------|------------|------------------------------------------------------|
| `date`               | `Date`     | Updated date                                         |
| `shiftId`            | `ObjectId` | Updated shift reference                              |
| `loginTime`          | `Date`     | Updated check-in time                                |
| `logoutTime`         | `Date`     | Updated check-out time                               |
| `IsOverTimeWoked`    | `boolean`  | Updated overtime flag                                |
| `overTimeWorkedHours`| `number`   | Updated overtime hours, min 0                        |
| `totalWorkedHours`   | `number`   | Updated total hours, min 0                           |
| `attendanceStatus`   | `string`   | `onTime` \| `earlyOut` \| `arrivedLate`              |
| `remarks`            | `string`   | Updated remarks                                      |

### Response `200`
Returns the updated attendance record.

### Response `404`
```json
{ "code": 404, "message": "Attendance not found" }
```

---

## Delete Attendance Record

**DELETE** `/v1/attendance/:attendanceId`

### Path Parameter

| Param          | Type       | Description                         |
|----------------|------------|-------------------------------------|
| `attendanceId` | `ObjectId` | MongoDB ID of the attendance record |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Attendance not found" }
```

---

## Instructions

### attendanceStatus values

| Value         | Description                            |
|---------------|----------------------------------------|
| `onTime`      | Employee arrived on time (default)     |
| `earlyOut`    | Employee left before shift end         |
| `arrivedLate` | Employee arrived after shift start     |

### Typical flow

1. On check-in, create a record with `employeeId`, `date`, `shiftId`, and `loginTime`.
2. On check-out, `PATCH` the record with `logoutTime` and `totalWorkedHours`.
3. If overtime was worked, set `IsOverTimeWoked: true` and `overTimeWorkedHours` accordingly.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=date:desc`.
# Legacy `attendanceDay` migration

Before production deployment, audit legacy Attendance records without `attendanceDay`:

```bash
NODE_ENV=test node scripts/auditAttendanceDay.js --dry-run
```

The script is dry-run by default and reports record counts, UTC-normalized duplicate employee/date groups, affected record details, and safe records eligible for backfill. It never selects a duplicate winner.

Apply only safe, unique records explicitly:

```bash
NODE_ENV=production ALLOW_ATTENDANCE_MIGRATION_PRODUCTION=true \
  node scripts/auditAttendanceDay.js --apply --confirm-production
```

Duplicate groups are skipped and must be reviewed manually using the reported employee ID, normalized date, record IDs, category, times, worked hours, and timestamps. No records are deleted, merged, or overwritten.
