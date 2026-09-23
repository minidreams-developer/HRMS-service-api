# Permission API

Base URL: `/v1/permissions`

Manages short-duration permission requests (e.g. leaving early, arriving late) for employees. Permissions are separate from leave balances and attendance records.

Statuses are `pending`, `approved`, `rejected`, and `cancelled`. Employees may create and view only their own requests; managers, HR managers, sub-admins, and admins may manage requests. `totalHours` is calculated from `from` and `to`; client-supplied values are ignored. Active (`pending`/`approved`) overlapping times for the same employee/day are rejected. Approved full-day leave blocks creation for that date. Half-day clock boundaries, holidays, week-offs, and attendance effects are intentionally not inferred by this API.

---

## Create Permission

**POST** `/v1/permissions`

### Request Body

```json
{
  "user": "664f1b2c8e4a2b001c8d0001",
  "from": "2024-06-10T10:00:00.000Z",
  "to": "2024-06-10T12:00:00.000Z",
  "totalHours": 2,
  "permissionStatus": "pending"
}
```

| Field              | Type      | Required | Description                                          |
|--------------------|-----------|----------|------------------------------------------------------|
| `user`             | `Mixed`   | no       | Reference to the employee (User ID)                  |
| `from`             | `date`    | no       | Permission start time (default: now)                 |
| `to`               | `date`    | no       | Permission end time (default: now)                   |
| `totalHours`       | `number`  | no       | Total hours of permission (default: `0`)             |
| `permissionStatus` | `string`  | no       | Status of the request (default: `pending`)           |
| `isPermissionTimeEnded` | `boolean` | no  | Whether the permission period has ended (default: `false`) |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8dpm01",
  "user": "664f1b2c8e4a2b001c8d0001",
  "from": "2024-06-10T10:00:00.000Z",
  "to": "2024-06-10T12:00:00.000Z",
  "totalHours": 2,
  "permissionStatus": "pending",
  "isPermissionTimeEnded": false,
  "createdAt": "2024-06-09T10:00:00.000Z",
  "updatedAt": "2024-06-09T10:00:00.000Z"
}
```

---

## Get All Permissions

**GET** `/v1/permissions`

### Query Parameters

| Param              | Type     | Description                                |
|--------------------|----------|--------------------------------------------|
| `user`             | `string` | Filter by user ID                          |
| `permissionStatus` | `string` | Filter by status                           |
| `sortBy`           | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit`            | `number` | Results per page (default: 10)             |
| `page`             | `number` | Page number (default: 1)                   |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dpm01",
      "user": "664f1b2c8e4a2b001c8d0001",
      "from": "2024-06-10T10:00:00.000Z",
      "to": "2024-06-10T12:00:00.000Z",
      "totalHours": 2,
      "permissionStatus": "pending",
      "isPermissionTimeEnded": false,
      "createdAt": "2024-06-09T10:00:00.000Z",
      "updatedAt": "2024-06-09T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

## Get Permission by ID

**GET** `/v1/permissions/:permissionId`

### Path Parameter

| Param          | Type       | Description               |
|----------------|------------|---------------------------|
| `permissionId` | `ObjectId` | MongoDB ID of permission  |

### Response `200`
Returns the full permission object (same shape as results array above).

### Response `404`
```json
{ "code": 404, "message": "Permission not found" }
```

---

## Update Permission

**PATCH** `/v1/permissions/:permissionId`

All fields optional, at least one required.

### Path Parameter

| Param          | Type       | Description               |
|----------------|------------|---------------------------|
| `permissionId` | `ObjectId` | MongoDB ID of permission  |

### Request Body

```json
{
  "permissionStatus": "approved",
  "isPermissionTimeEnded": true
}
```

| Field                   | Type      | Description                              |
|-------------------------|-----------|------------------------------------------|
| `from`                  | `date`    | Updated start time                       |
| `to`                    | `date`    | Updated end time                         |
| `totalHours`            | `number`  | Updated total hours                      |
| `permissionStatus`      | `string`  | Updated status                           |
| `isPermissionTimeEnded` | `boolean` | Mark permission period as ended          |

### Response `200`
Returns the updated permission object.

### Response `404`
```json
{ "code": 404, "message": "Permission not found" }
```

---

## Delete Permission

**DELETE** `/v1/permissions/:permissionId`

### Path Parameter

| Param          | Type       | Description               |
|----------------|------------|---------------------------|
| `permissionId` | `ObjectId` | MongoDB ID of permission  |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Permission not found" }
```

---

## Instructions

### Typical flow

1. Employee submits a permission request via `POST /v1/permissions` with `from`, `to`, and `totalHours`.
2. Manager reviews and updates `permissionStatus` to `approved` via `PATCH`.
3. Once the permission window passes, set `isPermissionTimeEnded: true`.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=createdAt:desc`.
