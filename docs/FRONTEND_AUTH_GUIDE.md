# Frontend Design & Auth Flow Guide

This guide outlines the recommended implementation for the frontend to interact with the Vently backend authentication system.

## 1. Authentication State Management

The frontend should maintain a global authentication state (e.g., via React Context, Redux, or Pinia) containing:

- `user`: Object containing `id`, `username`, and `nickname`.
- `isAuthenticated`: Boolean flag.
- `accessToken`: String (stored in memory or short-lived state).
- `refreshToken`: String (stored securely, e.g., `localStorage` or `HttpOnly` cookie if applicable).

---

## 2. Core Flows

### A. Sign-Up Flow

1. **User Input:** Collect `username`, `nickname`, and `password`.
2. **Validation:** Ensure fields meet criteria (e.g., password length > 6).
3. **API Call:** `POST /api/auth/signup`.
4. **On Success:**
   - Store `refreshToken` in `localStorage`.
   - Store `accessToken` and `user` object in global state.
   - Redirect user to the Dashboard/Home.
5. **On Error:** Display relevant error message (e.g., "Username already taken").

### B. Sign-In Flow

1. **User Input:** Collect `username` and `password`.
2. **API Call:** `POST /api/auth/login`.
3. **On Success:**
   - Store `refreshToken` in `localStorage`.
   - Store `accessToken` and `user` object in global state.
   - Redirect user to the Dashboard/Home.
4. **On Error:** Display "Invalid credentials" or other error.

### C. App Initialization (Session Restoration)

This flow occurs whenever the user opens the app or refreshes the page.

1. **Check Local Storage:** Look for a stored `refreshToken`.
2. **Case: No Token found:**
   - Redirect to `/login`.
3. **Case: Token found:**
   - **Step 1:** Call `GET /api/auth/validate` using the last known `accessToken` (if still in memory).
   - **Step 2 (If success):**
     - Proceed to the App.
   - **Step 3 (If no access token or 401 Unauthorized):**
     - Call `POST /api/auth/refresh` with the `refreshToken`.
     - **If Refresh Success:**
       - Update `accessToken` in memory.
       - Fetch `/api/user/info`.
       - Proceed to the App.
     - **If Refresh Fails (Expired or Revoked):**
       - Clear `localStorage`.
       - Redirect to `/login`.

### D. Logout Flow

1. **User Action:** Clicks "Logout".
2. **API Call:** `POST /api/auth/logout` (Authenticated with `Bearer <accessToken>`).
3. **Cleanup:**
   - Clear `accessToken` and `user` from global state.
   - Remove `refreshToken` from `localStorage`.
4. **Redirect:** Send user to the Login page.

---

## 3. Handling Token Expiration (Interceptors)

It is highly recommended to use an Axios Interceptor to handle `401 Unauthorized` errors globally:

1. **Request Interceptor:** Automatically attach the `Authorization: Bearer <accessToken>` header to every outgoing request.
2. **Response Interceptor:**
   - Listen for `401` errors.
   - If a `401` occurs, "pause" the failed request.
   - Attempt to call `/api/auth/refresh`.
   - If refresh succeeds, retry the original request with the new token.
   - If refresh fails, log the user out.

---

## 4. Protected Routes

- **Guest Routes:** (Login/Signup) Only accessible if `isAuthenticated` is `false`.
- **Private Routes:** (Dashboard/Profile) Only accessible if `isAuthenticated` is `true`. If a guest tries to access these, redirect to `/login`.
