# Branch API

Base URL: `/v1`

All endpoints require a Bearer token in the `Authorization` header unless stated otherwise.

---

## Schema

| Field          | Type     | Required | Description                              |
|----------------|----------|----------|------------------------------------------|
| `branchName`   | String   | No       | Name of the branch                       |
| `branchHead`   | ObjectId | No       | Reference to a User (branch head)        |
| `branchNumber` | String   | No       | Unique branch number/code                |
| `activeStatus` | String   | No       | `active` or `inactive` (default: `active`) |
| `createdAt`    | Date     | Auto     | Timestamp of creation                    |
| `updatedAt`    | Date     | Auto     | Timestamp of last update                 |

---

## Endpoints

### Create Branch

```
POST /v1/branches
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "branchName": "Headquarters",
  "branchHead": "664f1b2c3e4a5b6c7d8e9f00",
  "branchNumber": "BR-001",
  "activeStatus": "active"
}
```

**Response `201`:**
```json
{
  "id": "664f1b2c3e4a5b6c7d8e9f20",
  "branchName": "Headquarters",
  "branchHead": "664f1b2c3e4a5b6c7d8e9f00",
  "branchNumber": "BR-001",
  "activeStatus": "active",
  "createdAt": "2024-05-13T10:00:00.000Z",
  "updatedAt": "2024-05-13T10:00:00.000Z"
}
```

---

### Get All Branches

```
GET /v1/branches
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Param          | Type    | Description                                  |
|----------------|---------|----------------------------------------------|
| `branchName`   | String  | Filter by branch name                        |
| `activeStatus` | String  | Filter by status: `active` or `inactive`     |
| `sortBy`       | String  | Sort field and order e.g. `branchName:asc`   |
| `limit`        | Number  | Max results per page (default: 10)           |
| `page`         | Number  | Page number (default: 1)                     |

**Response `200`:**
```json
{
  "results": [
    {
      "id": "664f1b2c3e4a5b6c7d8e9f20",
      "branchName": "Headquarters",
      "branchHead": "664f1b2c3e4a5b6c7d8e9f00",
      "branchNumber": "BR-001",
      "activeStatus": "active"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

### Get Branch by ID

```
GET /v1/branches/:branchId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "id": "664f1b2c3e4a5b6c7d8e9f20",
  "branchName": "Headquarters",
  "branchHead": "664f1b2c3e4a5b6c7d8e9f00",
  "branchNumber": "BR-001",
  "activeStatus": "active",
  "createdAt": "2024-05-13T10:00:00.000Z",
  "updatedAt": "2024-05-13T10:00:00.000Z"
}
```

---

### Update Branch

```
PATCH /v1/branches/:branchId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body** (all fields optional):
```json
{
  "branchName": "Regional Office",
  "branchHead": "664f1b2c3e4a5b6c7d8e9f05",
  "activeStatus": "inactive"
}
```

**Response `200`:** Updated branch object.

---

### Delete Branch

```
DELETE /v1/branches/:branchId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response `200`:** No content.

---

## Error Responses

| Code | Description                          |
|------|--------------------------------------|
| 400  | Validation error / bad request       |
| 401  | Unauthorized – invalid/missing token |
| 403  | Forbidden – insufficient permissions |
| 404  | Branch not found                     |
