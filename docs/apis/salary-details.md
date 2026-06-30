# Salary Details API Documentation

## Overview
The Salary Details API manages employee compensation information including basic salary, CTC (Cost to Company), and various allowances. This API handles the financial aspects of employee records.

## Base URL
```
/v1/salary-details
```

---

## Endpoints

### 1. Create Salary Details

**POST** `/v1/salary-details`

Creates a new salary details record for an employee.

#### Request Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "basicSalary": 50000,
  "annualCTC": 800000,
  "monthlyCTC": 66666,
  "houseRentAllowance": 15000,
  "conveyanceAllowance": 2000,
  "specialAllowance": 5000,
  "otherFixedAllowance": 3000
}
```

#### Request Body Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| basicSalary | Number | No | Base salary amount (default: 0) |
| annualCTC | Number | No | Annual Cost to Company (default: 0) |
| monthlyCTC | Number | No | Monthly Cost to Company (default: 0) |
| houseRentAllowance | Number | No | HRA component (default: 0) |
| conveyanceAllowance | Number | No | Transportation allowance (default: 0) |
| specialAllowance | Number | No | Special allowance component (default: 0) |
| otherFixedAllowance | Number | No | Other fixed allowances (default: 0) |

#### Success Response (201 Created)
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "basicSalary": 50000,
  "annualCTC": 800000,
  "monthlyCTC": 66666,
  "houseRentAllowance": 15000,
  "conveyanceAllowance": 2000,
  "specialAllowance": 5000,
  "otherFixedAllowance": 3000,
  "createdAt": "2026-05-14T10:30:00.000Z",
  "updatedAt": "2026-05-14T10:30:00.000Z"
}
```

#### Error Responses
- **400 Bad Request**: Invalid input data
- **500 Internal Server Error**: Server error

---

### 2. Get All Salary Details

**GET** `/v1/salary-details`

Retrieves a paginated list of salary details records with optional filtering and sorting.

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| basicSalary | Number | Filter by basic salary | - |
| annualCTC | Number | Filter by annual CTC | - |
| monthlyCTC | Number | Filter by monthly CTC | - |
| sortBy | String | Sort by field (e.g., `annualCTC:desc`) | - |
| limit | Number | Results per page | 10 |
| page | Number | Page number | 1 |

#### Example Request
```
GET /v1/salary-details?sortBy=annualCTC:desc&limit=20&page=1
```

#### Success Response (200 OK)
```json
{
  "results": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "basicSalary": 50000,
      "annualCTC": 800000,
      "monthlyCTC": 66666,
      "houseRentAllowance": 15000,
      "conveyanceAllowance": 2000,
      "specialAllowance": 5000,
      "otherFixedAllowance": 3000,
      "createdAt": "2026-05-14T10:30:00.000Z",
      "updatedAt": "2026-05-14T10:30:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "totalResults": 1
}
```

---

### 3. Get Salary Details by ID

**GET** `/v1/salary-details/:salaryId`

Retrieves a specific salary details record by its ID.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| salaryId | ObjectId | Salary details record ID |

#### Example Request
```
GET /v1/salary-details/507f1f77bcf86cd799439013
```

#### Success Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "basicSalary": 50000,
  "annualCTC": 800000,
  "monthlyCTC": 66666,
  "houseRentAllowance": 15000,
  "conveyanceAllowance": 2000,
  "specialAllowance": 5000,
  "otherFixedAllowance": 3000,
  "createdAt": "2026-05-14T10:30:00.000Z",
  "updatedAt": "2026-05-14T10:30:00.000Z"
}
```

#### Error Responses
- **404 Not Found**: Salary details not found

---

### 4. Update Salary Details

**PATCH** `/v1/salary-details/:salaryId`

Updates an existing salary details record. Only provided fields will be updated.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| salaryId | ObjectId | Salary details record ID |

#### Request Body (Partial Update)
```json
{
  "basicSalary": 55000,
  "annualCTC": 850000,
  "monthlyCTC": 70833,
  "houseRentAllowance": 16500
}
```

#### Success Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "basicSalary": 55000,
  "annualCTC": 850000,
  "monthlyCTC": 70833,
  "houseRentAllowance": 16500,
  "conveyanceAllowance": 2000,
  "specialAllowance": 5000,
  "otherFixedAllowance": 3000,
  "createdAt": "2026-05-14T10:30:00.000Z",
  "updatedAt": "2026-05-14T12:00:00.000Z"
}
```

