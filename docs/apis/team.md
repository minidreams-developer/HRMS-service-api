# Team API

Base URL: `/v1/teams`

---

## Generate Team ID

Generates a unique `teamCode` that does not already exist in the database. Use this before creating a team to pre-fill the `teamCode` field.

**GET** `/v1/teams/generate-id`

### Request
No payload required.

### Response `200`
```json
{
  "teamCode": "TEAM847291"
}
```

---

## Create Team

**POST** `/v1/teams`

### Request Body
```json
{
  "teamName": "Backend Squad",
  "teamDescription": "Handles all backend services",
  "teamCode": "TEAM847291",
  "teamLead": "664f1b2c8e4a2b001c8d1234",
  "department": "664f1b2c8e4a2b001c8d5678",
  "teamEmployees": [
    "664f1b2c8e4a2b001c8d0001",
    "664f1b2c8e4a2b001c8d0002"
  ]
}
```

| Field             | Type       | Required | Description                          |
|-------------------|------------|----------|--------------------------------------|
| `teamName`        | `string`   | yes      | Name of the team                     |
| `teamDescription` | `string`   | yes      | Short description of the team        |
| `teamCode`        | `string`   | yes      | Unique team code (use generate-id)   |
| `teamLead`        | `ObjectId` | yes      | User ID of the team lead             |
| `department`      | `ObjectId` | no       | Department this team belongs to      |
| `teamEmployees`   | `ObjectId[]`| no      | List of employee user IDs            |

### Response `201`
```json
{
  "id": "664f1b2c8e4a2b001c8dabc1",
  "teamName": "Backend Squad",
  "teamDescription": "Handles all backend services",
  "teamCode": "TEAM847291",
  "teamLead": "664f1b2c8e4a2b001c8d1234",
  "department": "664f1b2c8e4a2b001c8d5678",
  "teamEmployees": [
    "664f1b2c8e4a2b001c8d0001",
    "664f1b2c8e4a2b001c8d0002"
  ],
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All Teams

**GET** `/v1/teams`

### Query Parameters

| Param      | Type      | Description                              |
|------------|-----------|------------------------------------------|
| `teamName` | `string`  | Filter by team name                      |
| `teamCode` | `string`  | Filter by team code                      |
| `teamLead` | `string`  | Filter by team lead user ID              |
| `sortBy`   | `string`  | Sort field and order e.g. `createdAt:desc` |
| `limit`    | `number`  | Results per page (default: 10)           |
| `page`     | `number`  | Page number (default: 1)                 |

### Response `200`
```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dabc1",
      "teamName": "Backend Squad",
      "teamCode": "TEAM847291",
      "teamLead": "664f1b2c8e4a2b001c8d1234",
      "department": "664f1b2c8e4a2b001c8d5678",
      "teamEmployees": [],
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

## Get Team by ID

**GET** `/v1/teams/:teamId`

### Path Parameter

| Param    | Type       | Description         |
|----------|------------|---------------------|
| `teamId` | `ObjectId` | MongoDB ID of team  |

### Response `200`
```json
{
  "id": "664f1b2c8e4a2b001c8dabc1",
  "teamName": "Backend Squad",
  "teamDescription": "Handles all backend services",
  "teamCode": "TEAM847291",
  "teamLead": "664f1b2c8e4a2b001c8d1234",
  "department": "664f1b2c8e4a2b001c8d5678",
  "teamEmployees": [
    "664f1b2c8e4a2b001c8d0001"
  ],
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

### Response `404`
```json
{
  "code": 404,
  "message": "Team not found"
}
```

---

## Update Team

**PATCH** `/v1/teams/:teamId`

All fields are optional. At least one field must be provided.

### Request Body
```json
{
  "teamName": "Frontend Squad",
  "teamEmployees": [
    "664f1b2c8e4a2b001c8d0003"
  ]
}
```

| Field             | Type        | Description                        |
|-------------------|-------------|------------------------------------|
| `teamName`        | `string`    | Updated team name                  |
| `teamDescription` | `string`    | Updated description                |
| `teamCode`        | `string`    | Updated team code                  |
| `teamLead`        | `ObjectId`  | Updated team lead user ID          |
| `department`      | `ObjectId`  | Updated department ID              |
| `teamEmployees`   | `ObjectId[]`| Updated list of employee user IDs  |

### Response `200`
Returns the updated team object (same shape as Get Team by ID).

### Response `404`
```json
{
  "code": 404,
  "message": "Team not found"
}
```

---

## Delete Team

**DELETE** `/v1/teams/:teamId`

### Path Parameter

| Param    | Type       | Description        |
|----------|------------|--------------------|
| `teamId` | `ObjectId` | MongoDB ID of team |

### Response `204`
No content.

### Response `404`
```json
{
  "code": 404,
  "message": "Team not found"
}
```

---

## Add Member to Team

**POST** `/v1/teams/:teamId/members`

Adds a user to the team's `teamEmployees` array and simultaneously sets `workInformation.team` on the user document. Both sides are updated atomically in the same request.

### Path Parameter

| Param    | Type       | Description        |
|----------|------------|--------------------|
| `teamId` | `ObjectId` | MongoDB ID of team |

### Request Body
```json
{
  "userId": "664f1b2c8e4a2b001c8d0001"
}
```

| Field    | Type       | Required | Description                  |
|----------|------------|----------|------------------------------|
| `userId` | `ObjectId` | yes      | MongoDB ID of the user to add |

### Response `200`
Returns the updated team object with the new member included in `teamEmployees`.

```json
{
  "id": "664f1b2c8e4a2b001c8dabc1",
  "teamName": "Backend Squad",
  "teamCode": "TEAM847291",
  "teamLead": "664f1b2c8e4a2b001c8d1234",
  "department": "664f1b2c8e4a2b001c8d5678",
  "teamEmployees": [
    "664f1b2c8e4a2b001c8d0001"
  ],
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:05:00.000Z"
}
```

### Response `400` — already a member
```json
{
  "code": 400,
  "message": "User is already a member of this team"
}
```

### Response `404` — team or user not found
```json
{
  "code": 404,
  "message": "Team not found"
}
```

---

## Instructions

### Creating a team (recommended flow)

1. Call `GET /v1/teams/generate-id` to get a unique `teamCode`.
2. Copy the returned `teamCode` into your create payload.
3. Call `POST /v1/teams` with the full payload including the generated `teamCode`.

This ensures the code is always unique and avoids manual collision handling.

### teamCode format

Codes are auto-generated in the format `TEAM` followed by a 6-digit number, e.g. `TEAM847291`. You can also supply your own custom code as long as it doesn't already exist in the database.

### Pagination

All list endpoints support `page` and `limit` query params. Default page size is `10`. Use `sortBy` in the format `field:asc` or `field:desc`, e.g. `sortBy=createdAt:desc`.

### Adding members

Use `POST /v1/teams/:teamId/members` to add a user to a team. This single call handles both sides of the relationship:
- Pushes the `userId` into the team's `teamEmployees` array
- Sets `workInformation.team` on the user document to the `teamId`

If the user is already in the team a `400` is returned. If either the team or user doesn't exist a `404` is returned.
