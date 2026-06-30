# Work Experience API

Base URL: `/v1/work-experience`

Manages previous work experience records for employees.

---

## Create Work Experience

**POST** `/v1/work-experience`

### Request Body

```json
{
  "userId": "664f1b2c8e4a2b001c8d0001",
  "companyName": "Acme Corp",
  "jobTitle": "Software Engineer",
  "totalYearsOfExperience": 4,
  "lastCompanyExperience": 2,
  "relievedDate": "2023-12-31",
  "location": "Bangalore, India"
}
```

| Field                    | Type     | Required | Description                                    |
|--------------------------|----------|----------|------------------------------------------------|
| `userId`                 | `Mixed`  | no       | Reference to the employee (User ID)            |
| `companyName`            | `string` | no       | Name of the previous employer                  |
| `jobTitle`               | `string` | no       | Job title at the previous company              |
| `totalYearsOfExperience` | `number` | no       | Total years of professional experience         |
| `lastCompanyExperience`  | `number` | no       | Years spent at this specific company           |
| `relievedDate`           | `date`   | no       | Date of relieving from the previous company    |
| `location`               | `string` | no       | Location of the previous company               |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8dwe01",
  "userId": "664f1b2c8e4a2b001c8d0001",
  "companyName": "Acme Corp",
  "jobTitle": "Software Engineer",
  "totalYearsOfExperience": 4,
  "lastCompanyExperience": 2,
  "relievedDate": "2023-12-31T00:00:00.000Z",
  "location": "Bangalore, India",
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All Work Experiences

**GET** `/v1/work-experience`

### Query Parameters

| Param         | Type     | Description                                |
|---------------|----------|--------------------------------------------|
| `userId`      | `string` | Filter by employee ID                      |
| `companyName` | `string` | Filter by company name                     |
| `jobTitle`    | `string` | Filter by job title                        |
| `sortBy`      | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit`       | `number` | Results per page (default: 10)             |
| `page`        | `number` | Page number (default: 1)                   |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dwe01",
      "userId": "664f1b2c8e4a2b001c8d0001",
      "companyName": "Acme Corp",
      "jobTitle": "Software Engineer",
      "totalYearsOfExperience": 4,
      "lastCompanyExperience": 2,
      "relievedDate": "2023-12-31T00:00:00.000Z",
      "location": "Bangalore, India",
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

## Get Work Experience by ID

**GET** `/v1/work-experience/:workExperienceId`

### Path Parameter

| Param              | Type       | Description                      |
|--------------------|------------|----------------------------------|
| `workExperienceId` | `ObjectId` | MongoDB ID of work experience    |

### Response `200`
Returns the full work experience object (same shape as results array above).

### Response `404`
```json
{ "code": 404, "message": "WorkExperience not found" }
```

---

## Update Work Experience

**PATCH** `/v1/work-experience/:workExperienceId`

All fields optional, at least one required.

### Path Parameter

| Param              | Type       | Description                    |
|--------------------|------------|--------------------------------|
| `workExperienceId` | `ObjectId` | MongoDB ID of work experience  |

### Request Body

```json
{
  "jobTitle": "Senior Software Engineer",
  "totalYearsOfExperience": 5
}
```

### Response `200`
Returns the updated work experience object.

### Response `404`
```json
{ "code": 404, "message": "WorkExperience not found" }
```

---

## Delete Work Experience

**DELETE** `/v1/work-experience/:workExperienceId`

### Path Parameter

| Param              | Type       | Description                    |
|--------------------|------------|--------------------------------|
| `workExperienceId` | `ObjectId` | MongoDB ID of work experience  |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "WorkExperience not found" }
```

---

## Instructions

### Multiple records per employee

An employee can have multiple work experience records (one per previous employer). Query by `userId` to retrieve all records for a specific employee.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=relievedDate:desc`.