#### Error Responses
- **400 Bad Request**: Invalid input data
- **404 Not Found**: Salary details not found

---

### 5. Delete Salary Details

**DELETE** `/v1/salary-details/:salaryId`

Deletes a salary details record permanently.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| salaryId | ObjectId | Salary details record ID |

#### Example Request
```
DELETE /v1/salary-details/507f1f77bcf86cd799439013
```

#### Success Response (204 No Content)
```
No content returned
```

#### Error Responses
- **404 Not Found**: Salary details not found

---

## How It Works

### Salary Components

The salary structure is broken down into multiple components:

1. **Basic Salary**: The core salary component, typically 40-50% of CTC
2. **Annual CTC**: Total annual cost to company including all components
3. **Monthly CTC**: Annual CTC divided by 12 months
4. **House Rent Allowance (HRA)**: Tax-exempt allowance for housing
5. **Conveyance Allowance**: Transportation/commute allowance
6. **Special Allowance**: Additional allowance for specific purposes
7. **Other Fixed Allowance**: Any other fixed monthly allowances

### Calculation Formula

Typical CTC calculation:
```
Annual CTC = Basic Salary × 12 + HRA × 12 + Conveyance × 12 + Special × 12 + Other × 12 + (Employer PF + Gratuity + Bonus)

Monthly CTC = Annual CTC / 12
```

### Typical Workflow

1. **Employee Onboarding**: Create salary details when hiring a new employee
2. **Salary Revision**: Update salary details during annual appraisals or promotions
3. **Payroll Processing**: Retrieve salary details for monthly payroll calculations
4. **Reporting**: Query salary details for compensation reports and analytics
5. **Compliance**: Maintain records for tax and audit purposes

### Integration Points

- **User/Employee Model**: Link salary details to employee records via reference
- **Payroll System**: Use salary details for monthly salary processing
- **Tax Calculation**: Calculate tax deductions based on salary components
- **HR Analytics**: Generate compensation reports and statistics
- **Appraisal System**: Update salary details based on performance reviews

### Best Practices

1. **Security**: Implement strict access control - only HR and authorized personnel should access salary data
2. **Audit Trail**: Maintain history of salary changes with timestamps and user who made changes
3. **Validation**: Ensure monthlyCTC = annualCTC / 12 and validate component totals
4. **Encryption**: Consider encrypting sensitive salary data at rest
5. **Compliance**: Follow local labor laws and tax regulations
6. **Privacy**: Never expose salary details in logs or error messages
7. **Versioning**: Consider maintaining salary history for each employee

### Common Use Cases

**Salary Increment**
```json
PATCH /v1/salary-details/507f1f77bcf86cd799439013
{
  "basicSalary": 60000,
  "annualCTC": 900000,
  "monthlyCTC": 75000
}
```

**Allowance Adjustment**
```json
PATCH /v1/salary-details/507f1f77bcf86cd799439013
{
  "houseRentAllowance": 18000,
  "conveyanceAllowance": 2500
}
```

**Bulk Salary Report**
```
GET /v1/salary-details?sortBy=annualCTC:desc&limit=100
```

### Security Considerations

- Implement role-based access control (RBAC)
- Log all salary data access and modifications
- Use HTTPS for all API communications
- Mask salary details in non-production environments
- Implement rate limiting to prevent data scraping
- Regular security audits of salary data access patterns
