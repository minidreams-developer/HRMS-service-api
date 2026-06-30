# Leave Requests API

Base URL: `/v1/leave-requests`

---

## Create Leave Request

**POST** `/v1/leave-requests`

### Request Body

```json
{
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "leaveType": "Sick Leave",
  "startDate": "2024-06-10",
  "endDate": "2024-06-12",
  "singleDate": null,
  "reason": "Fever and cold"
}
```

| Field        | Type       | Required | Description                                             |
|--------------|------------|----------|---------------------------------------------------------|
| `employeeId` | `ObjectId` | yes      | ID of the employee applying for leave                   |
| `leaveType`  | `string`   | yes      | Type of leave e.g. `Sick Leave`, `Casual Leave`         |
| `startDate`  | `Date`     | no       | Start date of leave (for multi-day leave)               |
| `endDate`    | `Date`     | no       | End date — must be on or after `startDate`              |
| `singleDate` | `Date`     | no       | Use for single-day leave instead of a date range        |
| `reason`     | `string`   | no       | Reason for the leave                                    |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8dlv01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "leaveType": "Sick Leave",
  "startDate": "2024-06-10T00:00:00.000Z",
  "endDate": "2024-06-12T00:00:00.000Z",
  "singleDate": null,
  "reason": "Fever and cold",
  "status": "pending",
  "createdAt": "2024-06-09T10:00:00.000Z",
  "updatedAt": "2024-06-09T10:00:00.000Z"
}
```

---

## Get All Leave Requests

**GET** `/v1/leave-requests`

### Query Parameters

| Param        | Type       | Description                                              |
|--------------|------------|----------------------------------------------------------|
| `employeeId` | `ObjectId` | Filter by employee                                       |
| `leaveType`  | `string`   | Filter by leave type                                     |
| `status`     | `string`   | Filter by status: `pending` \| `approved` \| `ended`    |
| `sortBy`     | `string`   | Sort field and order e.g. `createdAt:desc`               |
| `limit`      | `number`   | Results per page (default: 10)                           |
| `page`       | `number`   | Page number (default: 1)                                 |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dlv01",
      "employeeId": {
        "id": "664f1b2c8e4a2b001c8d0001",
        "name": "John Doe",
        "employeeId": "EMP847291"
      },
      "leaveType": "Sick Leave",
      "startDate": "2024-06-10T00:00:00.000Z",
      "endDate": "2024-06-12T00:00:00.000Z",
      "singleDate": null,
      "reason": "Fever and cold",
      "status": "pending",
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

## Get Leave Requests by Employee

**GET** `/v1/leave-requests/employee/:employeeId`

### Path Parameter

| Param        | Type       | Description        |
|--------------|------------|--------------------|
| `employeeId` | `ObjectId` | MongoDB ID of user |

### Query Parameters

| Param    | Type     | Description                    |
|----------|----------|--------------------------------|
| `sortBy` | `string` | e.g. `createdAt:desc`          |
| `limit`  | `number` | Results per page (default: 10) |
| `page`   | `number` | Page number (default: 1)       |

### Response `200`
Same paginated shape as Get All Leave Requests.

---

## Get Leave Request by ID

**GET** `/v1/leave-requests/:leaveRequestId`

### Path Parameter

| Param            | Type       | Description                     |
|------------------|------------|---------------------------------|
| `leaveRequestId` | `ObjectId` | MongoDB ID of the leave request |

### Response `200`
Returns the full leave request with `employeeId` populated (`name`, `employeeId`).

### Response `404`
```json
{ "code": 404, "message": "Leave request not found" }
```

---

## Update Leave Request

**PATCH** `/v1/leave-requests/:leaveRequestId`

Updates fields on the leave request. At least one field required. `employeeId` and `status` cannot be updated here — use the dedicated status endpoint for status changes.

### Request Body

```json
{
  "leaveType": "Casual Leave",
  "reason": "Updated reason",
  "endDate": "2024-06-13"
}
```

| Field        | Type     | Description                                  |
|--------------|----------|----------------------------------------------|
| `leaveType`  | `string` | Updated leave type                           |
| `startDate`  | `Date`   | Updated start date                           |
| `endDate`    | `Date`   | Updated end date                             |
| `singleDate` | `Date`   | Updated single-day date                      |
| `reason`     | `string` | Updated reason                               |

### Response `200`
Returns the updated leave request.

### Response `404`
```json
{ "code": 404, "message": "Leave request not found" }
```

---

## Update Leave Status

**PATCH** `/v1/leave-requests/:leaveRequestId/status`

Only updates the `status` field. Use this to approve or end a leave request.

### Path Parameter

| Param            | Type       | Description                     |
|------------------|------------|---------------------------------|
| `leaveRequestId` | `ObjectId` | MongoDB ID of the leave request |

### Request Body

```json
{
  "status": "approved"
}
```

| Field    | Type     | Required | Description                              |
|----------|----------|----------|------------------------------------------|
| `status` | `string` | yes      | `pending` \| `approved` \| `ended`       |

### Response `200`

```json
{
  "id": "664f1b2c8e4a2b001c8dlv01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "leaveType": "Sick Leave",
  "startDate": "2024-06-10T00:00:00.000Z",
  "endDate": "2024-06-12T00:00:00.000Z",
  "status": "approved",
  "createdAt": "2024-06-09T10:00:00.000Z",
  "updatedAt": "2024-06-09T11:00:00.000Z"
}
```

### Response `404`
```json
{ "code": 404, "message": "Leave request not found" }
```

---

## Delete Leave Request

**DELETE** `/v1/leave-requests/:leaveRequestId`

### Path Parameter

| Param            | Type       | Description                     |
|------------------|------------|---------------------------------|
| `leaveRequestId` | `ObjectId` | MongoDB ID of the leave request |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Leave request not found" }
```

---

## Instructions

### Single-day vs multi-day leave

- For a single day off, use `singleDate` and omit `startDate`/`endDate`.
- For a date range, use `startDate` and `endDate`. `endDate` must be on or after `startDate`.

### Status flow

```
pending → approved
pending → ended
```

Use `PATCH /v1/leave-requests/:leaveRequestId/status` to transition status. The regular `PATCH` endpoint does not accept `status`.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=createdAt:desc`.
