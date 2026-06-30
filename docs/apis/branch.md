# Branch API

Base URL: `/v1/branches`

---

## Generate Branch ID

Generates a unique `branchNumber` that does not already exist in the database. Returns the same code on repeated calls until it has been saved to the DB.

**GET** `/v1/branches/generate-id`

### Request
No payload required.

### Response `200`
```json
{
  "branchNumber": "BRN847291"
}
```

---

## Create Branch

**POST** `/v1/branches`

### Request Body

#### Basic Details
| Field               | Type     | Required | Description                          |
|---------------------|----------|----------|--------------------------------------|
| `branchName`        | `string` | yes      | Name of the branch                   |
| `branchNumber`      | `string` | yes      | Unique branch code (use generate-id) |
| `branchType`        | `string` | no       | Type of branch                       |
| `branchStatus`      | `string` | no       | `active` or `inactive` (default: `active`) |
| `effectiveFromDate` | `date`   | no       | Date the branch becomes effective    |

#### Contact Details
| Field                    | Type       | Required | Description                  |
|--------------------------|------------|----------|------------------------------|
| `branchHead`             | `ObjectId` | no       | User ID of the branch head   |
| `phoneNumber`            | `string`   | no       | Primary phone number         |
| `emergencyContactNumber` | `string`   | no       | Emergency contact number     |
| `email`                  | `string`   | no       | Branch email address         |

#### Address
| Field         | Type     | Required | Description          |
|---------------|----------|----------|----------------------|
| `address`     | `string` | no       | Street address       |
| `city`        | `string` | no       | City                 |
| `district`    | `string` | no       | District             |
| `state`       | `string` | no       | State                |
| `pinCode`     | `string` | no       | Pin code             |
| `geoLocation` | `string` | no       | Geo location link    |

#### Other Details
| Field         | Type         | Required | Description                    |
|---------------|--------------|----------|--------------------------------|
| `departments` | `ObjectId[]` | no       | List of department IDs         |
| `shifts`      | `ObjectId[]` | no       | List of shift IDs              |

```json
{
  "branchName": "Headquarters",
  "branchNumber": "BRN847291",
  "branchType": "Head Office",
  "branchStatus": "active",
  "effectiveFromDate": "2024-01-01",
  "branchHead": "664f1b2c8e4a2b001c8d1234",
  "phoneNumber": "9876543210",
  "emergencyContactNumber": "9876500000",
  "email": "hq@company.com",
  "address": "123 Main Street",
  "city": "Mumbai",
  "district": "Mumbai Suburban",
  "state": "Maharashtra",
  "pinCode": "400001",
  "geoLocation": "https://maps.google.com/?q=...",
  "departments": ["664f1b2c8e4a2b001c8ddef1"],
  "shifts": ["664f1b2c8e4a2b001c8dsh01"]
}
```

### Response `201`
```json
{
  "id": "664f1b2c8e4a2b001c8dff01",
  "branchName": "Headquarters",
  "branchNumber": "BRN847291",
  "branchType": "Head Office",
  "branchStatus": "active",
  "effectiveFromDate": "2024-01-01T00:00:00.000Z",
  "branchHead": "664f1b2c8e4a2b001c8d1234",
  "phoneNumber": "9876543210",
  "emergencyContactNumber": "9876500000",
  "email": "hq@company.com",
  "address": "123 Main Street",
  "city": "Mumbai",
  "district": "Mumbai Suburban",
  "state": "Maharashtra",
  "pinCode": "400001",
  "geoLocation": "https://maps.google.com/?q=...",
  "departments": ["664f1b2c8e4a2b001c8ddef1"],
  "shifts": ["664f1b2c8e4a2b001c8dsh01"],
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All Branches

**GET** `/v1/branches`

### Query Parameters

| Param          | Type     | Description                                |
|----------------|----------|--------------------------------------------|
| `branchName`   | `string` | Filter by branch name                      |
| `branchNumber` | `string` | Filter by branch number                    |
| `branchStatus` | `string` | Filter by status (`active` / `inactive`)   |
| `branchType`   | `string` | Filter by branch type                      |
| `sortBy`       | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit`        | `number` | Results per page (default: 10)             |
| `page`         | `number` | Page number (default: 1)                   |

### Response `200`
```json
{
  "results": [...],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

## Get Branch by ID

**GET** `/v1/branches/:branchId`

### Response `200`
Returns the full branch object.

### Response `404`
```json
{ "code": 404, "message": "Branch not found" }
```

---

## Update Branch

**PATCH** `/v1/branches/:branchId`

All fields optional, at least one required. Same field set as Create.

### Response `200`
Returns the updated branch object.

### Response `404`
```json
{ "code": 404, "message": "Branch not found" }
```

---

## Delete Branch

**DELETE** `/v1/branches/:branchId`

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Branch not found" }
```

---

## Instructions

### Creating a branch (recommended flow)

1. Call `GET /v1/branches/generate-id` to get a unique `branchNumber`.
2. Use the returned `branchNumber` in your create payload.
3. Call `POST /v1/branches` with the full payload.

### branchNumber format

Auto-generated as `BRN` followed by a 6-digit number, e.g. `BRN847291`. Calling `generate-id` multiple times before saving returns the same code — a new one is only issued after the previous one is saved to the DB.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=createdAt:desc`.
