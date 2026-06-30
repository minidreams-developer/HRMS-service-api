# OffBoard API

Base URL: `/v1/off-board`

---

## Create OffBoard Record

Initiates the offboarding process for a user.

**POST** `/v1/off-board`

### Request Body

```json
{
  "userId": "664f1b2c8e4a2b001c8d0001",
  "exitInformation": {
    "exitType": "Resignation",
    "exitReason": "Personal reasons",
    "resignationSubmitionDate": "2024-06-01",
    "lastWorkingDate": "2024-06-30",
    "noticePeriod": "2024-06-30",
    "actualNoticePeriod": "2024-06-30",
    "waiver": false,
    "exitApprovedBy": "664f1b2c8e4a2b001c8d1234",
    "approvalDate": "2024-06-02"
  },
  "finalSettlemelastMonthSalary": {
    "lastMonthSalary": true,
    "pendingSalary": false,
    "leaveEncashment": true,
    "bonus_incentives": false,
    "reimbursements": false,
    "noticePay": false,
    "assetDamge": false,
    "loanRecovery": false,
    "advanceSalary": false,
    "taxAdjustments": true,
    "tenth_marksheet": true,
    "twelevth_marksheet": true
  },
  "userDocuments": ["664f1b2c8e4a2b001c8ddoc1"],
  "verificationEmail": "employee@example.com"
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `ObjectId` | yes | User being offboarded |
| `exitInformation` | `object` | no | Exit details (see below) |
| `finalSettlemelastMonthSalary` | `object` | no | Final settlement checklist |
| `userDocuments` | `ObjectId[]` | no | Related document IDs |
| `verificationEmail` | `string` | no | Email address to send OTP for verification |
| `isEmailVerified` | `boolean` | no | Whether the verification email has been verified (default: false) |

#### exitInformation

| Field | Type | Description |
|-------|------|-------------|
| `exitType` | `string` | e.g. Resignation, Termination |
| `exitReason` | `string` | Reason for exit |
| `resignationSubmitionDate` | `date` | Date resignation was submitted |
| `lastWorkingDate` | `date` | Last day of work |
| `noticePeriod` | `date` | Expected notice period end date |
| `actualNoticePeriod` | `date` | Actual notice period end date |
| `waiver` | `boolean` | Whether notice period was waived |
| `exitApprovedBy` | `ObjectId` | User ID of approver |
| `approvalDate` | `date` | Date of approval |

#### finalSettlemelastMonthSalary (all boolean, default: false)

| Field | Description |
|-------|-------------|
| `lastMonthSalary` | Last month salary cleared |
| `pendingSalary` | Pending salary cleared |
| `leaveEncashment` | Leave encashment processed |
| `bonus_incentives` | Bonus/incentives cleared |
| `reimbursements` | Reimbursements cleared |
| `noticePay` | Notice pay processed |
| `assetDamge` | Asset damage deducted |
| `loanRecovery` | Loan recovery done |
| `advanceSalary` | Advance salary recovered |
| `taxAdjustments` | Tax adjustments done |
| `tenth_marksheet` | 10th marksheet returned |
| `twelevth_marksheet` | 12th marksheet returned |

### Response `201`
```json
{
  "id": "664f1b2c8e4a2b001c8dob01",
  "userId": "664f1b2c8e4a2b001c8d0001",
  "exitInformation": { "..." : "..." },
  "finalSettlemelastMonthSalary": { "..." : "..." },
  "userDocuments": [],
  "verificationEmail": "employee@example.com",
  "isEmailVerified": false,
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

---

## Get All OffBoard Records

**GET** `/v1/off-board`

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | `ObjectId` | Filter by user ID |
| `sortBy` | `string` | Sort field and order e.g. `createdAt:desc` |
| `limit` | `number` | Results per page (default: 10) |
| `page` | `number` | Page number (default: 1) |

### Response `200`
```json
{
  "results": [
    {
      "id": "664f1b2c8e4a2b001c8dob01",
      "userId": { "id": "...", "name": "John Doe", "email": "john@example.com", "employeeId": "EMP123456" },
      "exitInformation": { "..." : "..." },
      "finalSettlemelastMonthSalary": { "..." : "..." },
      "verificationEmail": "employee@example.com",
      "isEmailVerified": false,
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

## Get OffBoard Record by ID

**GET** `/v1/off-board/:offBoardId`

### Path Parameter

| Param | Type | Description |
|-------|------|-------------|
| `offBoardId` | `ObjectId` | MongoDB ID of offboard record |

### Response `200`
Returns the full offboard record with populated `userId`, `exitApprovedBy`, and `userDocuments`.

### Response `404`
```json
{ "code": 404, "message": "OffBoard record not found" }
```

---

## Get OffBoard Record by User

**GET** `/v1/off-board/user/:userId`

### Path Parameter

| Param | Type | Description |
|-------|------|-------------|
| `userId` | `ObjectId` | MongoDB ID of user |

### Response `200`
Returns the offboard record for the given user.

### Response `404`
```json
{ "code": 404, "message": "OffBoard record not found for this user" }
```

---

## Update OffBoard Record

**PATCH** `/v1/off-board/:offBoardId`

All fields optional, at least one required. `userId` cannot be updated.

### Request Body
```json
{
  "exitInformation": {
    "lastWorkingDate": "2024-07-15",
    "waiver": true
  },
  "finalSettlemelastMonthSalary": {
    "lastMonthSalary": true,
    "leaveEncashment": true
  },
  "verificationEmail": "newemail@example.com"
}
```

### Response `200`
Returns the updated offboard record.

### Response `404`
```json
{ "code": 404, "message": "OffBoard record not found" }
```

---

## Delete OffBoard Record

**DELETE** `/v1/off-board/:offBoardId`

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "OffBoard record not found" }
```

---

## Send OTP

Generates a 6-digit OTP and sends it to the `verificationEmail` stored on the offboard record. Any previously issued OTP for this record is invalidated. OTP expires in 10 minutes.

**POST** `/v1/off-board/:offBoardId/send-otp`

### Path Parameter

| Param | Type | Description |
|-------|------|-------------|
| `offBoardId` | `ObjectId` | MongoDB ID of offboard record |

### Request Body
No body required.

### Response `200`
```json
{ "message": "OTP sent to verification email" }
```

### Error Responses

| Code | Message |
|------|---------|
| `404` | OffBoard record not found |
| `400` | No verification email set on this offboard record |
| `400` | Email is already verified |

---

## Verify OTP

Validates the OTP submitted by the user. On success, sets `isEmailVerified: true` on the offboard record and invalidates the OTP.

**POST** `/v1/off-board/:offBoardId/verify-otp`

### Path Parameter

| Param | Type | Description |
|-------|------|-------------|
| `offBoardId` | `ObjectId` | MongoDB ID of offboard record |

### Request Body

```json
{
  "otp": "482910"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `otp` | `string` | yes | 6-digit numeric OTP |

### Response `200`
Returns the updated offboard record with `isEmailVerified: true`.

```json
{
  "id": "664f1b2c8e4a2b001c8dob01",
  "isEmailVerified": true,
  "verificationEmail": "employee@example.com",
  "updatedAt": "2024-06-01T10:05:00.000Z"
}
```

### Error Responses

| Code | Message |
|------|---------|
| `404` | OffBoard record not found |
| `400` | Email is already verified |
| `400` | Invalid OTP |
| `400` | OTP has expired |

---

## Instructions

### Typical offboarding flow

1. Call `POST /v1/off-board` with `userId`, exit details, and `verificationEmail`.
2. Call `POST /v1/off-board/:offBoardId/send-otp` to send the OTP to the employee's email.
3. Employee submits the OTP — call `POST /v1/off-board/:offBoardId/verify-otp` to verify it.
4. As the process progresses, use `PATCH /v1/off-board/:offBoardId` to update exit information and tick off final settlement items.
5. Use `GET /v1/off-board/user/:userId` to fetch the offboard record for a specific employee.

### OTP behaviour

- OTP is a 6-digit numeric code, valid for 10 minutes.
- Calling `send-otp` again before the previous OTP expires will invalidate the old one and issue a new one.
- Once verified, calling `send-otp` again will return a `400` since the email is already verified.

### Final settlement checklist

All fields in `finalSettlemelastMonthSalary` are booleans defaulting to `false`. Update them to `true` as each item is cleared during the offboarding process.

### Pagination

Supports `page`, `limit`, and `sortBy`. Default page size is `10`. Format: `sortBy=createdAt:desc`.
