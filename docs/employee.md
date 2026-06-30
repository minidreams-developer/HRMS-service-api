# Employee API

Base URL: `/v1`

All endpoints require a Bearer token in the `Authorization` header unless stated otherwise.

---

## Schema

### User (Top-level)

| Field                | Type     | Required | Description                                      |
|----------------------|----------|----------|--------------------------------------------------|
| `name`               | String   | Yes      | Full name                                        |
| `email`              | String   | Yes      | Unique email address                             |
| `password`           | String   | Yes      | Min 8 chars, at least one letter and one number  |
| `role`               | String   | Yes      | `user`, `admin`, etc.                            |
| `phone`              | Number   | No       | Contact number                                   |
| `gender`             | String   | No       | Gender                                           |
| `age`                | Number   | No       | Age                                              |
| `profilePic`         | String   | No       | URL of profile picture                           |
| `martialStatus`      | String   | No       | Marital status                                   |
| `motherTongue`       | String   | No       | Mother tongue                                    |
| `identificationMark` | String   | No       | Identification mark                              |
| `isEmailVerified`    | Boolean  | Auto     | Whether email is verified (default: `false`)     |
| `createdAt`          | Date     | Auto     | Timestamp of creation                            |
| `updatedAt`          | Date     | Auto     | Timestamp of last update                         |

### Employee (Nested under `employee`)

| Field                                          | Type       | Required | Description                                        |
|------------------------------------------------|------------|----------|----------------------------------------------------|
| `employee.employeeId`                          | String     | Yes      | Unique employee ID (auto-generated)                |
| `employee.designation`                         | String     | Yes      | Job designation/title                              |
| `employee.department`                          | ObjectId   | Yes      | Reference to Department                            |
| `employee.shift`                               | String     | Yes      | Shift timing                                       |
| `employee.employeeStatus`                      | String     | No       | `active`, `inactive`, `relieved` (default: `active`) |
| `employee.employeeType`                        | String     | No       | `full_time` or `part_time` (default: `full_time`)  |
| `employee.employeeDocuments`                   | Array      | No       | Array of `{ fileUrl, fileType }`                   |
| `employee.workInformation.joinedDate`          | Date       | Yes      | Date of joining                                    |
| `employee.workInformation.experienceType`      | String     | No       | Type of experience                                 |
| `employee.workInformation.department`          | ObjectId   | Yes      | Reference to Department                            |
| `employee.workInformation.registrationStatus.personalInformation` | Boolean | No | Personal info filled (default: `false`) |
| `employee.workInformation.registrationStatus.documents`           | Boolean | No | Documents uploaded (default: `false`)   |

---

## Endpoints

### Generate Employee ID

```
GET /v1/users/generate-employeeId
```

Generates a unique employee ID before creating an employee.

**Response `200`:**
```json
{
  "employeeId": "EMP-0042"
}
```

---

### Create Employee

```
POST /v1/users
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@company.com",
  "password": "Password1",
  "role": "user",
  "phone": 9876543210,
  "gender": "male",
  "age": 28,
  "employee": {
    "employeeId": "EMP-0042",
    "designation": "Software Engineer",
    "department": "664f1b2c3e4a5b6c7d8e9f30",
    "shift": "Morning",
    "employeeStatus": "active",
    "employeeType": "full_time",
    "employeeDocuments": [
      {
        "fileUrl": "https://storage.example.com/docs/aadhar.pdf",
        "fileType": "aadhar"
      }
    ],
    "workInformation": {
      "joinedDate": "2024-01-15",
      "experienceType": "experienced",
      "department": "664f1b2c3e4a5b6c7d8e9f30",
      "registrationStatus": {
        "personalInformation": false,
        "documents": false
      }
    }
  }
}
```

**Response `201`:**
```json
{
  "id": "664f1b2c3e4a5b6c7d8e9f50",
  "name": "John Doe",
  "email": "john.doe@company.com",
  "role": "user",
  "phone": 9876543210,
  "gender": "male",
  "age": 28,
  "isEmailVerified": false,
  "employee": {
    "employeeId": "EMP-0042",
    "designation": "Software Engineer",
    "department": "664f1b2c3e4a5b6c7d8e9f30",
    "shift": "Morning",
    "employeeStatus": "active",
    "employeeType": "full_time"
  },
  "createdAt": "2024-05-13T10:00:00.000Z",
  "updatedAt": "2024-05-13T10:00:00.000Z"
}
```

---

### Get All Employees

```
GET /v1/users
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Param    | Type    | Description                              |
|----------|---------|------------------------------------------|
| `name`   | String  | Filter by name                           |
| `role`   | String  | Filter by role                           |
| `sortBy` | String  | Sort field and order e.g. `name:asc`     |
| `limit`  | Number  | Max results per page (default: 10)       |
| `page`   | Number  | Page number (default: 1)                 |

**Response `200`:**
```json
{
  "results": [
    {
      "id": "664f1b2c3e4a5b6c7d8e9f50",
      "name": "John Doe",
      "email": "john.doe@company.com",
      "role": "user",
      "phone": 9876543210,
      "isEmailVerified": false,
      "employee": {
        "employeeId": "EMP-0042",
        "designation": "Software Engineer",
        "employeeStatus": "active"
      }
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

### Get Employee by ID

```
GET /v1/users/:userId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response `200`:** Full employee object (same structure as create response).

---

### Update Employee

```
PATCH /v1/users/:userId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body** (all fields optional):
```json
{
  "name": "John Smith",
  "phone": 9123456789,
  "age": 29,
  "martialStatus": "married",
  "employee": {
    "designation": "Senior Software Engineer",
    "employeeStatus": "active",
    "employeeType": "full_time",
    "workInformation": {
      "registrationStatus": {
        "personalInformation": true,
        "documents": true
      }
    }
  }
}
```

**Response `200`:** Updated employee object.

---

### Delete Employee

```
DELETE /v1/users/:userId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response `200`:** No content.

---

## Employee Status Values

| Value      | Description                    |
|------------|--------------------------------|
| `active`   | Currently employed             |
| `inactive` | Temporarily inactive           |
| `relieved` | No longer with the organization|

## Employee Type Values

| Value       | Description       |
|-------------|-------------------|
| `full_time`  | Full-time employee |
| `part_time`  | Part-time employee |

---

## Error Responses

| Code | Description                          |
|------|--------------------------------------|
| 400  | Validation error / duplicate email   |
| 401  | Unauthorized – invalid/missing token |
| 403  | Forbidden – insufficient permissions |
| 404  | Employee not found                   |
