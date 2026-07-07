# Role Access API Documentation

## Overview
The Role Access API provides endpoints for managing roles and permissions within the HRMS system. It allows administrators to create, update, delete, and manage role-based access control.

## Base URL
```
/api/v1/roles
```

## Endpoints

### 1. Create Role
**POST** `/api/v1/roles`

Create a new role with specific permissions. Permissions default to all-false if omitted.

**Request Body:**
```json
{
  "name": "HR Manager",
  "description": "Manages people hub modules",
  "user": "60f7b3b3b3b3b3b3b3b3b3b3",
  "roleId": "HRM001",
  "isSystemRole": false,
  "isDefault": false,
  "isActive": true,
  "permissions": [
    {
      "group": "peopleHub",
      "modules": [
        {
          "module": "employees",
          "enabled": true,
          "permissions": {
            "view": true,
            "add": true,
            "edit": true,
            "delete": false
          }
        },
        {
          "module": "teams",
          "enabled": true,
          "permissions": {
            "view": true,
            "add": false,
            "edit": false,
            "delete": false
          }
        }
      ]
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "name": "HR Manager",
  "description": "Manages people hub modules",
  "user": "60f7b3b3b3b3b3b3b3b3b3b3",
  "roleId": "HRM001",
  "isSystemRole": false,
  "isDefault": false,
  "isActive": true,
  "permissions": [
    {
      "group": "standalone",
      "modules": [
        {
          "module": "dashboard",
          "enabled": false,
          "permissions": {
            "view": false,
            "add": false,
            "edit": false,
            "delete": false
          }
        },
        {
          "module": "announcement",
          "enabled": false,
          "permissions": {
            "view": false,
            "add": false,
            "edit": false,
            "delete": false
          }
        }
      ]
    },
    {
      "group": "peopleHub",
      "modules": [
        {
          "module": "employees",
          "enabled": true,
          "permissions": {
            "view": true,
            "add": true,
            "edit": true,
            "delete": false
          }
        },
        {
          "module": "teams",
          "enabled": true,
          "permissions": {
            "view": true,
            "add": false,
            "edit": false,
            "delete": false
          }
        }
      ]
    }
  ],
  "createdAt": "2024-06-30T10:00:00.000Z",
  "updatedAt": "2024-06-30T10:00:00.000Z"
}
```

---

### 2. Get All Roles
**GET** `/api/v1/roles`

Retrieve all roles with optional filtering and pagination.

**Query Parameters:**
- `name` (string, optional) - Filter by role name
- `isSystemRole` (boolean, optional) - Filter by system role status
- `isDefault` (boolean, optional) - Filter by default role status
- `isActive` (boolean, optional) - Filter by active status
- `sortBy` (string, optional) - Sort by field (e.g., `name:asc`, `createdAt:desc`)
- `limit` (number, optional) - Number of results per page (default: 10)
- `page` (number, optional) - Page number (default: 1)

**Example Request:**
```
GET /api/v1/roles?isActive=true&sortBy=name:asc&limit=20&page=1
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "HR Manager",
      "description": "Manages people hub modules",
      "user": {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "John Doe",
        "email": "john@example.com",
        "employeeId": "EMP001"
      },
      "roleId": "HRM001",
      "isSystemRole": false,
      "isDefault": false,
      "isActive": true,
      "permissions": [...],
      "createdAt": "2024-06-30T10:00:00.000Z",
      "updatedAt": "2024-06-30T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "totalResults": 1
}
```

---

### 3. Get Role by ID
**GET** `/api/v1/roles/:roleId`

Retrieve a specific role by its ID.

**URL Parameters:**
- `roleId` (string, required) - The role ID

**Response:** `200 OK`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "name": "HR Manager",
  "description": "Manages people hub modules",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "employeeId": "EMP001"
  },
  "roleId": "HRM001",
  "isSystemRole": false,
  "isDefault": false,
  "isActive": true,
  "permissions": [...],
  "createdAt": "2024-06-30T10:00:00.000Z",
  "updatedAt": "2024-06-30T10:00:00.000Z"
}
```

---

### 4. Update Role
**PATCH** `/api/v1/roles/:roleId`

Update role metadata (name, description, isActive, etc.). System roles cannot be modified.

**URL Parameters:**
- `roleId` (string, required) - The role ID

**Request Body:**
```json
{
  "name": "Senior HR Manager",
  "description": "Updated description",
  "isActive": true
}
```

**Response:** `200 OK`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "name": "Senior HR Manager",
  "description": "Updated description",
  "isActive": true,
  "permissions": [...],
  "updatedAt": "2024-06-30T11:00:00.000Z"
}
```

---

