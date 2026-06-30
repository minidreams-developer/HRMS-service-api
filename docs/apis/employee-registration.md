# Employee Registration API

Base URL: `/v1/users`

---

## Generate Employee ID

Generates a unique `employeeId` that does not already exist in the database. Returns the same ID on repeated calls until it has been used in a registration.

**GET** `/v1/users/generate-employeeId`

### Request
No payload required.

### Response `200`
```json
{
  "employeeId": "EMP847291"
}
```

---

## Register Employee

**POST** `/v1/users/employee-registration`

No validation — all fields are optional. Pass only what you have.

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": 9876543210,
  "role": "employee",
  "gender": "male",
  "dateOfBirth": "1995-06-15",
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
  "addresses": [
    {
      "addressLine1": "12 Main Street",
      "addressLine2": "Near Bus Stand",
      "city": "Coimbatore",
      "state": "Tamil Nadu",
      "pincode": 641001
    }
  ],
  "emergencyContacts": [
    {
      "contactName": "Jane Doe",
      "phone": 9876500000,
      "relattionship": "Spouse",
      "mobileNumber": 9876500000
    }
  ],
  "workInformation": {
    "joinedDate": "2024-01-15",
    "experienceType": "Experienced",
    "department": "664f1b2c8e4a2b001c8ddef1",
    "team": "664f1b2c8e4a2b001c8dabc1",
    "branch": "664f1b2c8e4a2b001c8dff01",
    "contractAgent": "664f1b2c8e4a2b001c8d1234",
    "reportingPerson": "664f1b2c8e4a2b001c8d5678",
    "AttendanceType": "Biometric",
    "shiftId": "664f1b2c8e4a2b001c8dsh01",
    "userRemarks": "Joining from competitor",
    "designation": "Software Engineer"
  },
  "salaryDetails": {
    "basicSalary": 30000,
    "annualCTC": 600000,
    "monthlyCTC": 50000,
    "houseRentAllowance": 10000,
    "conveyanceAllowance": 2000,
    "specialAllowance": 5000,
    "otherFixedAllowance": 3000
  },
  "bankDetails": [
    {
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
  ]
}
```

#### Personal Info

| Field                | Type       | Description                        |
|----------------------|------------|------------------------------------|
| `name`               | `string`   | Full name                          |
| `email`              | `string`   | Unique email address               |
| `password`           | `string`   | Login password                     |
| `phone`              | `number`   | Phone number                       |
| `role`               | `string`   | Default: `employee`                |
| `gender`             | `string`   | `male` or `female`                 |
| `dateOfBirth`        | `date`     | Date of birth                      |
| `age`                | `number`   | Age                                |
| `spokenLanguages`    | `string[]` | Languages spoken                   |
| `martialStatus`      | `string`   | Marital status                     |
| `motherTongue`       | `string`   | Mother tongue                      |
| `identificationMark` | `string`   | Physical identification mark       |
| `religion`           | `string`   | Religion                           |
| `profilePic`         | `string`   | Profile picture URL                |
| `documentNo`         | `object`   | `aadharNo`, `panNo`                |

#### addresses[]

| Field          | Type     | Description      |
|----------------|----------|------------------|
| `addressLine1` | `string` | Street line 1    |
| `addressLine2` | `string` | Street line 2    |
| `city`         | `string` | City             |
| `state`        | `string` | State            |
| `pincode`      | `number` | Pin code         |

#### emergencyContacts[]

| Field           | Type     | Description              |
|-----------------|----------|--------------------------|
| `contactName`   | `string` | Contact person name      |
| `phone`         | `number` | Phone number             |
| `relattionship` | `string` | Relationship to employee |
| `mobileNumber`  | `number` | Mobile number            |

#### workInformation

| Field             | Type       | Description                    |
|-------------------|------------|--------------------------------|
| `joinedDate`      | `date`     | Date of joining                |
| `experienceType`  | `string`   | e.g. Fresher, Experienced      |
| `department`      | `ObjectId` | Department ID                  |
| `team`            | `ObjectId` | Team ID                        |
| `branch`          | `ObjectId` | Branch ID                      |
| `contractAgent`   | `ObjectId` | Contract agent user ID         |
| `reportingPerson` | `ObjectId` | Reporting manager user ID      |
| `AttendanceType`  | `string`   | e.g. Biometric, Manual         |
| `shiftId`         | `ObjectId` | Shift ID                       |
| `userRemarks`     | `string`   | Additional remarks             |
| `designation`     | `string`   | Job designation                |

#### salaryDetails

| Field                  | Type     | Description               |
|------------------------|----------|---------------------------|
| `basicSalary`          | `number` | Basic salary              |
| `annualCTC`            | `number` | Annual CTC                |
| `monthlyCTC`           | `number` | Monthly CTC               |
| `houseRentAllowance`   | `number` | HRA                       |
| `conveyanceAllowance`  | `number` | Conveyance allowance      |
| `specialAllowance`     | `number` | Special allowance         |
| `otherFixedAllowance`  | `number` | Other fixed allowance     |

#### bankDetails[]

| Field               | Type     | Description           |
|---------------------|----------|-----------------------|
| `accountHolderName` | `string` | Account holder name   |
| `bankName`          | `string` | Bank name             |
| `accountNumber`     | `number` | Account number        |
| `ifscCode`          | `string` | IFSC code             |
| `branch`            | `string` | Bank branch name      |
| `esiAndPf`          | `object` | `esiNumber`, `pfNumber` |

### Response `201`

```json
{
  "id": "664f1b2c8e4a2b001c8d0001",
  "employeeId": "EMP847291",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": 9876543210,
  "role": "employee",
  "gender": "male",
  "dateOfBirth": "1995-06-15T00:00:00.000Z",
  "age": 29,
  "martialStatus": "unMarried",
  "profilePic": "https://cdn.example.com/pic.jpg",
  "address": ["664f1b2c8e4a2b001c8dadr1"],
  "emergencyContact": ["664f1b2c8e4a2b001c8dec01"],
  "workInformation": {
    "joinedDate": "2024-01-15T00:00:00.000Z",
    "designation": "Software Engineer",
    "department": "664f1b2c8e4a2b001c8ddef1",
    "team": "664f1b2c8e4a2b001c8dabc1",
    "branch": "664f1b2c8e4a2b001c8dff01",
    "shiftId": "664f1b2c8e4a2b001c8dsh01",
    "bankDetails": ["664f1b2c8e4a2b001c8dbd01"],
    "SalaryDetails": "664f1b2c8e4a2b001c8dsd01"
  },
  "approvalStatus": "pending",
  "isActive": true,
  "isProfileCompleted": false,
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-01T10:00:00.000Z"
}
```

### Response `400` — duplicate email
```json
{
  "code": 400,
  "message": "Email already taken"
}
```

---

## Instructions

### Recommended registration flow

1. Call `GET /v1/users/generate-employeeId` to get a unique `employeeId`.
2. Display it in the form (read-only).
3. Call `POST /v1/users/employee-registration` with the full payload — the service automatically uses the pending ID generated in step 1.

### employeeId format

Auto-generated as `EMP` followed by a 6-digit number, e.g. `EMP847291`. Calling `generate-employeeId` multiple times before registering returns the same ID — a new one is only issued after the previous one is saved to the DB.

### Sub-documents

`addresses`, `emergencyContacts`, `salaryDetails`, and `bankDetails` are created as separate documents and their IDs are stored on the user. Pass them as nested objects/arrays in the registration payload — the service handles creation automatically.

### Password

If no password is provided, the employee will not be able to log in until one is set. It is recommended to always pass a temporary password during registration.
