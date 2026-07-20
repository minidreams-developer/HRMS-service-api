# Agent API

Agents are users with `role: "agent"`. They live in the shared `User` collection and have additional agent-specific fields: `agentId`, `commissionDetails`, `referenceDetails`.

Base URL: `/v1/users`

---

## 1. Generate Agent ID

Generate a unique agent ID before creating an agent.

**GET** `/v1/users/agent`

### Response `201 Created`

```json
{
  "agentId": "AGT-000123"
}
```

---

## 2. Create Agent

**POST** `/v1/users/agent`

### Request Body (`application/json`)

```json
{
  "agentId": "AGT-000123",
  "name": "Ravi Kumar",
  "email": "ravi.kumar@example.com",
  "password": "Ravi@1234",
  "phone": "9876543210",
  "gender": "male",
  "dateOfBirth": "1992-06-15",
  "age": 32,
  "martialStatus": "married",
  "motherTongue": "Hindi",
  "identificationMark": "mole on left cheek",
  "religion": "Hindu",
  "profilePic": "https://cdn.example.com/profiles/ravi.jpg",
  "documentNo": {
    "aadharNo": 123456789012,
    "panNo": "ABCDE1234F"
  },
  "address": {
    "addressLine1": "12 MG Road",
    "addressLine2": "Near City Mall",
    "city": "Bangalore",
    "district": "Bangalore Urban",
    "state": "Karnataka",
    "pincode": 560001,
    "country": "India"
  },
  "emergencyContacts": [
    {
      "contactName": "Sunita Kumar",
      "phone": "9123456780",
      "relationship": "spouse",
      "address": {
        "addressLine1": "12 MG Road",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": 560001,
        "country": "India"
      }
    }
  ],
  "documentImage": [
    {
      "documentName": "Aadhar Card",
      "documentType": "government",
      "fileUrl": "https://cdn.example.com/docs/aadhar.jpg"
    },
    {
      "documentName": "PAN Card",
      "documentType": "government",
      "fileUrl": "https://cdn.example.com/docs/pan.jpg"
    }
  ],
  "commission": {
    "commission": 10,
    "allowance": 5000,
    "salaryDisbursementType": "monthly"
  },
  "referenceDetails": "Referred by branch manager John"
}
```

### Field Reference

#### Top-level fields

| Field               | Type   | Required | Description                              |
| ------------------- | ------ | -------- | ---------------------------------------- |
| agentId             | string | No       | Pre-generated ID from GET /users/agent   |
| name                | string | Yes      | Full name of the agent                   |
| email               | string | Yes      | Unique email — used for login            |
| password            | string | Yes      | Min 8 chars, must contain letter + digit |
| phone               | string | No       | Contact number                           |
| gender              | string | No       | `male` / `female` / `other`              |
| dateOfBirth         | date   | No       | ISO 8601 format e.g. `1992-06-15`        |
| age                 | number | No       | Age in years                             |
| martialStatus       | string | No       | e.g. `married`, `unMarried`              |
| motherTongue        | string | No       |                                          |
| identificationMark  | string | No       |                                          |
| religion            | string | No       |                                          |
| profilePic          | string | No       | URL of profile picture                   |
| referenceDetails    | string | No       | Free-text reference note                 |

#### `documentNo` object

| Field     | Type   | Description            |
| --------- | ------ | ---------------------- |
| aadharNo  | number | 12-digit Aadhar number |
| panNo     | string | PAN card number        |

#### `address` object

| Field        | Type   | Description               |
| ------------ | ------ | ------------------------- |
| addressLine1 | string | Street address line 1     |
| addressLine2 | string | Street address line 2     |
| city         | string |                           |
| district     | string |                           |
| state        | string |                           |
| pincode      | number |                           |
| country      | string | Defaults to `"India"`     |

#### `emergencyContacts` array

