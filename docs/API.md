# API Documentation

**Base URL:** `http://localhost:3000/api`

## Mechanisms

### Password Security

- **Hashing:** All passwords are hashed using `bcrypt` (10 rounds) before being stored in the database.
- **Storage:** Passwords are stored in the `Auth` table with `type: PASSWORD`. The system never stores plain-text passwords.

### Token Management (JWT)

The system uses a Dual-Token mechanism:

1. **Access Token:** Short-lived (15 minutes). Used to authenticate requests via the `Authorization: Bearer <token>` header.
2. **Refresh Token:** Long-lived (7 days). Used to obtain a new access token without requiring the user to re-enter their credentials.

- **Refresh Token Storage:** When a user logs in or signs up, a refresh token is generated. A **hash** of this refresh token is stored in the `Auth` table with `type: JWT`.
- **Validation:** During the `/auth/refresh` process, the system:
  - Verifies the JWT signature of the provided refresh token.
  - Extracts the `userId` from the token payload.
  - Compares the provided token against the hashed version stored in the database.

### Session Invalidation (Logout)

- When a user logs out, the system updates the `Auth` entry (`type: JWT`) for that user and sets the stored password (hashed refresh token) to `null`.
- This effectively invalidates the current refresh token, as it will no longer match the database record during a refresh attempt.

---

## Authentication Routes

### 1. Signup

Create a new user account.

- **URL:** `/auth/signup`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "username": "testuser",
    "nickname": "Test Nick",
    "password": "password123"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "user": {
      "id": "uuid",
      "username": "testuser",
      "nickname": "Test Nick"
    },
    "accessToken": "jwt_token",
    "refreshToken": "jwt_token"
  }
  ```

### 2. Login

Authenticate an existing user.

- **URL:** `/auth/login`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "username": "testuser",
    "password": "password123"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "user": {
      "id": "uuid",
      "username": "testuser",
      "nickname": "Test Nick"
    },
    "accessToken": "jwt_token",
    "refreshToken": "jwt_token"
  }
  ```

### 3. Refresh Token

Generate a new access token using a refresh token.

- **URL:** `/auth/refresh`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "refreshToken": "jwt_token"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "accessToken": "jwt_token"
  }
  ```

### 4. Logout
Invalidate the current session's refresh token.

- **URL:** `/auth/logout`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Success Response (201 Created):**
  ```json
  {
    "message": "Logged out"
  }
  ```

### 5. Validate Token
Simple check to see if an access token is still valid.

- **URL:** `/auth/validate`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Success Response (200 OK):**
  ```json
  {
    "valid": true,
    "userId": "uuid"
  }
  ```
- **Error Response (401 Unauthorized):**
  - Occurs if the token is expired or malformed.


---

## Session Routes

### 1. Create Session
Initialize a new AI chat session.

- **URL:** `/sessions`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Success Response (201 Created):**
  ```json
  {
    "session_id": "uuid",
    "question": "First AI question..."
  }
  ```

### 2. List Sessions
Get all sessions for the user.

- **URL:** `/sessions`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:**
    - `mode`: "1" to filter only active sessions, otherwise returns all.
- **Success Response (200 OK):**
  ```json
  {
    "sessions": [
      {
        "session_id": "uuid",
        "status": "active",
        "start_timestamp": "iso_date"
      }
    ]
  }
  ```

### 3. Send Message
Send a user message and get an AI response.

- **URL:** `/sessions/:sessionId/messages`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:**
  ```json
  {
    "message": "User input text..."
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "response": "AI response text...",
    "diary": "Full diary content if generated, otherwise null"
  }
  ```

### 4. Get Messages
Retrieve chat history for a session.

- **URL:** `/sessions/:sessionId/messages`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Success Response (200 OK):**
  ```json
  {
    "messages": [
      {
        "role": "user",
        "content": "...",
        "timestamp": "..."
      },
      {
        "role": "assistant",
        "content": "...",
        "timestamp": "..."
      }
    ]
  }
  ```

### 5. Update User State
Update current user states associated with a specific session.

- **URL:** `/sessions/:sessionId/user/state`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:**
  ```json
  {
    "background": "optional",
    "current_state": "optional",
    "yesterday_summary": "optional",
    "pastweek_summary": "optional"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "ok"
  }
  ```


---

## Diary Routes

### 1. Update Summarized Diary
Update the summarized content for a specific diary entry.

- **URL:** `/diary/sessions/:sessionId/user/summarized_diary`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:**
  ```json
  {
    "summarized_content": "The user felt better today after talking..."
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "ok"
  }
  ```

### 2. Get Summarized Diaries
Fetch recent summarized diary entries with optional limit (`n`) and skip (`sf`).

- **URL:** `/diary/sessions/:sessionId/user/summarized_diary`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:**
    - `n`: Number of entries to fetch (default: 1)
    - `sf`: Number of entries to skip (default: 0)
- **Success Response (200 OK):**
  ```json
  {
    "summarized_entries": ["summary 1", "summary 2", null]
  }
  ```

### 3. Get Diary Content by Session
Fetch the full diary content for a specific session ID.

- **URL:** `/diary/user/diary?id=<sessionId>`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Success Response (200 OK):**
  ```json
  {
    "diary": "Full diary content...",
    "date": "2026-03-29T12:00:00.000Z"
  }
  ```

