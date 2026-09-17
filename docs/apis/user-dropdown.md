# User Dropdown API

## Overview
This API provides a lightweight dropdown endpoint for fetching users filtered by role (agent, staff, employee). It returns minimal user data optimized for dropdown/select components in the frontend.

## Endpoint

### Get Users for Dropdown
**GET** `/v1/users/dropdown`

Returns a list of users with minimal information, filtered by role and optional search term.

#### Query Parameters

| Parameter | Type   | Required | Description                                                                 |
|-----------|--------|----------|-----------------------------------------------------------------------------|
| `role`    | string | No       | Filter by role. Single value or comma-separated (e.g., `agent` or `agent,staff,employee`). Valid values: `agent`, `staff`, `employee` |
| `search`  | string | No       | Search term to filter by name, email, or employeeId (case-insensitive)     |

#### Response Format

Returns an array of user objects with minimal fields:

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "employeeId": "EMP001",
    "role": "employee",
    "email": "john.doe@example.com",
    "profilePic": "https://example.com/profile.jpg"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Jane Smith",
    "employeeId": "STF001",
    "role": "staff",
    "email": "jane.smith@example.com",
    "profilePic": null
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Bob Agent",
    "employeeId": "AGT001",
    "role": "agent",
    "email": "bob.agent@example.com",
    "profilePic": "https://example.com/agent-profile.jpg"
  }
]
```

## Usage Examples

### Example 1: Get all agents
```bash
GET /v1/users/dropdown?role=agent
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Bob Agent",
    "employeeId": "AGT001",
    "role": "agent",
    "email": "bob.agent@example.com",
    "profilePic": "https://example.com/agent-profile.jpg"
  }
]
```

### Example 2: Get all staff
```bash
GET /v1/users/dropdown?role=staff
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Jane Smith",
    "employeeId": "STF001",
    "role": "staff",
    "email": "jane.smith@example.com",
    "profilePic": null
  }
]
```

### Example 3: Get all employees
```bash
GET /v1/users/dropdown?role=employee
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "employeeId": "EMP001",
    "role": "employee",
    "email": "john.doe@example.com",
    "profilePic": "https://example.com/profile.jpg"
  }
]
```

### Example 4: Get all agents, staff, and employees
```bash
GET /v1/users/dropdown?role=agent,staff,employee
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Bob Agent",
    "employeeId": "AGT001",
    "role": "agent",
    "email": "bob.agent@example.com",
    "profilePic": "https://example.com/agent-profile.jpg"
  },
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "employeeId": "EMP001",
    "role": "employee",
    "email": "john.doe@example.com",
    "profilePic": "https://example.com/profile.jpg"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Jane Smith",
    "employeeId": "STF001",
    "role": "staff",
    "email": "jane.smith@example.com",
    "profilePic": null
  }
]
```

### Example 5: Search for users with "john"
```bash
GET /v1/users/dropdown?search=john
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "employeeId": "EMP001",
    "role": "employee",
    "email": "john.doe@example.com",
    "profilePic": "https://example.com/profile.jpg"
  }
]
```

### Example 6: Get agents and staff, filtered by search
```bash
GET /v1/users/dropdown?role=agent,staff&search=smith
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Jane Smith",
    "employeeId": "STF001",
    "role": "staff",
    "email": "jane.smith@example.com",
    "profilePic": null
  }
]
```

## Frontend Integration

### React/JavaScript Example

```javascript
// Fetch agents for dropdown
const fetchAgents = async () => {
  try {
    const response = await fetch('/v1/users/dropdown?role=agent');
    const agents = await response.json();
    return agents.map(agent => ({
      value: agent._id,
      label: `${agent.name} (${agent.employeeId})`,
      email: agent.email
    }));
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
};

// Fetch staff for dropdown
const fetchStaff = async () => {
  try {
    const response = await fetch('/v1/users/dropdown?role=staff');
    const staff = await response.json();
    return staff.map(member => ({
      value: member._id,
      label: `${member.name} (${member.employeeId})`,
      email: member.email
    }));
  } catch (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
};

// Fetch all users (agents, staff, employees)
const fetchAllUsers = async () => {
  try {
    const response = await fetch('/v1/users/dropdown?role=agent,staff,employee');
    const users = await response.json();
    return users.map(user => ({
      value: user._id,
      label: `${user.name} (${user.employeeId})`,
      role: user.role,
      email: user.email
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Search users
const searchUsers = async (searchTerm) => {
  try {
    const response = await fetch(`/v1/users/dropdown?role=agent,staff,employee&search=${encodeURIComponent(searchTerm)}`);
    const users = await response.json();
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};
```

### React Select Component Example

```javascript
import Select from 'react-select';
import { useState, useEffect } from 'react';

const UserDropdown = ({ roleFilter = 'agent,staff,employee', onChange }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/v1/users/dropdown?role=${roleFilter}`);
        const users = await response.json();
        const formattedOptions = users.map(user => ({
          value: user._id,
          label: `${user.name} (${user.employeeId})`,
          data: user
        }));
        setOptions(formattedOptions);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [roleFilter]);

  const handleSearch = async (inputValue) => {
    if (!inputValue) return options;
    
    try {
      const response = await fetch(`/v1/users/dropdown?role=${roleFilter}&search=${encodeURIComponent(inputValue)}`);
      const users = await response.json();
      return users.map(user => ({
        value: user._id,
        label: `${user.name} (${user.employeeId})`,
        data: user
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  return (
    <Select
      options={options}
      onChange={onChange}
      isLoading={loading}
      placeholder="Select user..."
      loadOptions={handleSearch}
      isSearchable
      isClearable
    />
  );
};

// Usage
<UserDropdown 
  roleFilter="agent" 
  onChange={(selected) => console.log('Selected agent:', selected)} 
/>

<UserDropdown 
  roleFilter="staff" 
  onChange={(selected) => console.log('Selected staff:', selected)} 
/>

<UserDropdown 
  roleFilter="employee" 
  onChange={(selected) => console.log('Selected employee:', selected)} 
/>

<UserDropdown 
  roleFilter="agent,staff,employee" 
  onChange={(selected) => console.log('Selected user:', selected)} 
/>
```

## Notes

- Results are sorted alphabetically by name
- The search filter matches against name, email, and employeeId (case-insensitive)
- Only users with roles `agent`, `staff`, or `employee` are returned
- The API returns minimal data to optimize performance for dropdown components
- No pagination is applied - all matching users are returned
- Profile pictures may be `null` if not set

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Validation error"
}
```

### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "Internal server error"
}
```
