# User API

Base URL: `/v1/users`

---

## Generate Employee ID

Generates a unique `employeeId` that does not already exist in the database. Returns the same ID on repeated calls until it has been used in a registration.

**GET** `/v1/users/generate-employeeId`

### Response `200`

```json
{
  "employeeId": "EMP847291"
}
```

---

## Register Employee

**POST** `/v1/users/employee-registration`

Full employee onboarding in a single call. All fields are optional — pass only what you have. Sub-documents (addresses, emergencyContacts, salaryDetails, bankDetails) are created automatically and their IDs are stored on the user.

See [employee-registration.md](./employee-registration.md) for the complete payload reference.

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8d0001",
  "employeeId": "EMP847291",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "employee",
  "approvalStatus": "pending",
  "isActive": true,
  "isProfileCompleted": false,
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

### Response `400` — duplicate email
```json
{ "code": 400, "message": "Email already taken" }
```

---

## Create User

**POST** `/v1/users`

Creates a minimal user account (admin use).

### Request Body

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password1",
  "role": "admin"
}
```

| Field      | Type     | Required | Description                                     |
|------------|----------|----------|-------------------------------------------------|
| `name`     | `string` | yes      | Full name                                       |
| `email`    | `string` | yes      | Unique email address                            |
| `password` | `string` | yes      | Min 8 chars, must contain a letter and a number |
| `role`     | `string` | yes      | `user` or `admin`                               |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8d0002",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "admin",
  "isEmailVerified": false,
  "isActive": true,
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

### Response `400` — duplicate email
```json
{ "code": 400, "message": "Email already taken" }
```

---

## Get All Users

**GET** `/v1/users`

### Query Parameters

| Param    | Type     | Description                                |
|----------|----------|--------------------------------------------|
| `name`   | `string` | Filter by name                             |
| `role`   | `string` | Filter by role                             |
| `sortBy` | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit`  | `number` | Results per page (default: 10)             |
| `page`   | `number` | Page number (default: 1)                   |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8d0001",
      "name": "John Doe",
      "email": "john@example.com",
      "employeeId": "EMP847291",
      "role": "employee",
      "phone": 9876543210,
      "gender": "male",
      "approvalStatus": "pending",
      "isActive": true,
      "isProfileCompleted": false,
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

## Get User by ID

**GET** `/v1/users/:userId`

### Path Parameter

| Param    | Type       | Description         |
|----------|------------|---------------------|
| `userId` | `ObjectId` | MongoDB ID of user  |

### Response `200`

```json
{
  "id": "664f1b2c8e4a2b001c8d0001",
  "name": "John Doe",
  "email": "john@example.com",
  "employeeId": "EMP847291",
  "role": "employee",
  "phone": 9876543210,
  "gender": "male",
  "dateOfBirth": "1995-06-15T00:00:00.000Z",
  "age": 29,
  "spokenLanguages": ["English", "Tamil"],
  "martialStatus": "unMarried",
  "motherTongue": "Tamil",
  "identificationMark": "Mole on left cheek",
  "religion": "Hindu",
  "profilePic": "https://cdn.example.com/pic.jpg",
  "documentNo": {
    "aadharNo": 123456789012,
    "panNo": "ABCDE1234F"
  },
  "address": ["664f1b2c8e4a2b001c8dadr1"],
  "emergencyContact": ["664f1b2c8e4a2b001c8dec01"],
  "userDocuments": [],
  "employeeProfileStatus": {
    "personalInformation": false,
    "DocumentUploads": false,
    "workDetails": false
  },
  "workInformation": {
    "joinedDate": "2024-01-15T00:00:00.000Z",
    "experienceType": "Experienced",
    "department": "664f1b2c8e4a2b001c8ddef1",
    "team": "664f1b2c8e4a2b001c8dabc1",
    "branch": "664f1b2c8e4a2b001c8dff01",
    "reportingPerson": "664f1b2c8e4a2b001c8d5678",
    "AttendanceType": "Biometric",
    "shiftId": "664f1b2c8e4a2b001c8dsh01",
    "bankDetails": ["664f1b2c8e4a2b001c8dbd01"],
    "SalaryDetails": "664f1b2c8e4a2b001c8dsd01",
    "designation": "Software Engineer"
  },
  "approvalStatus": "pending",
  "isEmailVerified": false,
  "isProfileCompleted": false,
  "isActive": true,
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

### Response `404`
```json
{ "code": 404, "message": "User not found" }
```

---

## Update User

**PATCH** `/v1/users/:userId`

All fields optional, at least one required.

### Path Parameter

| Param    | Type       | Description        |
|----------|------------|--------------------|
| `userId` | `ObjectId` | MongoDB ID of user |

### Request Body

```json
{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "phone": 9876500001,
  "gender": "male",
  "dateOfBirth": "1995-06-15",
  "age": 29,
  "spokenLanguages": ["English"],
  "martialStatus": "married",
  "motherTongue": "Tamil",
  "identificationMark": "Scar on right hand",
  "religion": "Hindu",
  "profilePic": "https://cdn.example.com/newpic.jpg",
  "documentNo": {
    "aadharNo": 123456789012,
    "panNo": "ABCDE1234F"
  },
  "workInformation": {
    "designation": "Senior Engineer",
    "department": "664f1b2c8e4a2b001c8ddef1",
    "shiftId": "664f1b2c8e4a2b001c8dsh01"
  },
  "approvalStatus": "approved",
  "isActive": true
}
```

| Field                | Type       | Description                                      |
|----------------------|------------|--------------------------------------------------|
| `name`               | `string`   | Updated full name                                |
| `email`              | `string`   | Updated email (must be unique)                   |
| `password`           | `string`   | Updated password                                 |
| `phone`              | `number`   | Updated phone number                             |
| `gender`             | `string`   | `male` or `female`                               |
| `dateOfBirth`        | `date`     | Date of birth                                    |
| `age`                | `number`   | Age                                              |
| `spokenLanguages`    | `string[]` | Languages spoken                                 |
| `martialStatus`      | `string`   | Marital status                                   |
| `motherTongue`       | `string`   | Mother tongue                                    |
| `identificationMark` | `string`   | Physical identification mark                     |
| `religion`           | `string`   | Religion                                         |
| `profilePic`         | `string`   | Profile picture URL                              |
| `documentNo`         | `object`   | `aadharNo`, `panNo`                              |
| `workInformation`    | `object`   | Work details (designation, department, etc.)     |
| `approvalStatus`     | `string`   | `pending` \| `approved` \| `rejected`            |
| `isActive`           | `boolean`  | Active status                                    |
| `firebaseToken`      | `string`   | Firebase push notification token                 |

### Response `200`
Returns the updated user object (same shape as Get User by ID).

### Response `400` — duplicate email
```json
{ "code": 400, "message": "Email already taken" }
```

### Response `404`
```json
{ "code": 404, "message": "User not found" }
```

---

## Delete User

**DELETE** `/v1/users/:userId`

### Path Parameter

| Param    | Type       | Description        |
|----------|------------|--------------------|
| `userId` | `ObjectId` | MongoDB ID of user |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "User not found" }
```

---

## Instructions

### approvalStatus values

| Value      | Description                              |
|------------|------------------------------------------|
| `pending`  | Default — awaiting HR approval           |
| `approved` | Employee approved and active             |
| `rejected` | Registration rejected                    |

### employeeId format

Auto-generated as `EMP` followed by a 6-digit number, e.g. `EMP847291`. Use `GET /v1/users/generate-employeeId` before registration to pre-fill the field.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=createdAt:desc`.
