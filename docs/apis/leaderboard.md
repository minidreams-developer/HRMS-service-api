# Leaderboard API Documentation

## Overview
The Leaderboard API manages user points, badges, and streaks for gamification features. It tracks total points, weekly points, daily points, badges earned, and consecutive streak days for each user.

## Base URL
```
/v1/leaderboard
```

---

## Endpoints

### 1. Create Leaderboard Entry

**POST** `/v1/leaderboard`

Creates a new leaderboard entry for a user.

#### Request Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "user": "507f1f77bcf86cd799439011",
  "totalPoints": 100,
  "weekPoints": 50,
  "todayPoints": 20,
  "badges": ["early-bird", "consistent"],
  "streakDays": 5
}
```

#### Request Body Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user | ObjectId | Yes | Reference to User ID |
| totalPoints | Number | No | Total accumulated points (default: 0) |
| weekPoints | Number | No | Points earned this week (default: 0) |
| todayPoints | Number | No | Points earned today (default: 0) |
| badges | Array[String] | No | List of badge identifiers (default: []) |
| streakDays | Number | No | Consecutive days streak (default: 0) |

#### Success Response (201 Created)
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "user": "507f1f77bcf86cd799439011",
  "totalPoints": 100,
  "weekPoints": 50,
  "todayPoints": 20,
  "badges": ["early-bird", "consistent"],
  "streakDays": 5,
  "createdAt": "2026-05-14T10:30:00.000Z",
  "updatedAt": "2026-05-14T10:30:00.000Z"
}
```

#### Error Responses
- **400 Bad Request**: Invalid input data
- **500 Internal Server Error**: Server error

---

### 2. Get All Leaderboard Entries

**GET** `/v1/leaderboard`

Retrieves a paginated list of leaderboard entries with optional filtering and sorting.

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| user | ObjectId | Filter by user ID | - |
| sortBy | String | Sort by field (e.g., `totalPoints:desc`) | - |
| limit | Number | Results per page | 10 |
| page | Number | Page number | 1 |

#### Example Request
```
GET /v1/leaderboard?sortBy=totalPoints:desc&limit=20&page=1
```

#### Success Response (200 OK)
```json
{
  "results": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "user": "507f1f77bcf86cd799439011",
      "totalPoints": 500,
      "weekPoints": 150,
      "todayPoints": 30,
      "badges": ["champion", "consistent", "early-bird"],
      "streakDays": 15,
      "createdAt": "2026-05-01T10:30:00.000Z",
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

### 3. Get Leaderboard Entry by ID

**GET** `/v1/leaderboard/:leaderboardId`

Retrieves a specific leaderboard entry by its ID with populated user information.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| leaderboardId | ObjectId | Leaderboard entry ID |

#### Example Request
```
GET /v1/leaderboard/507f1f77bcf86cd799439012
```

#### Success Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "totalPoints": 500,
  "weekPoints": 150,
  "todayPoints": 30,
  "badges": ["champion", "consistent", "early-bird"],
  "streakDays": 15,
  "createdAt": "2026-05-01T10:30:00.000Z",
  "updatedAt": "2026-05-14T10:30:00.000Z"
}
```

#### Error Responses
- **404 Not Found**: Leaderboard entry not found

---

### 4. Get Leaderboard Entry by User ID

**GET** `/v1/leaderboard/user/:userId`

Retrieves the leaderboard entry for a specific user.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | ObjectId | User ID |

#### Example Request
```
GET /v1/leaderboard/user/507f1f77bcf86cd799439011
```

#### Success Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "totalPoints": 500,
  "weekPoints": 150,
  "todayPoints": 30,
  "badges": ["champion", "consistent", "early-bird"],
  "streakDays": 15,
  "createdAt": "2026-05-01T10:30:00.000Z",
  "updatedAt": "2026-05-14T10:30:00.000Z"
}
```

#### Error Responses
- **404 Not Found**: Leaderboard entry not found for this user

---

### 5. Update Leaderboard Entry

**PATCH** `/v1/leaderboard/:leaderboardId`

Updates an existing leaderboard entry. Only provided fields will be updated.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| leaderboardId | ObjectId | Leaderboard entry ID |

#### Request Body (Partial Update)
```json
{
  "totalPoints": 550,
  "weekPoints": 200,
  "todayPoints": 50,
  "badges": ["champion", "consistent", "early-bird", "weekend-warrior"],
  "streakDays": 16
}
```

#### Success Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "user": "507f1f77bcf86cd799439011",
  "totalPoints": 550,
  "weekPoints": 200,
  "todayPoints": 50,
  "badges": ["champion", "consistent", "early-bird", "weekend-warrior"],
  "streakDays": 16,
  "createdAt": "2026-05-01T10:30:00.000Z",
  "updatedAt": "2026-05-14T12:00:00.000Z"
}
```

#### Error Responses
- **400 Bad Request**: Invalid input data
- **404 Not Found**: Leaderboard entry not found

---

### 6. Delete Leaderboard Entry

**DELETE** `/v1/leaderboard/:leaderboardId`

Deletes a leaderboard entry permanently.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| leaderboardId | ObjectId | Leaderboard entry ID |

#### Example Request
```
DELETE /v1/leaderboard/507f1f77bcf86cd799439012
```

#### Success Response (204 No Content)
```
No content returned
```

#### Error Responses
- **404 Not Found**: Leaderboard entry not found

---

## How It Works

### Point System
The leaderboard tracks three types of points:
- **Total Points**: Cumulative points earned by the user across all time
- **Week Points**: Points earned in the current week (resets weekly)
- **Today Points**: Points earned today (resets daily)

### Badges
Badges are stored as an array of strings representing achievement identifiers. Common badge types:
- `early-bird`: User logs in early
- `consistent`: User maintains regular activity
- `champion`: Top performer
- `weekend-warrior`: Active on weekends

### Streak Days
Tracks consecutive days of user activity. Resets to 0 if the user misses a day.

### Typical Workflow

1. **User Registration**: Create a leaderboard entry when a new user registers
2. **Daily Activity**: Update `todayPoints` and `totalPoints` when user completes actions
3. **Streak Tracking**: Increment `streakDays` on daily login, reset if missed
4. **Badge Awards**: Add badges to the array when achievements are unlocked
5. **Weekly Reset**: Reset `weekPoints` at the start of each week
6. **Daily Reset**: Reset `todayPoints` at midnight

### Integration Points
- **User Model**: Leaderboard entries reference the User model
- **Activity Tracking**: Connect with attendance, task completion, or other activity systems
- **Notifications**: Trigger notifications when badges are earned or streaks are maintained

### Best Practices
- Use transactions when updating multiple leaderboard entries simultaneously
- Implement scheduled jobs for daily/weekly resets
- Cache top leaderboard entries for performance
- Validate badge identifiers against a predefined list
- Consider implementing point decay for inactive users
