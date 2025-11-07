# 🔐 Authentication API Documentation

## Base URL
```
/api/auth
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Message text",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 📋 Endpoints

### 1️⃣ User Registration

**POST** `/signup`

Register a new user account.

**Access:** Public

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "yourPassword123",
  "phoneNumber": "+2348123456789",
  "role": "planner"  // Optional: defaults to "planner"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "john@example.com",
      "fullName": "John Doe",
      "role": "planner",
      "phoneNumber": "+2348123456789"
    },
    "accessToken": "JWT_ACCESS_TOKEN",
    "refreshToken": "JWT_REFRESH_TOKEN"
  }
}
```

**Error Responses:**
- `409` — Email already exists
- `400` — Validation error

---

### 2️⃣ User Login

**POST** `/login`

Authenticate an existing user.

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "yourPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "email": "john@example.com",
      "fullName": "John Doe",
      "role": "planner",
      "phoneNumber": "+2348123456789"
    },
    "accessToken": "JWT_ACCESS_TOKEN",
    "refreshToken": "JWT_REFRESH_TOKEN"
  }
}
```

**Error Responses:**
- `401` — Invalid email or password
- `403` — Account deactivated

---

### 3️⃣ Refresh Token

**POST** `/refresh`

Generate a new access token using a valid refresh token.

**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "JWT_REFRESH_TOKEN"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "NEW_ACCESS_TOKEN",
    "refreshToken": "NEW_REFRESH_TOKEN"
  }
}
```

**Error Responses:**
- `401` — Invalid or expired refresh token

---

### 4️⃣ Logout

**POST** `/logout`

Logout user by revoking the provided refresh token.

**Access:** Private (requires Bearer token)

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Request Body:**
```json
{
  "refreshToken": "JWT_REFRESH_TOKEN"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 5️⃣ Logout All Devices

**POST** `/logout-all`

Logout user from all devices (revokes all refresh tokens).

**Access:** Private

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out from all devices successfully"
}
```

---

### 6️⃣ Get Current User

**GET** `/me`

Fetch the authenticated user's profile.

**Access:** Private

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "planner",
    "phoneNumber": "+2348123456789",
    "emailVerified": false,
    "createdAt": "2025-11-05T10:00:00.000Z"
  }
}
```

---

### 7️⃣ Update Profile

**PUT** `/profile`

Update user profile information.

**Access:** Private

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Request Body:**
```json
{
  "fullName": "John Updated",
  "phoneNumber": "+2349000000000"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "user_id",
    "email": "john@example.com",
    "fullName": "John Updated",
    "role": "planner",
    "phoneNumber": "+2349000000000"
  }
}
```

---

### 8️⃣ Change Password

**PUT** `/change-password`

Change the logged-in user's password.

**Access:** Private

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully. Please login again."
}
```

**Error Responses:**
- `401` — Incorrect current password

---

## 🧩 Middleware Summary

| Middleware | Purpose | Access |
|------------|---------|--------|
| `authenticate` | Verifies access token and attaches user info to `req.user` | Required for private routes |
| `optionalAuth` | Attaches user if token exists, else continues | Optional |
| `requireRole('admin')` | Restrict access to admin users | Protected routes |
| `requirePlanner`, `requireVendor`, etc. | Role-specific short forms | Protected routes |
| `requireOwnerOrAdmin('userId')` | Allows access if the authenticated user owns the resource or is admin | Protected routes |

---

## 🧠 Error Handling

| Error Type | HTTP Code | Example Message |
|------------|-----------|-----------------|
| `ValidationError` | 400 | Invalid input |
| `AuthenticationError` | 401 | Invalid or expired token |
| `AuthorizationError` | 403 | Access denied |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Duplicate entry |
| `AppError` | 500 | Internal server error |

---

## 🧱 User Roles

```javascript
const { ROLES } = require('../models/User');

ROLES = {
  ADMIN: 'admin',
  PLANNER: 'planner',
  VENDOR: 'vendor'
}
```

---

## 🔑 Authentication Flow

1. **Registration/Login** → Receive `accessToken` and `refreshToken`
2. **API Requests** → Include `Authorization: Bearer <ACCESS_TOKEN>` header
3. **Token Expiry** → Use `/refresh` endpoint with `refreshToken` to get new tokens
4. **Logout** → Call `/logout` or `/logout-all` to revoke tokens

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Access tokens are short-lived (recommended: 15 minutes)
- Refresh tokens are long-lived (recommended: 7 days)
- Passwords must meet minimum security requirements
- Phone numbers should include country code
