# Stop Payroll API

Base URL: `/v1/payroll`



## Overview

The Stop Payroll module allows HR administrators to temporarily or permanently halt payroll processing for employees with detailed reason tracking, effective dates, and optional resume scheduling. This is essential for handling resignations, terminations, medical leaves, suspensions, and other employment status changes.

### Key Features

- **Flexible Stop Types**: Temporary, permanent, suspension, leave without pay, disciplinary
- **Comprehensive Reasons**: Resignation, termination, medical leave, personal leave, disciplinary action
- **Date Management**: Effective from date with optional resume date
- **Audit Trail**: Complete tracking of stop/resume history with timestamps
- **Impact Tracking**: Month-wise impact assessment

### Stop Types

| Type | Description | Use Case |
|---|---|---|
| `temporary` | Short-term stoppage with expected return | Medical leave, personal leave |
| `permanent` | Long-term or indefinite stoppage | Resignation, termination |
| `suspension` | Disciplinary pause in payroll | Performance issues, investigation |
| `leave_without_pay` | Extended unpaid leave | Extended personal time |
| `disciplinary` | Punishment-related stoppage | Misconduct, policy violation |
| `other` | Any other custom stop type | Flexible for organization needs |

**Note:** `stopType` now accepts any string value, not just the predefined types above.

### Stop Reasons

| Reason | Description |
|---|---|
| `resignation` | Employee voluntary departure |
| `termination` | Company-initiated employment end |
| `suspension` | Temporary disciplinary action |
| `medical_leave` | Health-related absence |
| `personal_leave` | Personal matters requiring time off |
| `disciplinary_action` | Performance or conduct issues |
| `other` | Other reasons not covered above |

