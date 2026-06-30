# Holiday API

Base URL: `/v1/holidays`

---

## Create Holiday

**POST** `/v1/holidays`

### Request Body
```json
{
  "holidayTitle": "New Year",
  "description": "New Year celebration",
  "month": 1,
  "date": "2025-01-01T00:00:00.000Z",
  "nextWorkingDay": "2025-01-02T00:00:00.000Z",
  "status": true,
  "holidayImage": "https://example.com/newyear.png",
  "Remarks": "National holiday"
}
```

| Field            | Type        | Required | Description                          |
|------------------|-------------|----------|--------------------------------------|
| `holidayTitle`   | `string`    | yes      | Title of the holiday                 |
| `description`    | `string`    | no       | Short description                    |
| `month`          | `number`    | no       | Month number (1–12)                  |
| `date`           | `Date`      | no       | Date of the holiday                  |
| `nextWorkingDay` | `Date`      | no       | Next working day after the holiday   |
| `status`         | `boolean`   | no       | Active status (default: `true`)      |
| `people`         | `ObjectId[]`| no       | List of user IDs associated          |
| `holidayImage`   | `string`    | no       | URL of the holiday image             |
| `Remarks`        | `string`    | no       | Additional remarks                   |

### Response `201`
```json
{
  "id": "664f1b2c8e4a2b001c8ddef1",
  "holidayTitle": "New Year",
  "description": "New Year celebration",
  "month": 1,
  "date": "2025-01-01T00:00:00.000Z",
  "nextWorkingDay": "2025-01-02T00:00:00.000Z",
  "status": true,
  "people": [],
  "holidayImage": "https://example.com/newyear.png",
  "Remarks": "National holiday",
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All Holidays

**GET** `/v1/holidays`

### Query Parameters

| Param          | Type      | Description                                |
|----------------|-----------|--------------------------------------------|
| `holidayTitle` | `string`  | Filter by holiday title                    |
| `month`        | `number`  | Filter by month number                     |
| `status`       | `boolean` | Filter by active status                    |
| `sortBy`       | `string`  | Sort field and order e.g. `date:asc`       |
| `limit`        | `number`  | Results per page (default: 10)             |
| `page`         | `number`  | Page number (default: 1)                   |

### Response `200`
```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8ddef1",
      "holidayTitle": "New Year",
      "month": 1,
      "date": "2025-01-01T00:00:00.000Z",
      "status": true,
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

## Get Holiday by ID

**GET** `/v1/holidays/:holidayId`

### Path Parameter

| Param       | Type       | Description            |
|-------------|------------|------------------------|
| `holidayId` | `ObjectId` | MongoDB ID of holiday  |

### Response `200`
```json
{
  "id": "664f1b2c8e4a2b001c8ddef1",
  "holidayTitle": "New Year",
  "description": "New Year celebration",
  "month": 1,
  "date": "2025-01-01T00:00:00.000Z",
  "nextWorkingDay": "2025-01-02T00:00:00.000Z",
  "status": true,
  "people": [
    {
      "id": "664f1b2c8e4a2b001c8d0001",
      "name": "John Doe",
      "email": "john@example.com",
      "employeeId": "EMP001"
    }
  ],
  "holidayImage": "https://example.com/newyear.png",
  "Remarks": "National holiday",
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

### Response `404`
```json
{
  "code": 404,
  "message": "Holiday not found"
}
```

---

## Update Holiday

**PATCH** `/v1/holidays/:holidayId`

All fields are optional. At least one field must be provided.

### Request Body
```json
{
  "holidayTitle": "New Year's Day",
  "status": false
}
```

### Response `200`
Returns the updated holiday object (same shape as Get Holiday by ID).

### Response `404`
```json
{
  "code": 404,
  "message": "Holiday not found"
}
```

---

## Delete Holiday

**DELETE** `/v1/holidays/:holidayId`

### Path Parameter

| Param       | Type       | Description           |
|-------------|------------|-----------------------|
| `holidayId` | `ObjectId` | MongoDB ID of holiday |

### Response `204`
No content.

### Response `404`
```json
{
  "code": 404,
  "message": "Holiday not found"
}
```

---

## Add Person to Holiday

**POST** `/v1/holidays/:holidayId/people`

Adds a user to the holiday's `people` array.

### Path Parameter

| Param       | Type       | Description           |
|-------------|------------|-----------------------|
| `holidayId` | `ObjectId` | MongoDB ID of holiday |

### Request Body
```json
{
  "userId": "664f1b2c8e4a2b001c8d0001"
}
```

| Field    | Type       | Required | Description                   |
|----------|------------|----------|-------------------------------|
| `userId` | `ObjectId` | yes      | MongoDB ID of the user to add |

### Response `200`
Returns the updated holiday object with the new user populated in `people`.

### Response `400` — already added
```json
{
  "code": 400,
  "message": "User is already added to this holiday"
}
```

### Response `404`
```json
{
  "code": 404,
  "message": "Holiday not found"
}
```

---

## Remove Person from Holiday

**DELETE** `/v1/holidays/:holidayId/people`

Removes a user from the holiday's `people` array.

### Path Parameter

| Param       | Type       | Description           |
|-------------|------------|-----------------------|
| `holidayId` | `ObjectId` | MongoDB ID of holiday |

### Request Body
```json
{
  "userId": "664f1b2c8e4a2b001c8d0001"
}
```

| Field    | Type       | Required | Description                      |
|----------|------------|----------|----------------------------------|
| `userId` | `ObjectId` | yes      | MongoDB ID of the user to remove |

### Response `200`
Returns the updated holiday object with the user removed from `people`.

### Response `400` — not in list
```json
{
  "code": 400,
  "message": "User is not in this holiday"
}
```

### Response `404`
```json
{
  "code": 404,
  "message": "Holiday not found"
}
```