### 5. Delete Role
**DELETE** `/api/v1/roles/:roleId`

Delete a role. System roles cannot be deleted.

**URL Parameters:**
- `roleId` (string, required) - The role ID

**Response:** `204 No Content`

---

### 6. Get Role Permissions
**GET** `/api/v1/roles/:roleId/permissions`

Retrieve all permissions for a specific role (full grouped structure).

**URL Parameters:**
- `roleId` (string, required) - The role ID

**Response:** `200 OK`
```json
{
  "permissions": [
    {
      "group": "standalone",
      "modules": [
        {
          "module": "dashboard",
          "enabled": false,
          "permissions": {
            "view": false,
            "add": false,
            "edit": false,
            "delete": false
          }
        },
        {
          "module": "announcement",
          "enabled": false,
          "permissions": {
            "view": false,
            "add": false,
            "edit": false,
            "delete": false
          }
        }
      ]
    },
    {
      "group": "peopleHub",
      "modules": [
        {
          "module": "employees",
          "enabled": true,
          "permissions": {
            "view": true,
            "add": true,
            "edit": true,
            "delete": false
          }
        }
      ]
    }
  ]
}
```

---

### 7. Update Role Permissions
**PATCH** `/api/v1/roles/:roleId/permissions`

Replace the entire grouped permissions array for a role.

**URL Parameters:**
- `roleId` (string, required) - The role ID

**Request Body:**
```json
{
  "permissions": [
    {
      "group": "peopleHub",
      "modules": [
        {
          "module": "employees",
          "enabled": true,
          "permissions": {
            "view": true,
            "add": true,
            "edit": true,
            "delete": true
          }
        },
        {
          "module": "attendance",
          "enabled": true,
          "permissions": {
            "view": true,
            "add": true,
            "edit": false,
            "delete": false
          }
        }
      ]
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "name": "HR Manager",
  "permissions": [...],
  "updatedAt": "2024-06-30T12:00:00.000Z"
}
```

---

### 8. Update Module Permissions
**PATCH** `/api/v1/roles/:roleId/permissions/:group/:module`

Update a single module's permissions inside a group.

**URL Parameters:**
- `roleId` (string, required) - The role ID
- `group` (string, required) - The group name (standalone | peopleHub | timeHub | payHub)
- `module` (string, required) - The module name

**Request Body:**
```json
{
  "enabled": true,
  "permissions": {
    "view": true,
    "add": true,
    "edit": false,
    "delete": false
  }
}
```

**Response:** `200 OK`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "name": "HR Manager",
  "permissions": [...],
  "updatedAt": "2024-06-30T13:00:00.000Z"
}
```

---

### 9. Reset Role Permissions
**POST** `/api/v1/roles/:roleId/permissions/reset`

Reset all permissions to the default all-false structure.

**URL Parameters:**
- `roleId` (string, required) - The role ID

**Response:** `200 OK`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
  "name": "HR Manager",
  "permissions": [...],
  "updatedAt": "2024-06-30T14:00:00.000Z"
}
```

---

### 10. Clone Role
**POST** `/api/v1/roles/:roleId/clone`

Create a copy of an existing role with a new name.

**URL Parameters:**
- `roleId` (string, required) - The role ID to clone

**Request Body:**
```json
{
  "newName": "Junior HR Manager"
}
```

**Response:** `201 Created`
```json
{
  "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
  "name": "Junior HR Manager",
  "description": "Cloned from HR Manager",
  "isSystemRole": false,
  "isDefault": false,
  "isActive": true,
  "permissions": [...],
  "createdAt": "2024-06-30T15:00:00.000Z",
  "updatedAt": "2024-06-30T15:00:00.000Z"
}
```

---

## Permission Groups and Modules

### Standalone
- dashboard
- announcement

### People Hub
- onboarding
- employees
- agents
- teams
- branch
- hierarchy
- offBoarding

### Time Hub
- attendance
- leaveAttendance
- overtimeManagement
- shiftManagement
- leaderboard
- dayOffAndHolidays

### Pay Hub
- payroll
- paysheet
- stopPayroll
- additionAndDeductions

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Role name already exists"
}
```

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Please authenticate"
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "Cannot delete system role"
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Role not found"
}
```

## Notes

1. **System Roles**: Roles marked as `isSystemRole: true` cannot be modified or deleted.
2. **Default Roles**: Roles marked as `isDefault: true` are automatically assigned to new users.
3. **Permissions Structure**: Permissions are organized into groups, each containing modules with CRUD permissions (view, add, edit, delete).
4. **Authentication**: All endpoints require authentication via Bearer token.
5. **Authorization**: Most operations require admin privileges.
