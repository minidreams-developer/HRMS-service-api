# Auth API

Base URL: `/v1/auth`

---

## Register

**POST** `/v1/auth/register`

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password1",
  "phone": "9876543210",
  "gender": "male",
  "role": "employee"
}
```

| Field      | Type     | Required | Description                                      |
|------------|----------|----------|--------------------------------------------------|
| `name`     | `string` | yes      | Full name                                        |
| `email`    | `string` | yes      | Unique email address                             |
| `password` | `string` | yes      | Min 8 chars, must contain a letter and a number  |
| `phone`    | `string` | yes      | Phone number                                     |
| `gender`   | `string` | yes      | `male` or `female`                               |
| `role`     | `string` | yes      | User role e.g. `employee`, `admin`               |

### Response `201`

```json
{
  "user": {
    "id": "664f1b2c8e4a2b001c8d0001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "employee",
    "isEmailVerified": false
  },
  "tokens": {
    "access": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires": "2024-06-08T10:00:00.000Z"
    },
    "refresh": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires": "2024-07-01T10:00:00.000Z"
    }
  }
}
```

### Response `400` — duplicate email
```json
{ "code": 400, "message": "Email already taken" }
```

---

## Login

**POST** `/v1/auth/login`

### Request Body

```json
{
  "email": "john@example.com",
  "password": "password1"
}
```

| Field      | Type     | Required | Description    |
|------------|----------|----------|----------------|
| `email`    | `string` | yes      | User email     |
| `password` | `string` | yes      | User password  |

### Response `200`

```json
{
  "user": {
    "id": "664f1b2c8e4a2b001c8d0001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "employee",
    "isEmailVerified": false
  },
  "tokens": {
    "access": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires": "2024-06-08T10:00:00.000Z"
    },
    "refresh": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires": "2024-07-01T10:00:00.000Z"
    }
  }
}
```

### Response `401`
```json
{ "code": 401, "message": "Incorrect email or password" }
```

---

## Google Login

**POST** `/v1/auth/google-login`

### Request Body

```json
{
  "idToken": "google-id-token-string"
}
```

| Field     | Type     | Required | Description                    |
|-----------|----------|----------|--------------------------------|
| `idToken` | `string` | yes      | Google OAuth ID token          |

### Response `200`
Same shape as Login response — returns `user` and `tokens`.

---

## Logout

**POST** `/v1/auth/logout`

Invalidates the refresh token.

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Field          | Type     | Required | Description           |
|----------------|----------|----------|-----------------------|
| `refreshToken` | `string` | yes      | Active refresh token  |

### Response `204`
No content.

### Response `404`
```json
{ "code": 404, "message": "Not found" }
```

---

## Refresh Tokens

**POST** `/v1/auth/refresh-tokens`

Issues a new access/refresh token pair. The old refresh token is invalidated.

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Field          | Type     | Required | Description           |
|----------------|----------|----------|-----------------------|
| `refreshToken` | `string` | yes      | Active refresh token  |

### Response `200`

```json
{
  "access": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires": "2024-06-08T11:00:00.000Z"
  },
  "refresh": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires": "2024-07-01T10:00:00.000Z"
  }
}
```

### Response `401`
```json
{ "code": 401, "message": "Please authenticate" }
```

---

## Forgot Password

**POST** `/v1/auth/forgot-password`

Sends a password reset email to the provided address.

### Request Body

```json
{
  "email": "john@example.com"
}
```

| Field   | Type     | Required | Description         |
|---------|----------|----------|---------------------|
| `email` | `string` | yes      | Registered email    |

### Response `204`
No content. Email sent.

### Response `404`
```json
{ "code": 404, "message": "No users found with this email" }
```

---

## Reset Password

**POST** `/v1/auth/reset-password?token=<reset-token>`

### Query Parameter

| Param   | Type     | Required | Description                          |
|---------|----------|----------|--------------------------------------|
| `token` | `string` | yes      | Password reset token from email link |

### Request Body

```json
{
  "password": "newpassword1"
}
```

| Field      | Type     | Required | Description                                     |
|------------|----------|----------|-------------------------------------------------|
| `password` | `string` | yes      | New password — min 8 chars, letter + number     |

### Response `204`
No content. Password updated.

### Response `401`
```json
{ "code": 401, "message": "Password reset failed" }
```

---

## Send Verification Email

**POST** `/v1/auth/send-verification-email`

Requires a valid Bearer token. Sends an email verification link to the authenticated user's email.

### Headers

```
Authorization: Bearer <access-token>
```

### Response `204`
No content. Email sent.

### Response `401`
```json
{ "code": 401, "message": "Please authenticate" }
```

---

## Verify Email

**POST** `/v1/auth/verify-email?token=<verify-token>`

### Query Parameter

| Param   | Type     | Required | Description                              |
|---------|----------|----------|------------------------------------------|
| `token` | `string` | yes      | Email verification token from email link |

### Response `204`
No content. Email verified.

### Response `401`
```json
{ "code": 401, "message": "Email verification failed" }
```

---

## Token Structure

All authenticated endpoints require the access token in the `Authorization` header:

```
Authorization: Bearer <access-token>
```

| Token Type | Lifetime | Description                                      |
|------------|----------|--------------------------------------------------|
| `access`   | Short    | Used for API requests                            |
| `refresh`  | Long     | Used to obtain a new access token after expiry   |

---

## Instructions

### Typical login flow

1. `POST /v1/auth/login` with email and password.
2. Store the `access.token` and `refresh.token` from the response.
3. Include `Authorization: Bearer <access.token>` on all subsequent requests.
4. When the access token expires, call `POST /v1/auth/refresh-tokens` with the refresh token to get a new pair.
5. On logout, call `POST /v1/auth/logout` with the refresh token to invalidate it.

### Password requirements

- Minimum 8 characters
- Must contain at least one letter and one number
