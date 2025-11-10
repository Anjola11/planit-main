# 📋 Planit API Documentation

This documentation provides a comprehensive guide to interacting with the Planit RESTful API, covering authentication, vendor operations, planner workflows, and common utilities.

## 🔗 Base URL

| Environment | URL |
| :--- | :--- |
| **Development** | `http://localhost:5000/api` |
| **Production** | `https://planit-production-e550.up.railway.app/` |

---

## 🔒 Authentication

Most endpoints require authentication using **JWT Bearer tokens** in the `Authorization` header.

| Header | Value |
| :--- | :--- |
| `Authorization` | `Bearer <access_token>` |

---

## 📋 Table of Contents

1.  [🔐 Authentication Workflow](#-authentication-workflow)
2.  [👤 Common Endpoints (Both Roles)](#-common-endpoints-both-roles)
3.  [🏢 Vendor Workflow](#-vendor-workflow)
4.  [📅 Planner Workflow](#-planner-workflow)
    * [Event Management](#event-management)
    * [Vendor Management in Event](#vendor-management-in-event)
    * [Task Management](#task-management)
5.  [🔍 Vendor Discovery (For Planners)](#-vendor-discovery-for-planners)
6.  [📊 Error Responses](#-error-responses)
7.  [🔄 Complete Workflow Examples](#-complete-workflow-examples)
8.  [🎯 Key Notes for Frontend](#-key-notes-for-frontend)

---

## 🔐 Authentication Workflow

### 1. User Signup
* **Endpoint:** `POST /auth/signup`
* **Description:** Register a new user (vendor or planner).
* **Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe",
  "role": "vendor",  // or "planner". Defaults to "planner" if omitted or invalid.
  "phoneNumber": "+2348012345678"
}
````

  * **Success Response (201):**

<!-- end list -->

```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification code.",
  "data": {
    "userId": "abc123xyz",
    "email": "user@example.com",
    "role": "vendor",
    "emailVerified": false
  }
}
```

  * **Notes:** Password must be at least 8 characters with uppercase, lowercase, and number. OTP is sent to the provided email. User is not fully registered until email is verified.

-----

### 2\. Verify Email (OTP)

  * **Endpoint:** `POST /auth/verify-email`
  * **Description:** Verify email with OTP code sent during signup.
  * **Request Body:**

<!-- end list -->

```json
{
  "userId": "abc123xyz",
  "otp": "123456"
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "abc123xyz",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "vendor",
      "phoneNumber": "+2348012345678",
      "emailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

  * **Notes:** OTP expires in 10 minutes. After verification, user receives access and refresh tokens.

-----

### 3\. Resend OTP

  * **Endpoint:** `POST /auth/resend-otp`
  * **Description:** Resend verification OTP if expired or not received.
  * **Request Body:**

<!-- end list -->

```json
{
  "userId": "abc123xyz"
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

-----

### 4\. Login

  * **Endpoint:** `POST /auth/login`
  * **Description:** Login existing user.
  * **Request Body:**

<!-- end list -->

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "abc123xyz",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "vendor",
      "phoneNumber": "+2348012345678"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

-----

### 5\. Forgot Password

  * **Endpoint:** `POST /auth/forgot-password`
  * **Description:** Request password reset code.
  * **Request Body:**

<!-- end list -->

```json
{
  "email": "user@example.com"
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Password reset code sent to your email"
}
```

-----

### 6\. Reset Password

  * **Endpoint:** `POST /auth/reset-password`
  * **Description:** Reset password using code from email.
  * **Request Body:**

<!-- end list -->

```json
{
  "email": "user@example.com",
  "resetCode": "123456",
  "newPassword": "NewSecurePass123"
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password."
}
```

-----

### 7\. Refresh Token

  * **Endpoint:** `POST /auth/refresh`
  * **Description:** Get new access token using refresh token.
  * **Request Body:**

<!-- end list -->

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

-----

### 8\. Logout

  * **Endpoint:** `POST /auth/logout`
  * **Authentication:** Required
  * **Description:** Revokes the specific refresh token used.
  * **Request Body:**

<!-- end list -->

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

-----

### 9\. Logout All Devices

  * **Endpoint:** `POST /auth/logout-all`
  * **Authentication:** Required
  * **Description:** Revokes all refresh tokens for the current user.
  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Logged out from all devices successfully"
}
```

-----

## 👤 Common Endpoints (Both Roles)

### Get Current User Profile

  * **Endpoint:** `GET /auth/me`
  * **Authentication:** Required
  * **Description:** Get the full profile data for the logged-in user, including role-specific fields.
  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "vendor",
    "phoneNumber": "+2348012345678",
    "profilePicture": "[https://res.cloudinary.com/xxx/image/upload/](https://res.cloudinary.com/xxx/image/upload/)...",
    "emailVerified": true,
    "isActive": true,
    // ... role-specific fields (e.g., businessName for vendor, bio for planner)
  }
}
```

-----

### Update Profile

  * **Endpoint:** `PUT /auth/profile`
  * **Authentication:** Required
  * **Description:** Update general or role-specific profile fields.
  * **Request Body:** (Example for Planner)

<!-- end list -->

```json
{
  "fullName": "Jane Smith",
  "bio": "Professional event planner with 5 years experience"
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "abc123xyz",
    "email": "user@example.com",
    "fullName": "John Doe Jr.",
    // ... updated fields
  }
}
```

-----

### Upload Profile Picture

  * **Endpoint:** `PUT /auth/profile-picture`
  * **Authentication:** Required
  * **Content-Type:** `multipart/form-data`
  * **Request Body:**

| Field | Type | Description |
| :--- | :--- | :--- |
| `profilePicture` | `file` | The image file (max 5MB, JPG, PNG, WEBP). |

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "profilePicture": "[https://res.cloudinary.com/xxx/image/upload/v123/user_profiles/abc123.jpg](https://res.cloudinary.com/xxx/image/upload/v123/user_profiles/abc123.jpg)"
  }
}
```

-----

### Change Password

  * **Endpoint:** `PUT /auth/change-password`
  * **Authentication:** Required
  * **Request Body:**

<!-- end list -->

```json
{
  "currentPassword": "OldSecurePass123",
  "newPassword": "NewSecurePass456"
}
```

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Password changed successfully. Please login again."
}
```

-----

## 🏢 Vendor Workflow

### 1\. Complete Vendor Profile

  * **Endpoint:** `PUT /auth/profile`
  * **Authentication:** Required (Vendor only)
  * **Description:** Complete vendor profile after email verification.
  * **Request Body:**

<!-- end list -->

```json
{
  "businessName": "Elegant Events Photography",
  "businessDescription": "Professional event photography services with 10+ years experience",
  "category": "photography",
  "location": "Lagos, Nigeria",
  "address": {
    "street": "123 Marina Street",
    "city": "Lagos",
    "state": "Lagos State",
    "country": "Nigeria",
    "zipCode": "100001"
  },
  "cacNumber": "RC123456",
  "website": "[https://elegantevents.com](https://elegantevents.com)",
  "socialMedia": {
    "facebook": "[https://facebook.com/elegantevents](https://facebook.com/elegantevents)",
    "instagram": "[https://instagram.com/elegantevents](https://instagram.com/elegantevents)"
  },
  "services": ["Wedding Photography", "Corporate Events", "Birthday Shoots"],
  "priceRange": {
    "min": 50000,
    "max": 500000,
    "currency": "NGN"
  },
  "availability": true
}
```

  * **Categories:** `catering`, `photography`, `videography`, `venue`, `decoration`, `music`, `entertainment`, `planning`, `other`

-----

### 2\. Upload CAC Document

  * **Endpoint:** `PUT /auth/cac-document`
  * **Authentication:** Required (Vendor only)
  * **Content-Type:** `multipart/form-data`
  * **Request Body:**

| Field | Type | Description |
| :--- | :--- | :--- |
| `cacDocument` | `file` | PDF or image file (max 10MB, PDF, JPG, PNG). |

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "CAC document uploaded successfully",
  "data": {
    "cacDocument": "[https://res.cloudinary.com/xxx/image/upload/v123/cac_documents/abc123.pdf](https://res.cloudinary.com/xxx/image/upload/v123/cac_documents/abc123.pdf)"
  }
}
```

-----

### 3\. Upload Portfolio Images

  * **Endpoint:** `POST /auth/portfolio`
  * **Authentication:** Required (Vendor only)
  * **Content-Type:** `multipart/form-data`
  * **Description:** Uploads a single image and adds its URL to the vendor's portfolio array. Call multiple times for multiple images.
  * **Request Body:**

| Field | Type | Description |
| :--- | :--- | :--- |
| `portfolioImage` | `file` | The image file (max 5MB, JPG, PNG, WEBP). |

  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "message": "Portfolio image uploaded successfully",
  "data": {
    "imageUrl": "[https://res.cloudinary.com/xxx/image/upload/v123/vendor_portfolio/abc123.jpg](https://res.cloudinary.com/xxx/image/upload/v123/vendor_portfolio/abc123.jpg)"
  }
}
```

-----

### 4\. Vendor Dashboard Data

  * **Endpoint:** `GET /dashboard/vendor`
  * **Authentication:** Required (Vendor only)
  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "data": {
    "statistics": {
      "activeBookings": 5,
      "pendingBookings": 3,
      "completedBookings": 12,
      "activeTasks": 8,
      "completedTasks": 45
    },
    "profileCompletion": {
      "percentage": 85,
      "completed": false,
      "missingFields": ["CAC Document", "Portfolio Images"]
    },
    "upcomingEvents": [ /* ... */ ],
    "recentBookings": [ /* ... */ ]
  }
}
```

-----

### 5\. Get Vendor Bookings

  * **Endpoint:** `GET /dashboard/vendor/bookings`
  * **Authentication:** Required (Vendor only)
  * **Query Parameters:** `status` (optional: `pending`, `confirmed`, `declined`)
  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "event123",
      "name": "Sarah & John's Wedding",
      "date": "2025-12-15",
      "location": "Eko Hotel, Lagos",
      "vendors": [
        {
          "vendorId": "abc123xyz",
          "status": "confirmed",
          // ...
        }
      ],
      "status": "in-progress"
    }
  ]
}
```

-----

### 6\. Update Vendor Booking Status

  * **Endpoint:** `PUT /events/:id/vendors/:vendorId/status`
  * **Authentication:** Required (Vendor or Planner)
  * **Description:** Used by the vendor to accept/decline a booking.
  * **Request Body:**

<!-- end list -->

```json
{
  "status": "confirmed"  // or "pending", "declined"
}
```

-----

### 7\. Update Vendor Availability

  * **Endpoint:** `PUT /dashboard/vendor/availability`
  * **Authentication:** Required (Vendor only)
  * **Request Body:**

<!-- end list -->

```json
{
  "availability": true  // or false
}
```

-----

### 8\. Get My Assigned Tasks

  * **Endpoint:** `GET /tasks/my-tasks`
  * **Authentication:** Required (Any user assigned to a task)
  * **Query Parameters:** `status` (optional), `completed` (optional: `true` or `false`)
  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "task123",
      "title": "Setup photo booth area",
      "eventId": "event123",
      "assignedTo": { "userId": "abc123xyz", "userRole": "vendor" },
      "status": "in-progress",
      "completed": false
    }
  ]
}
```

-----

### 9\. Update Task Status (Vendor)

  * **Endpoint:** `PUT /tasks/:id/status`
  * **Authentication:** Required (Planner or assigned Vendor)
  * **Request Body:**

<!-- end list -->

```json
{
  "status": "in-progress"  // pending, in-progress, completed, cancelled
}
```

-----

## 📅 Planner Workflow

### Planner Dashboard Data

  * **Endpoint:** `GET /dashboard/planner`
  * **Authentication:** Required (Planner only)
  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalEvents": 25,
      "activeEvents": 8,
      "completedEvents": 15,
      "totalTasks": 120,
      "activeTasks": 35,
      "completedTasks": 80,
      "overdueTasks": 5
    },
    "upcomingEvents": [ /* ... */ ],
    "recentEvents": [ /* ... */ ]
  }
}
```

-----

### Event Management

| Endpoint | Method | Authentication | Description |
| :--- | :--- | :--- | :--- |
| **`/events`** | `POST` | `Planner` | **Create Event**. |
| **`/events`** | `GET` | `Planner` | **Get All Events**. Filters: `status`, `completed`, `eventType`. |
| **`/events/statistics`** | `GET` | `Planner` | **Get Event Statistics**. |
| **`/events/search`** | `GET` | `Planner` | **Search Events**. Query: `q` (search term). |
| **`/events/:id`** | `GET` | `Planner` | **Get Event by ID**. |
| **`/events/:id`** | `PUT` | `Planner` | **Update Event** details. |
| **`/events/:id`** | `DELETE` | `Planner` | **Delete Event**. |
| **`/events/:id/status`** | `PUT` | `Planner` | **Update Event Status**. Body: `{"status": "in-progress"}`. |

  * **Create Event Request Body:**

<!-- end list -->

```json
{
  "name": "Sarah & John's Wedding",
  "description": "Outdoor garden wedding ceremony",
  "date": "2025-12-15",
  "location": "Eko Hotel, Lagos",
  "budget": 5000000,
  "eventType": "wedding",
  "guestCount": 200
}
```

-----

### Vendor Management in Event

| Endpoint | Method | Authentication | Description |
| :--- | :--- | :--- | :--- |
| **`/events/:id/vendors`** | `GET` | `Planner` | **Get Event Vendors**. |
| **`/events/:id/vendors`** | `POST` | `Planner` | **Add Vendor to Event** by Vendor ID. Body: `{"vendorId": "vendor123", "role": "photographer"}`. |
| **`/events/:id/vendors/by-email`**| `POST` | `Planner` | **Add Vendor to Event** by Email. Body: `{"email": "vendor@example.com"}`. |
| **`/events/:id/vendors/:vendorId`**| `DELETE` | `Planner` | **Remove Vendor** from Event. |

-----

### Task Management

| Endpoint | Method | Authentication | Description |
| :--- | :--- | :--- | :--- |
| **`/events/:eventId/tasks`** | `POST` | `Planner` | **Create Task**. |
| **`/events/:eventId/tasks/bulk`** | `POST` | `Planner` | **Bulk Create Tasks**. |
| **`/events/:eventId/tasks`** | `GET` | `Planner/Vendor` | **Get Tasks for Event**. |
| **`/events/:eventId/tasks/statistics`** | `GET` | `Planner` | **Get Task Statistics** for event. |
| **`/tasks/:id`** | `GET` | `Planner/Vendor` | **Get Task by ID**. |
| **`/tasks/:id`** | `PUT` | `Planner` | **Update Task** details. |
| **`/tasks/:id`** | `DELETE` | `Planner` | **Delete Task**. |
| **`/tasks/:id/assign`** | `PUT` | `Planner` | **Assign Task** to a user (vendor). |
| **`/tasks/:id/assign`** | `DELETE` | `Planner` | **Unassign Task**. |
| **`/tasks/:id/complete`** | `PUT` | `Planner/Vendor` | **Mark Task as Completed**. |

  * **Create Task Request Body:**

<!-- end list -->

```json
{
  "title": "Setup photo booth area",
  "description": "Setup photo booth in the reception hall with props and backdrop",
  "dueDate": "2025-12-15T12:00:00.000Z",
  "priority": "high", // low, medium, high, urgent
  "category": "setup", // general, setup, catering, decoration, etc.
  "assignedTo": {
    "userId": "vendor123",
    "userName": "John Doe",
    "userEmail": "vendor@example.com",
    "userRole": "vendor"
  }
}
```

-----

## 🔍 Vendor Discovery (For Planners)

### Get All Vendors

  * **Endpoint:** `GET /vendors`
  * **Authentication:** Public
  * **Query Parameters:** `category`, `city`, `state`, `verified`, `availability`
  * **Success Response (200):** (Returns list of vendor profiles)

<!-- end list -->

```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "vendor123",
      "businessName": "Elegant Events Photography",
      "category": "photography",
      "location": "Lagos, Nigeria",
      "rating": 4.5,
      "verified": true,
      "availability": true
      // ... partial vendor details
    }
  ]
}
```

-----

### Search Vendors

  * **Endpoint:** `GET /vendors/search`
  * **Authentication:** Public
  * **Query Parameters:** `q` (required: Search term)

-----

### Get Vendor by ID

  * **Endpoint:** `GET /vendors/:id`
  * **Authentication:** Public
  * **Description:** Get full vendor profile, including portfolio and contact info.

-----

### Get Vendor Profile Completion

  * **Endpoint:** `GET /vendors/profile/completion`
  * **Authentication:** Required (Vendor only)
  * **Success Response (200):**

<!-- end list -->

```json
{
  "success": true,
  "data": {
    "percentage": 85,
    "completed": false,
    "missingFields": [
      "CAC Document",
      "Portfolio Images"
    ]
  }
}
```

-----

## 📊 Error Responses

All endpoints may return the following standardized error responses:

| Status Code | Error Type | Example Response |
| :--- | :--- | :--- |
| **400** | Bad Request (Validation) | `{"success": false, "message": "Validation error message", "errors": [{"field": "email", "message": "Please provide a valid email"}]}` |
| **401** | Unauthorized | `{"success": false, "message": "Token expired or invalid. Please login again."}` |
| **403** | Forbidden | `{"success": false, "message": "Access denied. Required role: planner. Your role: vendor"}` |
| **404** | Not Found | `{"success": false, "message": "Resource not found"}` |
| **409** | Conflict | `{"success": false, "message": "User with this email already exists"}` |
| **500** | Internal Server Error | `{"success": false, "message": "Internal server error"}` |

-----

## 🔄 Complete Workflow Examples

### Vendor Complete Flow

1.  **Signup** → `POST /auth/signup` (role: "vendor")
2.  **Verify Email** → `POST /auth/verify-email` (with OTP)
3.  **Complete Profile** → `PUT /auth/profile` (business details)
4.  **Upload Pictures/Docs** → `PUT /auth/profile-picture`, `PUT /auth/cac-document`, `POST /auth/portfolio` (multiple times)
5.  **View Dashboard** → `GET /dashboard/vendor`
6.  **Accept/Decline Booking** → `PUT /events/:id/vendors/:vendorId/status`
7.  **Update Availability** → `PUT /dashboard/vendor/availability`

### Planner Complete Flow

1.  **Signup** → `POST /auth/signup` (role: "planner")
2.  **Verify Email** → `POST /auth/verify-email` (with OTP)
3.  **View Dashboard** → `GET /dashboard/planner`
4.  **Create Event** → `POST /events`
5.  **Find Vendor** → `GET /vendors/search?q=photography`
6.  **Add Vendor to Event** → `POST /events/:id/vendors` (or `/by-email`)
7.  **Create Tasks** → `POST /events/:eventId/tasks/bulk`
8.  **Assign Tasks** → `PUT /tasks/:id/assign`
9.  **View Event Details** → `GET /events/:id`


<!-- end list -->

```
```
