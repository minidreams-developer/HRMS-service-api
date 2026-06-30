# Department API

Base URL: `/v1/departments`

---

## Generate Department ID

Generates a unique `departmentCode` that does not already exist in the database. Use this before creating a department to pre-fill the `departmentCode` field.

**GET** `/v1/departments/generate-id`

### Request
No payload required.

### Response `200`
```json
{
  "departmentCode": "DEPT847291"
}
```

---

## Create Department

**POST** `/v1/departments`

### Request Body
```json
{
  "departmentName": "Engineering",
  "departmentDescription": "Handles all engineering work",
  "departmentCode": "DEPT847291",
  "departmentHead": "664f1b2c8e4a2b001c8d1234",
  "departmentEmployees": ["664f1b2c8e4a2b001c8d0001"],
  "departmentTeams": ["664f1b2c8e4a2b001c8dabc1"]
}
```

| Field                   | Type         | Required | Description                              |
|-------------------------|--------------|----------|------------------------------------------|
| `departmentName`        | `string`     | yes      | Name of the department                   |
| `departmentDescription` | `string`     | no       | Short description                        |
| `departmentCode`        | `string`     | yes      | Unique department code (use generate-id) |
| `departmentHead`        | `ObjectId`   | no       | User ID of the department head           |
| `departmentEmployees`   | `ObjectId[]` | no       | List of employee user IDs                |
| `departmentTeams`       | `ObjectId[]` | no       | List of team IDs                         |

### Response `201`
```json
{
  "id": "664f1b2c8e4a2b001c8ddef1",
  "departmentName": "Engineering",
  "departmentDescription": "Handles all engineering work",
  "departmentCode": "DEPT847291",
  "departmentHead": "664f1b2c8e4a2b001c8d1234",
  "departmentEmployees": ["664f1b2c8e4a2b001c8d0001"],
  "departmentTeams": ["664f1b2c8e4a2b001c8dabc1"],
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All Departments

**GET** `/v1/departments`

### Query Parameters

| Param            | Type     | Description                                |
|------------------|----------|--------------------------------------------|
| `departmentName` | `string` | Filter by department name                  |
| `departmentCode` | `string` | Filter by department code                  |
| `sortBy`         | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit`          | `number` | Results per page (default: 10)             |
| `page`           | `number` | Page number (default: 1)                   |

### Response `200`
```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8ddef1",
      "departmentName": "Engineering",
      "departmentCode": "DEPT847291",
      "departmentHead": "664f1b2c8e4a2b001c8d1234",
      "departmentEmployees": [],
      "departmentTeams": [],
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

## Get Department by ID

**GET** `/v1/departments/:departmentId`

### Path Parameter

| Param          | Type       | Description              |
|----------------|------------|--------------------------|
| `departmentId` | `ObjectId` | MongoDB ID of department |

### Response `200`
```json
{
  "id": "664f1b2c8e4a2b001c8ddef1",
  "departmentName": "Engineering",
  "departmentDescription": "Handles all engineering work",
  "departmentCode": "DEPT847291",
  "departmentHead": "664f1b2c8e4a2b001c8d1234",
  "departmentEmployees": ["664f1b2c8e4a2b001c8d0001"],
  "departmentTeams": ["664f1b2c8e4a2b001c8dabc1"],
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

### Response `404`
```json
{
  "code": 404,
  "message": "Department not found"
}
```

---

## Update Department

**PATCH** `/v1/departments/:departmentId`

All fields are optional. At least one field must be provided.

### Request Body
```json
{
  "departmentName": "Product Engineering",
  "departmentHead": "664f1b2c8e4a2b001c8d9999"
}
```

| Field                   | Type         | Description                    |
|-------------------------|--------------|--------------------------------|
| `departmentName`        | `string`     | Updated department name        |
| `departmentDescription` | `string`     | Updated description            |
| `departmentCode`        | `string`     | Updated department code        |
| `departmentHead`        | `ObjectId`   | Updated department head        |
| `departmentEmployees`   | `ObjectId[]` | Updated list of employee IDs   |
| `departmentTeams`       | `ObjectId[]` | Updated list of team IDs       |

### Response `200`
Returns the updated department object (same shape as Get Department by ID).

### Response `404`
```json
{
  "code": 404,
  "message": "Department not found"
}
```

---

## Delete Department

**DELETE** `/v1/departments/:departmentId`

### Path Parameter

| Param          | Type       | Description              |
|----------------|------------|--------------------------|
| `departmentId` | `ObjectId` | MongoDB ID of department |

### Response `204`
No content.

### Response `404`
```json
{
  "code": 404,
  "message": "Department not found"
}
```

---

## Add Member to Department

**POST** `/v1/departments/:departmentId/members`

Adds a user to the department's `departmentEmployees` array and sets `workInformation.department` on the user document.

### Path Parameter

| Param          | Type       | Description              |
|----------------|------------|--------------------------|
| `departmentId` | `ObjectId` | MongoDB ID of department |

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
Returns the updated department object with the new member in `departmentEmployees`.

### Response `400` — already a member
```json
{
  "code": 400,
  "message": "User is already a member of this department"
}
```

### Response `404`
```json
{
  "code": 404,
  "message": "Department not found"
}
```

---

## Add Team to Department

**POST** `/v1/departments/:departmentId/teams`

Adds a team to the department's `departmentTeams` array and sets `department` on the team document.

### Path Parameter

| Param          | Type       | Description              |
|----------------|------------|--------------------------|
| `departmentId` | `ObjectId` | MongoDB ID of department |

### Request Body
```json
{
  "teamId": "664f1b2c8e4a2b001c8dabc1"
}
```

| Field    | Type       | Required | Description                   |
|----------|------------|----------|-------------------------------|
| `teamId` | `ObjectId` | yes      | MongoDB ID of the team to add |

### Response `200`
Returns the updated department object with the new team in `departmentTeams`.

### Response `400` — team already in department
```json
{
  "code": 400,
  "message": "Team is already in this department"
}
```

### Response `404`
```json
{
  "code": 404,
  "message": "Department not found"
}
```

---

## Instructions

### Creating a department (recommended flow)

1. Call `GET /v1/departments/generate-id` to get a unique `departmentCode`.
2. Copy the returned `departmentCode` into your create payload.
3. Call `POST /v1/departments` with the full payload.

### departmentCode format

Codes are auto-generated as `DEPT` followed by a 6-digit number, e.g. `DEPT847291`.

### Adding members

`POST /v1/departments/:departmentId/members` handles both sides:
- Pushes `userId` into `departmentEmployees`
- Sets `workInformation.department` on the user

### Adding teams

`POST /v1/departments/:departmentId/teams` handles both sides:
- Pushes `teamId` into `departmentTeams`
- Sets `department` on the team document

### Pagination

Supports `page`, `limit`, and `sortBy` query params. Default page size is `10`. Format: `sortBy=createdAt:desc`.
