# Organization API

Base URL: `/v1/organizations`

---

## Create Organization

**POST** `/v1/organizations`

### Request Body

```json
{
  "companyName": "Acme Corp",
  "organizationLogo": "https://cdn.example.com/logo.png",
  "gst": "27AAPFU0939F1ZV",
  "pan": "AAPFU0939F",
  "tan": "PNEA00523G",
  "email": "contact@acmecorp.com",
  "phone": "9876543210",
  "address": "64b1f2c9e4b0a1a2b3c4d5e6",
  "owner": "64b1f2c9e4b0a1a2b3c4d5e7"
}
```

| Field             | Type     | Required | Description                         |
| ----------------- | -------- | -------- | ----------------------------------- |
| companyName       | string   | Yes      | Legal name of the organization      |
| organizationLogo  | string   | No       | URL of the organization logo        |
| gst               | string   | No       | GST number                          |
| pan               | string   | No       | PAN number                          |
| tan               | string   | No       | TAN number                          |
| email             | string   | No       | Official contact email              |
| phone             | string   | No       | Official contact phone              |
| address           | ObjectId | No       | Reference to an Address document    |
| owner             | ObjectId | No       | Reference to the owner User         |

### Response `201 Created`

```json
{
  "id": "64c3e1a2b3c4d5e6f7a8b9c0",
  "companyName": "Acme Corp",
  "organizationLogo": "https://cdn.example.com/logo.png",
  "gst": "27AAPFU0939F1ZV",
  "pan": "AAPFU0939F",
  "tan": "PNEA00523G",
  "email": "contact@acmecorp.com",
  "phone": "9876543210",
  "address": "64b1f2c9e4b0a1a2b3c4d5e6",
  "owner": "64b1f2c9e4b0a1a2b3c4d5e7",
  "createdAt": "2024-07-06T10:00:00.000Z",
  "updatedAt": "2024-07-06T10:00:00.000Z"
}
```

---

## Get All Organizations

**GET** `/v1/organizations`

### Query Parameters

| Parameter   | Type    | Description                              |
| ----------- | ------- | ---------------------------------------- |
| companyName | string  | Filter by company name                   |
| email       | string  | Filter by email                          |
| phone       | string  | Filter by phone                          |
| sortBy      | string  | Sort field and order e.g. `createdAt:desc` |
| limit       | number  | Number of results per page (default: 10) |
| page        | number  | Page number (default: 1)                 |

### Response `200 OK`

```json
{
  "results": [
    {
      "id": "64c3e1a2b3c4d5e6f7a8b9c0",
      "companyName": "Acme Corp",
      "organizationLogo": "https://cdn.example.com/logo.png",
      "gst": "27AAPFU0939F1ZV",
      "pan": "AAPFU0939F",
      "tan": "PNEA00523G",
      "email": "contact@acmecorp.com",
      "phone": "9876543210",
      "address": {
        "id": "64b1f2c9e4b0a1a2b3c4d5e6",
        "addressLine1": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": 400001
      },
      "owner": {
        "id": "64b1f2c9e4b0a1a2b3c4d5e7",
        "name": "John Doe"
      },
      "createdAt": "2024-07-06T10:00:00.000Z",
      "updatedAt": "2024-07-06T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 1
}
```

---

## Get Organization by ID

**GET** `/v1/organizations/:organizationId`

### Path Parameters

| Parameter      | Type     | Required | Description          |
| -------------- | -------- | -------- | -------------------- |
| organizationId | ObjectId | Yes      | Organization's mongo ID |

### Response `200 OK`

```json
{
  "id": "64c3e1a2b3c4d5e6f7a8b9c0",
  "companyName": "Acme Corp",
  "organizationLogo": "https://cdn.example.com/logo.png",
  "gst": "27AAPFU0939F1ZV",
  "pan": "AAPFU0939F",
  "tan": "PNEA00523G",
  "email": "contact@acmecorp.com",
  "phone": "9876543210",
  "address": {
    "id": "64b1f2c9e4b0a1a2b3c4d5e6",
    "addressLine1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": 400001
  },
  "owner": {
    "id": "64b1f2c9e4b0a1a2b3c4d5e7",
    "name": "John Doe"
  },
  "createdAt": "2024-07-06T10:00:00.000Z",
  "updatedAt": "2024-07-06T10:00:00.000Z"
}
```

### Error `404 Not Found`

```json
{
  "code": 404,
  "message": "Organization not found"
}
```

---

## Update Organization

**PATCH** `/v1/organizations/:organizationId`

### Path Parameters

| Parameter      | Type     | Required | Description          |
| -------------- | -------- | -------- | -------------------- |
| organizationId | ObjectId | Yes      | Organization's mongo ID |

### Request Body

Send only the fields to update (at least one field required).

```json
{
  "companyName": "Acme Corp Ltd",
  "phone": "9123456789",
  "email": "hello@acmecorp.com"
}
```

### Response `200 OK`

Returns the updated organization object (same shape as Get by ID response).

### Error `404 Not Found`

```json
{
  "code": 404,
  "message": "Organization not found"
}
```

---

## Delete Organization

**DELETE** `/v1/organizations/:organizationId`

### Path Parameters

| Parameter      | Type     | Required | Description          |
| -------------- | -------- | -------- | -------------------- |
| organizationId | ObjectId | Yes      | Organization's mongo ID |

### Response `204 No Content`

Empty body on success.

### Error `404 Not Found`

```json
{
  "code": 404,
  "message": "Organization not found"
}
```