| Field       | Type   | Description                              |
| ----------- | ------ | ---------------------------------------- |
| contactName | string | Name of emergency contact                |
| phone       | number | Phone number                             |
| relationship| string | e.g. `spouse`, `parent`, `sibling`       |
| address     | object | Same shape as the top-level address object |

#### `documentImage` array

| Field        | Type   | Description                            |
| ------------ | ------ | -------------------------------------- |
| documentName | string | e.g. `"Aadhar Card"`, `"PAN Card"`     |
| documentType | string | `government` or `personal`             |
| fileUrl      | string | Publicly accessible URL of the file    |

#### `commission` object

| Field                  | Type   | Description                                          |
| ---------------------- | ------ | ---------------------------------------------------- |
| commission             | number | Commission percentage                                |
| allowance              | number | Fixed allowance amount                               |
| salaryDisbursementType | string | e.g. `"monthly"`, `"weekly"`, `"fortnightly"`        |

---

### Response `201 Created`

```json
{
  "id": "64c3e1a2b3c4d5e6f7a8b9c0",
  "agentId": "AGT-000123",
  "name": "Ravi Kumar",
  "email": "ravi.kumar@example.com",
  "phone": "9876543210",
  "role": "agent",
  "gender": "male",
  "dateOfBirth": "1992-06-15T00:00:00.000Z",
  "age": 32,
  "martialStatus": "married",
  "motherTongue": "Hindi",
  "identificationMark": "mole on left cheek",
  "religion": "Hindu",
  "profilePic": "https://cdn.example.com/profiles/ravi.jpg",
  "documentNo": {
    "aadharNo": 123456789012,
    "panNo": "ABCDE1234F"
  },
  "address": ["64b1f2c9e4b0a1a2b3c4d5e1"],
  "emergencyContact": ["64b1f2c9e4b0a1a2b3c4d5e2"],
  "userDocuments": ["64b1f2c9e4b0a1a2b3c4d5e3", "64b1f2c9e4b0a1a2b3c4d5e4"],
  "commissionDetails": "64b1f2c9e4b0a1a2b3c4d5e5",
  "referenceDetails": "Referred by branch manager John",
  "approvalStatus": "pending",
  "isEmailVerified": false,
  "isProfileCompleted": false,
  "isActive": true,
  "createdAt": "2024-07-06T10:00:00.000Z"
}
```

### Error Responses

#### `400 Bad Request` — Email already taken
```json
{
  "code": 400,
  "message": "Email already taken"
}
```

#### `400 Bad Request` — Weak password
```json
{
  "code": 400,
  "message": "Password must contain at least one letter and one number"
}
```

---

## Agent Creation Flow

```
Client                          Server
  │                               │
  │  GET /v1/users/agent          │
  │ ─────────────────────────────>│  Generate a unique agentId
  │<─────────────────────────────  { agentId: "AGT-000123" }
  │                               │
  │  POST /v1/users/agent         │
  │  { name, email, password,     │
  │    agentId, address,          │
  │    emergencyContacts,         │
  │    documentImage,             │
  │    commission, ... }          │
  │ ─────────────────────────────>│
  │                               │── Create Address doc
  │                               │── Create EmergencyContact docs
  │                               │   └── Create nested Address doc
  │                               │── Create UserDocument docs
  │                               │── Create Commission doc
  │                               │── Create User { role: "agent" }
  │                               │   linking all created IDs
  │<─────────────────────────────  201 { id, agentId, ... }
```

### What gets stored where

| Data              | Collection       | Linked via              |
| ----------------- | ---------------- | ----------------------- |
| Agent profile     | `users`          | `_id`                   |
| Address           | `addresses`      | `user.address[]`        |
| Emergency contact | `emergencycontacts` | `user.emergencyContact[]` |
| EC address        | `addresses`      | `emergencycontact.address` |
| Documents         | `userdocuments`  | `user.userDocuments[]`  |
| Commission        | `commissions`    | `user.commissionDetails` |