**Note:** `reason` now accepts any string value, not just the predefined reasons above.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/v1/payroll/:employeeId/stop` | Stop payroll for an employee |
| POST | `/v1/payroll/:employeeId/resume` | Resume stopped payroll |
| GET | `/v1/payroll/stopped` | List all stopped payrolls |
| GET | `/v1/payroll/:employeeId/preview` | Preview employee with stop status |

---

## 1. Stop Payroll

Stops payroll processing for an employee with comprehensive tracking and optional automatic resume date. The `employeeId` from the URL path parameter is automatically stored in the payroll record.

**POST** `/v1/payroll/:employeeId/stop`

### Path Parameter

| Param | Type | Required | Description |
|---|---|---|---|
| `employeeId` | `ObjectId` | **yes** | MongoDB `_id` of the employee to stop payroll for. **This value is automatically stored in the payroll record.** |

### Request Body

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `month` | `number` | **yes** | 1-12 | Target payroll month |
| `year` | `number` | **yes** | 2000-2100 | Target payroll year |
| `stopType` | `string` | **yes** | any string | Type of stop (e.g., temporary, permanent, suspension, etc.) |
| `reason` | `string` | **yes** | any string | Reason for stop (e.g., resignation, medical_leave, etc.) |
| `effectiveFrom` | `date` | **yes** | valid date | Date when the payroll stop becomes effective |
| `resumeOn` | `date` | no | valid date | Optional date when payroll should automatically resume |
| `impactMonth` | `string` | **yes** | string | Human-readable description of impact period (e.g., "March 2026") |
| `stopRemarks` | `string` | no | string | Additional notes or comments about the stop |

### Example Request Body

#### Temporary Medical Leave
```json
{
  "month": 7,
  "year": 2026,
  "stopType": "temporary",
  "reason": "medical_leave",
  "effectiveFrom": "2026-07-15T00:00:00.000Z",
  "resumeOn": "2026-08-15T00:00:00.000Z",
  "impactMonth": "July 2026",
  "stopRemarks": "Employee undergoing surgery and recovery. Expected return in 4 weeks."
}
```

#### Permanent Resignation
```json
{
  "month": 8,
  "year": 2026,
  "stopType": "permanent",
  "reason": "resignation",
  "effectiveFrom": "2026-08-31T00:00:00.000Z",
  "impactMonth": "August 2026",
  "stopRemarks": "Employee submitted 2 weeks notice. Last working day: August 31st."
}
```

#### Disciplinary Suspension
```json
{
  "month": 7,
  "year": 2026,
  "stopType": "suspension",
  "reason": "disciplinary_action",
  "effectiveFrom": "2026-07-10T00:00:00.000Z",
  "resumeOn": "2026-07-24T00:00:00.000Z",
  "impactMonth": "July 2026",
  "stopRemarks": "2-week suspension pending investigation of policy violation."
}
```

### Response `200` - Success

**Note:** The `employeeId` field in the response contains the ObjectId from the URL path parameter, confirming it has been stored in the payroll record.

```json
{
  "id": "64f8b2c8e4a2b001c8dff01",
  "employeeId": "64f8b2c8e4a2b001c8d0001",  // ✅ Stored from URL path parameter
  "month": 7,
  "year": 2026,
  "status": "stopped",
  "stopDetails": {
    "stopType": "temporary",
    "reason": "medical_leave",
    "effectiveFrom": "2026-07-15T00:00:00.000Z",
    "resumeOn": "2026-08-15T00:00:00.000Z",
    "impactMonth": "July 2026",
    "stopRemarks": "Employee undergoing surgery and recovery. Expected return in 4 weeks.",
    "stoppedAt": "2026-07-10T14:30:25.123Z",
    "resumedAt": null
  },
  "extras": 0,
  "penalties": 0,
  "loanAndAdvance": 0,
  "otherDeductions": 0,
  "otherWages": 0,
  "remarks": null,
  "snapshot": {
    "fullDays": 0,
    "halfDays": 0,
    "offDays": 0,
    "paidLeaves": 0,
    "unpaidLeaves": 0,
    "dailyRate": 0,
    "grossWages": 0,
    "earnedWages": 0,
    "overtimeAmount": 0,
    "grossEarnings": 0,
    "takeHome": 0
  },
  "createdAt": "2026-07-10T14:30:25.123Z",
  "updatedAt": "2026-07-10T14:30:25.123Z"
}
```

### Response `404` - Employee Not Found

```json
{
  "code": 404,
  "message": "Employee not found"
}
```

### Response `400` - Validation Error

```json
{
  "code": 400,
  "message": "stopType, reason, effectiveFrom, and impactMonth are required"
}
```

```json
{
  "code": 400,
  "message": "\"stopType\" must be one of [temporary, permanent, suspension, leave_without_pay, disciplinary]"
}
```

```json
{
  "code": 400,
  "message": "\"reason\" must be one of [resignation, termination, suspension, medical_leave, personal_leave, disciplinary_action, other]"
}
```

---

## 2. Resume Payroll

Resumes payroll processing for an employee that was previously stopped. Only employees with `status: "stopped"` can be resumed.

**POST** `/v1/payroll/:employeeId/resume`

### Path Parameter

| Param | Type | Required | Description |
|---|---|---|---|
| `employeeId` | `ObjectId` | **yes** | MongoDB `_id` of the employee to resume payroll for |

### Request Body

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `month` | `number` | **yes** | 1-12 | Target payroll month |
| `year` | `number` | **yes** | 2000-2100 | Target payroll year |
| `resumeRemarks` | `string` | no | string | Optional notes about the resumption |

### Example Request Body

```json
{
  "month": 7,
  "year": 2026,
  "resumeRemarks": "Employee has recovered from surgery and cleared by medical team to return to work."
}
```

### Response `200` - Success

```json
{
  "id": "64f8b2c8e4a2b001c8dff01",
  "employeeId": "64f8b2c8e4a2b001c8d0001",
  "month": 7,
  "year": 2026,
  "status": "resumed",
  "stopDetails": {
    "stopType": "temporary",
    "reason": "medical_leave",
    "effectiveFrom": "2026-07-15T00:00:00.000Z",
    "resumeOn": "2026-08-15T00:00:00.000Z",
    "impactMonth": "July 2026",
    "stopRemarks": "Employee undergoing surgery and recovery. Expected return in 4 weeks.",
    "stoppedAt": "2026-07-10T14:30:25.123Z",
    "resumedAt": "2026-08-10T09:15:42.567Z"
  },
  "extras": 0,
  "penalties": 0,
  "loanAndAdvance": 0,
  "otherDeductions": 0,
  "otherWages": 0,
  "remarks": "[RESUMED] Employee has recovered from surgery and cleared by medical team to return to work.",
  "snapshot": {
    "fullDays": 0,
    "halfDays": 0,
    "offDays": 0,
    "paidLeaves": 0,
    "unpaidLeaves": 0,
    "dailyRate": 0,
    "grossWages": 0,
    "earnedWages": 0,
    "overtimeAmount": 0,
    "grossEarnings": 0,
    "takeHome": 0
  },
  "createdAt": "2026-07-10T14:30:25.123Z",
  "updatedAt": "2026-08-10T09:15:42.567Z"
}
```

### Response `400` - Invalid Status

```json
{
  "code": 400,
  "message": "Cannot resume payroll. Current status is 'draft', expected 'stopped'"
}
```

### Response `404` - Not Found

```json
{
  "code": 404,
  "message": "Payroll record not found. Employee may not have stopped payroll."
}
```

---

## 3. List Stopped Payrolls

Retrieves a paginated list of all employees with stopped payroll status, with optional filtering capabilities.

**GET** `/v1/payroll/stopped`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | Filter by specific month (1-12) |
| `year` | `number` | no | Filter by specific year |
| `stopType` | `string` | no | Filter by stop type |
| `reason` | `string` | no | Filter by stop reason |
| `page` | `number` | no | Page number (default: 1) |
| `limit` | `number` | no | Results per page (default: 10, max: 100) |

### Example Requests

#### Get All Stopped Payrolls
```
GET /v1/payroll/stopped?page=1&limit=10
```

#### Filter by Medical Leaves
```
GET /v1/payroll/stopped?reason=medical_leave&page=1&limit=10
```

#### Filter by Month and Temporary Stops
```
GET /v1/payroll/stopped?month=7&year=2026&stopType=temporary
```

### Response `200` - Success

```json
{
  "results": [
    {
      "_id": "64f8b2c8e4a2b001c8dff01",
      "employeeId": {
        "_id": "64f8b2c8e4a2b001c8d0001",
        "name": "Sarah Johnson",
        "employeeId": "EMP001",
        "workInformation": {
          "designation": "Software Engineer"
        },
        "profilePic": "https://example.com/uploads/sarah.jpg"
      },
      "month": 7,
      "year": 2026,
      "status": "stopped",
      "stopDetails": {
        "stopType": "temporary",
        "reason": "medical_leave",
        "effectiveFrom": "2026-07-15T00:00:00.000Z",
        "resumeOn": "2026-08-15T00:00:00.000Z",
        "impactMonth": "July 2026",
        "stopRemarks": "Employee undergoing surgery and recovery. Expected return in 4 weeks.",
        "stoppedAt": "2026-07-10T14:30:25.123Z",
        "resumedAt": null
      },
      "extras": 0,
      "penalties": 0,
      "loanAndAdvance": 0,
      "otherDeductions": 0,
      "otherWages": 0,
      "createdAt": "2026-07-10T14:30:25.123Z",
      "updatedAt": "2026-07-10T14:30:25.123Z"
    },
    {
      "_id": "64f8b2c8e4a2b001c8dff02",
      "employeeId": {
        "_id": "64f8b2c8e4a2b001c8d0002",
        "name": "Mike Chen",
        "employeeId": "EMP002",
        "workInformation": {
          "designation": "Product Manager"
        },
        "profilePic": null
      },
      "month": 7,
      "year": 2026,
      "status": "stopped",
      "stopDetails": {
        "stopType": "permanent",
        "reason": "resignation",
        "effectiveFrom": "2026-07-31T00:00:00.000Z",
        "resumeOn": null,
        "impactMonth": "July 2026",
        "stopRemarks": "Employee accepted position at another company. Last working day: July 31st.",
        "stoppedAt": "2026-07-05T10:20:15.456Z",
        "resumedAt": null
      },
      "createdAt": "2026-07-05T10:20:15.456Z",
      "updatedAt": "2026-07-05T10:20:15.456Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 2
}
```

### Response `200` - Empty Results

```json
{
  "results": [],
  "page": 1,
  "limit": 10,
  "totalPages": 0,
  "totalResults": 0
}
```

---

## 4. Preview Employee with Stop Status

Get detailed payroll preview including stop/resume status and history.

**GET** `/v1/payroll/:employeeId/preview`

### Path Parameter

| Param | Type | Required | Description |
|---|---|---|---|
| `employeeId` | `ObjectId` | **yes** | MongoDB `_id` of the employee |

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `month` | `number` | no | Month (1-12). Defaults to current month |
| `year` | `number` | no | Year. Defaults to current year |

### Example Request

```
GET /v1/payroll/64f8b2c8e4a2b001c8d0001/preview?month=7&year=2026
```

### Response `200` - Stopped Employee

```json
{
  "_id": "64f8b2c8e4a2b001c8d0001",
  "employeeId": "EMP001",
  "name": "Sarah Johnson",
  "designation": "Software Engineer",
  "department": "Engineering",
  "profilePic": "https://example.com/uploads/sarah.jpg",
  "payrollId": "64f8b2c8e4a2b001c8dff01",
  "status": "stopped",
  "remarks": null,
  "month": 7,
  "year": 2026,
  "fullDays": 10,
  "halfDays": 1,
  "offDays": 4,
  "paidLeaves": 0,
  "unpaidLeaves": 0,
  "dailyRate": 2307.69,
  "grossWages": 60000,
  "earnedWages": 24230.76,
  "otherWages": 0,
  "overtimeAmount": 0,
  "extras": 0,
  "grossEarnings": 24230.76,
  "penalties": 0,
  "loanAndAdvance": 0,
  "otherDeductions": 0,
  "takeHome": 24230.76,
  "stopDetails": {
    "stopType": "temporary",
    "reason": "medical_leave",
    "effectiveFrom": "2026-07-15T00:00:00.000Z",
    "resumeOn": "2026-08-15T00:00:00.000Z",
    "impactMonth": "July 2026",
    "stopRemarks": "Employee undergoing surgery and recovery. Expected return in 4 weeks.",
    "stoppedAt": "2026-07-10T14:30:25.123Z",
    "resumedAt": null
  }
}
```

---

---

## Data Flow & Storage

### How employeeId is Stored

#### 1. **API Request Processing**
```
POST /v1/payroll/64f8b2c8e4a2b001c8d0001/stop
                    ↑
            This employeeId is extracted and stored
```

#### 2. **Controller Layer**
```javascript
// src/controllers/payroll.controller.js
const stopPayroll = catchAsync(async (req, res) => {
  // req.params.employeeId = "64f8b2c8e4a2b001c8d0001"
  const result = await payrollService.stopPayroll(req.params.employeeId, req.body);
  res.status(httpStatus.OK).send(result);
});
```

#### 3. **Service Layer**
```javascript
// src/services/payroll.service.js
const stopPayroll = async (employeeId, stopData) => {
  // Validate employee exists
  const emp = await User.findById(employeeId).lean();
  
  // Create/update payroll record with employeeId
  const payroll = await Payroll.findOneAndUpdate(
    { employeeId, month, year }, // ← employeeId stored here
    { $set: { status: 'stopped', stopDetails } },
    { new: true, upsert: true }
  );
  
  return payroll;
};
```

#### 4. **Database Document**
```json
{
  "_id": "64f8b2c8e4a2b001c8dff01",
  "employeeId": "64f8b2c8e4a2b001c8d0001", // ✅ From URL path parameter
  "month": 7,
  "year": 2026,
  "status": "stopped",
  "stopDetails": { /* stop information */ }
}
```

---

## Status Lifecycle

### State Transitions

```
┌─────────┐    stop     ┌─────────┐    resume    ┌─────────┐
│  draft  │ ─────────► │ stopped │ ──────────► │ resumed │
└─────────┘            └─────────┘             └─────────┘
     │                                              │
     ▼                                              ▼
┌─────────┐                                  ┌─────────┐
│processed│                                  │processed│
└─────────┘                                  └─────────┘
     │                                              │
     ▼                                              ▼
┌─────────┐                                  ┌─────────┐
│  paid   │                                  │  paid   │
└─────────┘                                  └─────────┘
```

### Business Rules

1. **Any status** can transition to `stopped`
2. **Only `stopped`** can transition to `resumed`
3. **`resumed`** follows normal flow: `draft` → `processed` → `paid`
4. **Stop records** are preserved even after resumption for audit trail
5. **Resume remarks** are appended to existing remarks with `[RESUMED]` prefix
6. **employeeId storage**: The `employeeId` from the URL path parameter is automatically stored in the payroll record - no need to include it in the request body

---

## Error Handling

### Validation Errors

| Field | Error Message | HTTP Code |
|---|---|---|
| `stopType` | "stopType" is required | 400 |
| `reason` | "reason" is required | 400 |
| `month` | "month" must be between 1 and 12 | 400 |
| `year` | "year" must be between 2000 and 2100 | 400 |
| `effectiveFrom` | "effectiveFrom" must be a valid date | 400 |
| `resumeOn` | "resumeOn" must be a valid date | 400 |
| `employeeId` | "employeeId" must be a valid ObjectId | 400 |

### Business Logic Errors

| Scenario | Error Message | HTTP Code |
|---|---|---|
| Employee not found | Employee not found | 404 |
| Resume non-stopped payroll | Cannot resume payroll. Current status is 'X', expected 'stopped' | 400 |
| Missing required stop fields | stopType, reason, effectiveFrom, and impactMonth are required | 400 |
| Payroll record not found for resume | Payroll record not found. Employee may not have stopped payroll. | 404 |

---

## Integration Guide

### Frontend Integration

#### Stop Payroll Form
```javascript
const stopPayroll = async (employeeId, stopData) => {
  try {
    // Note: employeeId is passed in the URL path, not in the request body
    const response = await fetch(`/api/v1/payroll/${employeeId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(stopData) // employeeId NOT included here - it's in the URL
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    const result = await response.json();
    // result.employeeId will contain the employeeId from the URL path
    console.log('Stopped payroll for employee:', result.employeeId);
    return result;
  } catch (error) {
    console.error('Failed to stop payroll:', error);
    throw error;
  }
};
```

#### Resume Payroll
```javascript
const resumePayroll = async (employeeId, resumeData) => {
  try {
    const response = await fetch(`/api/v1/payroll/${employeeId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(resumeData)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to resume payroll:', error);
    throw error;
  }
};
```

### Common Use Cases

#### 1. Employee Resignation (2 weeks notice)
```json
{
  "month": 8,
  "year": 2026,
  "stopType": "permanent",
  "reason": "resignation",
  "effectiveFrom": "2026-08-15T00:00:00.000Z",
  "impactMonth": "August 2026",
  "stopRemarks": "Employee submitted resignation letter. Last working day: August 15th. Notice period: 2 weeks."
}
```

#### 2. Medical Leave (Expected Return)
```json
{
  "month": 7,
  "year": 2026,
  "stopType": "temporary",
  "reason": "medical_leave",
  "effectiveFrom": "2026-07-20T00:00:00.000Z",
  "resumeOn": "2026-09-01T00:00:00.000Z",
  "impactMonth": "July-August 2026",
  "stopRemarks": "Maternity leave. Expected return after 6 weeks."
}
```

#### 3. Disciplinary Suspension
```json
{
  "month": 7,
  "year": 2026,
  "stopType": "disciplinary",
  "reason": "disciplinary_action",
  "effectiveFrom": "2026-07-10T00:00:00.000Z",
  "resumeOn": "2026-07-17T00:00:00.000Z",
  "impactMonth": "July 2026",
  "stopRemarks": "1-week suspension pending completion of mandatory training program."
}
```

---

## Best Practices

### 1. Date Management
- Always use UTC dates for `effectiveFrom` and `resumeOn`
- Ensure `resumeOn` is after `effectiveFrom` when provided
- Consider business days vs calendar days for suspension periods

### 2. Documentation
- Provide clear, detailed `stopRemarks` for audit trail
- Include reference numbers for formal disciplinary actions
- Document expected return dates and conditions

### 3. Communication
- Notify relevant stakeholders before stopping payroll
- Send confirmation after successful stop/resume operations
- Maintain employee privacy while ensuring proper documentation

### 4. Data Integrity
- Validate employee exists and is active before stopping
- Ensure payroll record exists before attempting resume
- Maintain referential integrity with attendance and leave records
- **EmployeeId is automatically extracted from URL path and stored** - no manual handling needed

### 5. Reporting
- Regular audits of stopped payrolls to identify overdue resumes
- Track patterns in stop reasons for HR analytics
- Monitor compliance with company policies and legal requirements
- Use the stored `employeeId` to join with User data for comprehensive reporting