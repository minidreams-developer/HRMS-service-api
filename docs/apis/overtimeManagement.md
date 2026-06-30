# Overtime Management API

Base URL: `/v1/overtime`

---

## Create Overtime Request

**POST** `/v1/overtime`

### Request Body

```json
{
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "requestedDate": "2024-06-09",
  "OvertimeDate": "2024-06-10",
  "startTime": "2024-06-10T18:00:00.000Z",
  "endTime": "2024-06-10T21:00:00.000Z",
  "totalDuration": 3
}
```

| Field           | Type       | Required | Description                              |
|-----------------|------------|----------|------------------------------------------|
| `employeeId`    | `ObjectId` | yes      | ID of the employee                       |
| `requestedDate` | `date`     | no       | Date the request was submitted           |
| `OvertimeDate`  | `date`     | no       | Date the overtime will be worked         |
| `startTime`     | `date`     | no       | Overtime start time                      |
| `endTime`       | `date`     | no       | Overtime end time                        |
| `totalDuration` | `number`   | no       | Total overtime hours                     |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8dot01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "requestedDate": "2024-06-09T00:00:00.000Z",
  "OvertimeDate": "2024-06-10T00:00:00.000Z",
  "startTime": "2024-06-10T18:00:00.000Z",
  "endTime": "2024-06-10T21:00:00.000Z",
  "totalDuration": 3,
  "status": "pending",
  "createdAt": "2024-06-09T10:00:00.000Z",
  "updatedAt": "2024-06-09T10:00:00.000Z"
}
```

---

## Get All Overtime Requests

**GET** `/v1/overtime`

### Query Parameters

| Param        | Type       | Description                                  |
|--------------|------------|----------------------------------------------|
| `employeeId` | `ObjectId` | Filter by employee                           |
| `status`     | `string`   | Filter by status: `pending` \| `approved`    |
| `sortBy`     | `string`   | Sort field and order e.g. `createdAt:desc`   |
| `limit`      | `number`   | Results per page (default: 10)               |
| `page`       | `number`   | Page number (default: 1)                     |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dot01",
      "employeeId": {
        "id": "664f1b2c8e4a2b001c8d0001",
        "name": "John Doe",
        "employeeId": "EMP847291"
      },
      "requestedDate": "2024-06-09T00:00:00.000Z",
      "OvertimeDate": "2024-06-10T00:00:00.000Z",
      "startTime": "2024-06-10T18:00:00.000Z",
      "endTime": "2024-06-10T21:00:00.000Z",
      "totalDuration": 3,
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

## Get Overtime Requests by Employee

**GET** `/v1/overtime/employee/:employeeId`

### Path Parameter

| Param        | Type       | Description        |
|--------------|------------|--------------------|
| `employeeId` | `ObjectId` | MongoDB ID of user |

### Query Parameters

Supports `sortBy`, `limit`, `page`.

### Response `200`
Same paginated shape as Get All Overtime Requests.

---

## Get Overtime Request by ID

**GET** `/v1/overtime/:overtimeId`

### Path Parameter

| Param        | Type       | Description                      |
|--------------|------------|----------------------------------|
| `overtimeId` | `ObjectId` | MongoDB ID of the overtime record |

### Response `200`
Returns the full overtime record with populated `employeeId` (`name`, `employeeId`).

### Response `404`
```json
{ "code": 404, "message": "Overtime request not found" }
```

---

## Update Overtime Request

**PATCH** `/v1/overtime/:overtimeId`

Update any field on the overtime request. At least one field required.

### Request Body
```json
{
  "totalDuration": 4,
  "endTime": "2024-06-10T22:00:00.000Z"
}
```

### Response `200`
Returns the updated overtime record.

### Response `404`
```json
{ "code": 404, "message": "Overtime request not found" }
```

---

## Update Overtime Status

**PATCH** `/v1/overtime/:overtimeId/status`

### Request Body

```json
{
  "status": "approved"
}
```

| Field    | Type     | Required | Description                        |
|----------|----------|----------|------------------------------------|
| `status` | `string` | yes      | `pending` \| `approved`            |

### Response `200`
```json
{
  "id": "664f1b2c8e4a2b001c8dot01",
  "employeeId": "664f1b2c8e4a2b001c8d0001",
  "status": "approved",
  "updatedAt": "2024-06-09T11:00:00.000Z"
}
```

### Response `404`
```json
{ "code": 404, "message": "Overtime request not found" }
```

---

## Delete Overtime Request

**DELETE** `/v1/overtime/:overtimeId`

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Overtime request not found" }
```

---

## Notes

### Status flow

```
pending → approved
```

Use `PATCH /v1/overtime/:overtimeId/status` to update the status only. For other field updates use the regular `PATCH`.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=createdAt:desc`.
