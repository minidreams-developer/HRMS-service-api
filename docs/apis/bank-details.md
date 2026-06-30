# Bank Details API

Base URL: `/v1/bank-details`

> Note: Bank details are typically created automatically during employee registration via `POST /v1/users/employee-registration`. Use these endpoints to manage them independently.

---

## Create Bank Details

**POST** `/v1/bank-details`

### Request Body

```json
{
  "userId": "664f1b2c8e4a2b001c8d0001",
  "accountHolderName": "John Doe",
  "bankName": "HDFC Bank",
  "accountNumber": 1234567890,
  "ifscCode": "HDFC0001234",
  "branch": "Coimbatore Main",
  "esiAndPf": {
    "esiNumber": 1234567,
    "pfNumber": 7654321
  }
}
```

| Field               | Type     | Required | Description                    |
|---------------------|----------|----------|--------------------------------|
| `userId`            | `Mixed`  | no       | Reference to the employee      |
| `accountHolderName` | `string` | no       | Name on the bank account       |
| `bankName`          | `string` | no       | Name of the bank               |
| `accountNumber`     | `number` | no       | Bank account number            |
| `ifscCode`          | `string` | no       | IFSC code of the branch        |
| `branch`            | `string` | no       | Bank branch name               |
| `esiAndPf`          | `object` | no       | ESI and PF numbers (see below) |

#### esiAndPf

| Field       | Type     | Description       |
|-------------|----------|-------------------|
| `esiNumber` | `number` | ESI number        |
| `pfNumber`  | `number` | PF account number |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8dbd01",
  "userId": "664f1b2c8e4a2b001c8d0001",
  "accountHolderName": "John Doe",
  "bankName": "HDFC Bank",
  "accountNumber": 1234567890,
  "ifscCode": "HDFC0001234",
  "branch": "Coimbatore Main",
  "esiAndPf": {
    "esiNumber": 1234567,
    "pfNumber": 7654321
  },
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All Bank Details

**GET** `/v1/bank-details`

### Query Parameters

| Param           | Type     | Description                                |
|-----------------|----------|--------------------------------------------|
| `userId`        | `string` | Filter by employee ID                      |
| `bankName`      | `string` | Filter by bank name                        |
| `accountNumber` | `number` | Filter by account number                   |
| `sortBy`        | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit`         | `number` | Results per page (default: 10)             |
| `page`          | `number` | Page number (default: 1)                   |

### Response `200`

```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dbd01",
      "userId": "664f1b2c8e4a2b001c8d0001",
      "accountHolderName": "John Doe",
      "bankName": "HDFC Bank",
      "accountNumber": 1234567890,
      "ifscCode": "HDFC0001234",
      "branch": "Coimbatore Main",
      "esiAndPf": {
        "esiNumber": 1234567,
        "pfNumber": 7654321
      },
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

## Get Bank Details by ID

**GET** `/v1/bank-details/:bankDetailsId`

### Path Parameter

| Param           | Type       | Description                    |
|-----------------|------------|--------------------------------|
| `bankDetailsId` | `ObjectId` | MongoDB ID of bank details     |

### Response `200`
Returns the full bank details object (same shape as results array above).

### Response `404`
```json
{ "code": 404, "message": "BankDetails not found" }
```

---

## Update Bank Details

**PATCH** `/v1/bank-details/:bankDetailsId`

All fields optional, at least one required.

### Path Parameter

| Param           | Type       | Description                |
|-----------------|------------|----------------------------|
| `bankDetailsId` | `ObjectId` | MongoDB ID of bank details |

### Request Body

```json
{
  "ifscCode": "HDFC0009999",
  "branch": "New Branch",
  "esiAndPf": {
    "pfNumber": 9999999
  }
}
```

### Response `200`
Returns the updated bank details object.

### Response `404`
```json
{ "code": 404, "message": "BankDetails not found" }
```

---

## Delete Bank Details

**DELETE** `/v1/bank-details/:bankDetailsId`

### Path Parameter

| Param           | Type       | Description                |
|-----------------|------------|----------------------------|
| `bankDetailsId` | `ObjectId` | MongoDB ID of bank details |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "BankDetails not found" }
```

---

## Instructions

### Integration with employee registration

Bank details are created automatically when you pass a `bankDetails` array in `POST /v1/users/employee-registration`. The created IDs are stored in `workInformation.bankDetails` on the user document.

Use these standalone endpoints to add, update, or remove bank accounts after registration.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=createdAt:desc`.
