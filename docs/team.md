# Team API

Base URL: `/v1`

All endpoints require a Bearer token in the `Authorization` header unless stated otherwise.

---

## Schema

| Field            | Type       | Required | Description                        |
|------------------|------------|----------|------------------------------------|
| `teamName`       | String     | Yes      | Name of the team                   |
| `teamDescription`| String     | Yes      | Description of the team            |
| `teamCode`       | String     | Yes      | Unique code identifier for the team|
| `teamLead`       | ObjectId   | Yes      | Reference to a User (team lead)    |
| `teamEmployees`  | ObjectId[] | No       | Array of User references           |
| `createdAt`      | Date       | Auto     | Timestamp of creation              |
| `updatedAt`      | Date       | Auto     | Timestamp of last update           |

---

## Endpoints

### Create Team

```
POST /v1/teams
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "teamName": "Frontend Team",
  "teamDescription": "Handles all UI/UX development",
  "teamCode": "FE-001",
  "teamLead": "664f1b2c3e4a5b6c7d8e9f00",
  "teamEmployees": [
    "664f1b2c3e4a5b6c7d8e9f01",
    "664f1b2c3e4a5b6c7d8e9f02"
  ]
}
```

**Response `201`:**
```json
{
  "id": "664f1b2c3e4a5b6c7d8e9f10",
  "teamName": "Frontend Team",
  "teamDescription": "Handles all UI/UX development",
  "teamCode": "FE-001",
  "teamLead": "664f1b2c3e4a5b6c7d8e9f00",
  "teamEmployees": [
    "664f1b2c3e4a5b6c7d8e9f01",
    "664f1b2c3e4a5b6c7d8e9f02"
  ],
  "createdAt": "2024-05-13T10:00:00.000Z",
  "updatedAt": "2024-05-13T10:00:00.000Z"
}
```

---

### Get All Teams

```
GET /v1/teams
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Param    | Type    | Description                              |
|----------|---------|------------------------------------------|
| `sortBy` | String  | Sort field and order e.g. `teamName:asc` |
| `limit`  | Number  | Max results per page (default: 10)       |
| `page`   | Number  | Page number (default: 1)                 |

**Response `200`:**
```json
{
  "results": [
    {
      "id": "664f1b2c3e4a5b6c7d8e9f10",
      "teamName": "Frontend Team",
      "teamDescription": "Handles all UI/UX development",
      "teamCode": "FE-001",
      "teamLead": "664f1b2c3e4a5b6c7d8e9f00",
      "teamEmployees": []
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

### Get Team by ID

```
GET /v1/teams/:teamId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "id": "664f1b2c3e4a5b6c7d8e9f10",
  "teamName": "Frontend Team",
  "teamDescription": "Handles all UI/UX development",
  "teamCode": "FE-001",
  "teamLead": "664f1b2c3e4a5b6c7d8e9f00",
  "teamEmployees": [
    "664f1b2c3e4a5b6c7d8e9f01"
  ],
  "createdAt": "2024-05-13T10:00:00.000Z",
  "updatedAt": "2024-05-13T10:00:00.000Z"
}
```

---

### Update Team

```
PATCH /v1/teams/:teamId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body** (all fields optional):
```json
{
  "teamName": "Frontend & Mobile Team",
  "teamDescription": "Handles UI/UX and mobile development",
  "teamLead": "664f1b2c3e4a5b6c7d8e9f03",
  "teamEmployees": [
    "664f1b2c3e4a5b6c7d8e9f01",
    "664f1b2c3e4a5b6c7d8e9f04"
  ]
}
```

**Response `200`:** Updated team object.

---

### Delete Team

```
DELETE /v1/teams/:teamId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response `200`:** No content.

---

## Error Responses

| Code | Description                        |
|------|------------------------------------|
| 400  | Validation error / bad request     |
| 401  | Unauthorized – invalid/missing token |
| 403  | Forbidden – insufficient permissions |
| 404  | Team not found                     |
