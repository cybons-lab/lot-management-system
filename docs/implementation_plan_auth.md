# Authentication and Client Logging Implementation Plan

## Goal
Implement simplified authentication (local user switching) and client-side logging, designed for future Azure AD integration.

## 1. Database Schema Changes (DDL)

We will modify the `users` table to be compatible with future OAuth/OIDC flows and create a new `system_client_logs` table.

### users (Modification)
- Add `auth_provider`: To distinguish between 'local' and 'azure'.
- Add `azure_object_id`: To map future Azure AD users (VARCHAR(100), UNIQUE).
- Modify `password_hash`: Make nullable.

```sql
-- Migration: upgrade_auth_schema.sql

-- 1. Add Azure AD related columns to users
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN azure_object_id VARCHAR(100);

-- 2. Relax password requirement
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Create indices/constraints
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE UNIQUE INDEX idx_users_azure_oid ON users(azure_object_id);
-- Note: email is already unique in existing schema

-- 4. Create system_client_logs (Renamed from client_logs)
CREATE TABLE system_client_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_agent VARCHAR(255)
);

CREATE INDEX idx_system_client_logs_created_at ON system_client_logs(created_at);
CREATE INDEX idx_system_client_logs_user_id ON system_client_logs(user_id);
```

### system_client_logs (New)
- Store logs sent from the frontend. (Renamed from `client_logs`)

```sql
CREATE TABLE system_client_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_agent VARCHAR(255)
);

CREATE INDEX idx_system_client_logs_created_at ON system_client_logs(created_at);
CREATE INDEX idx_system_client_logs_user_id ON system_client_logs(user_id);
```

## 2. Authentication System

### Backend (`/auth`)
- **Library**: `pyjwt` for Token handling, `passlib` (optional) if we used passwords.
- **API**:
    - `POST /auth/login`:
        - Input: `{ "user_id": int }` (Simplified for dev/test)
        - Logic: Fetch user, Generate JWT (sub=id, role, etc.), Update `last_login_at`.
        - Output: `{ "access_token": "...", "user": { ... } }`
    - `GET /auth/me`:
        - Logic: Verify JWT, Return current user info.
- **JWT Claims**:
    - `sub`: user_id
    - `exp`: expiration
    - `username`: username
    - `roles`: list of role strings (e.g. `["admin"]`)

### Frontend
- **AuthContext**: Global state for `user` and `token`.
- **Login Page**:
    - Fetch list of active users (`GET /users` - might need an open endpoint or simple dropdown of known test users).
    - "Login as [User]" button.
- **API Client**:
    - Interceptor to inject `Authorization: Bearer <token>`.

## 3. Client Logging System

### Backend (`/system`)
- **API**:
    - `POST /system/logs/client`:
        - Input: `{ "level": "info", "message": "..." }`
        - Logic: Insert into `client_logs` with `current_user.id`.
    - `GET /system/logs/recent`:
        - Input: Limit (default 100)
        - Logic: Query `client_logs` order by `created_at` desc.
        - Permission: Admin only.

### Frontend
- **Logger Utility**:
    - `Logger.info(msg)`, `Logger.error(msg)`.
    - Buffered sending (debounce) to avoid API spam? Or simple direct call for now.
    - Captures `console.log` / `console.error` (Optional wrapper).
- **Log Viewer**:
    - Admin UI page to show recent server-side collected client logs.

## 4. User-Supplier Assignment Display
- **API**: `GET /suppliers/{id}/primary-users` utilizing `user_supplier_assignments`.
- **Frontend**: Highlight primary users in dropdowns or lists.

## Step-by-Step Execution
1. **DB**: Apply Schema Changes (Manual SQL or Migration).
2. **Backend**: Implement Models and Auth API.
3. **Backend**: Implement Log API.
4. **Frontend**: Implement Auth Context & Login Page.
5. **Frontend**: Implement Logger & Log Viewer.
