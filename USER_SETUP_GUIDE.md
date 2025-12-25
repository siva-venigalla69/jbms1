# User Setup and Administration Guide
## Digital Textile Printing Management System

**Version**: 3.0.0
**Last Updated**: 2025-12-21

---

## Table of Contents
1. [Overview](#overview)
2. [Admin User Setup](#admin-user-setup)
3. [Creating Additional Users](#creating-additional-users)
4. [User Roles and Permissions](#user-roles-and-permissions)
5. [Login Process](#login-process)
6. [User Management](#user-management)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Authentication System
The system uses **Supabase Authentication** for user management:
- **Platform**: Supabase Auth (auth.users table)
- **Method**: Email + Password
- **Session**: JWT token stored in localStorage
- **Security**: Row Level Security (RLS) policies

### Current Status
```
⚠️ No default admin user created yet
✅ Authentication system configured
✅ Login page functional
⏳ Requires manual admin user creation
```

---

## Admin User Setup

### Method 1: Create Admin via Supabase Dashboard (Recommended)

This is the **easiest** way to create your first admin user.

#### Step 1: Access Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Log in with your Supabase account
3. Select project: **pvatfzwzfgioypdnqjay**

#### Step 2: Navigate to Authentication

1. Click **Authentication** in the left sidebar
2. Click **Users** tab
3. Click **Add User** button (or **Invite User**)

#### Step 3: Create Admin User

Fill in the form:

```
Email: admin@yourdomain.com
Password: [Create a strong password]
Auto Confirm User: ✅ YES (check this box)
```

**Recommended credentials**:
```
Email: admin@dtpms.com
Password: Admin@123!
```

Click **Create User** or **Send Invitation**

#### Step 4: Verify User Created

1. You should see the user in the users list
2. Status should be "Confirmed"
3. Note the user's UUID (you'll need this)

#### Step 5: Test Login

1. Go to your app: http://localhost:3000
2. Click login
3. Enter credentials:
   - Email: admin@dtpms.com
   - Password: Admin@123!
4. You should be logged in successfully!

---

### Method 2: Create Admin via SQL (Advanced)

For more control, create the user directly in the database.

#### Step 1: Access SQL Editor

1. Go to https://supabase.com/dashboard/project/pvatfzwzfgioypdnqjay
2. Click **SQL Editor** in left sidebar
3. Click **New Query**

#### Step 2: Run User Creation Script

```sql
-- Create admin user in Supabase Auth
-- Replace email and password as needed

-- Note: Supabase will automatically hash the password
-- Just provide the plain text password here

-- This creates a confirmed user ready to log in
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@dtpms.com', -- Change this to your admin email
  crypt('Admin@123!', gen_salt('bf')), -- Change this to your password
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"System Administrator"}',
  NULL,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
);
```

#### Step 3: Verify Creation

```sql
-- Check if user was created
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'admin@dtpms.com';
```

You should see one row with your admin email.

---

### Method 3: Create Admin via Supabase CLI

If you have Supabase CLI installed:

```bash
# Create user via CLI
supabase db execute "
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, role, aud
) VALUES (
  gen_random_uuid(),
  'admin@dtpms.com',
  crypt('Admin@123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  'authenticated', 'authenticated'
);
"
```

---

## Creating Additional Users

### For Each New User

#### Method 1: Via Dashboard (Easiest)

1. Go to Supabase Dashboard → Authentication → Users
2. Click **Add User**
3. Fill in details:
   ```
   Email: user@example.com
   Password: [Strong password]
   Auto Confirm: ✅ YES
   ```
4. Click **Create User**

#### Method 2: Via SQL

```sql
-- Create a new user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'employee@dtpms.com', -- User email
  crypt('Employee@123', gen_salt('bf')), -- User password
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Employee Name"}',
  NOW(),
  NOW()
);
```

---

## User Roles and Permissions

### Current Implementation

The simplified system has basic authentication but **no role-based access control (RBAC) yet**.

All authenticated users have the same permissions:
- ✅ Can access all pages
- ✅ Can perform all operations
- ❌ No role differentiation (admin vs employee)

### Future Enhancement: Role-Based Access

To implement roles, you would need to:

#### Step 1: Create users table

```sql
-- Create a users profile table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Only admins can update user roles
CREATE POLICY "Admins can update users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### Step 2: Create user profiles

```sql
-- Create profile for admin user
INSERT INTO public.users (id, email, full_name, role)
SELECT
  id,
  email,
  'System Administrator',
  'admin'
FROM auth.users
WHERE email = 'admin@dtpms.com';

-- Create profile for employee
INSERT INTO public.users (id, email, full_name, role)
SELECT
  id,
  email,
  'Employee Name',
  'employee'
FROM auth.users
WHERE email = 'employee@dtpms.com';
```

#### Step 3: Update AuthContext to include role

Modify `frontend/src/lib/supabase.ts` to fetch user role:

```typescript
export const authHelpers = {
  getCurrentUser: async (): Promise<{ user: User | null; error: any }> => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return { user: null, error: authError };
      }

      // Get user profile with role
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        // Create basic user if no profile
        const basicUser: User = {
          id: authUser.id,
          email: authUser.email || '',
          role: 'employee',
        };
        return { user: basicUser, error: null };
      }

      return { user: userProfile as User, error: null };
    } catch (error) {
      return { user: null, error };
    }
  },
};
```

---

## Login Process

### How to Login

#### Step 1: Start the Application

```bash
cd /home/siva/sandboxes/jbms1/frontend
npm start
```

#### Step 2: Access Login Page

Open browser: http://localhost:3000

You'll be automatically redirected to `/login`

#### Step 3: Enter Credentials

```
Email: admin@dtpms.com
Password: Admin@123!
```

Click **Login** or press Enter

#### Step 4: Verify Login Success

Upon successful login:
- ✅ You'll be redirected to `/dashboard`
- ✅ Navigation menu will appear
- ✅ User icon shows in top-right
- ✅ Access token stored in localStorage

### What Happens Behind the Scenes

1. **Frontend** calls `supabase.auth.signInWithPassword()`
2. **Supabase Auth** validates credentials
3. **Returns** JWT access token + refresh token
4. **Frontend** stores token in localStorage
5. **AuthContext** updates state with user info
6. **ProtectedRoute** allows access to protected pages

---

## User Management

### List All Users

#### Via Supabase Dashboard
1. Go to Authentication → Users
2. View all registered users

#### Via SQL
```sql
-- List all users
SELECT
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at
FROM auth.users
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
```

### Change User Password

#### Via Dashboard
1. Go to Authentication → Users
2. Click on user
3. Click **Reset Password**
4. Enter new password
5. Click **Update User**

#### Via SQL
```sql
-- Update password for a user
UPDATE auth.users
SET encrypted_password = crypt('NewPassword@123', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'user@example.com';
```

### Disable User

```sql
-- Soft delete - user cannot login
UPDATE auth.users
SET banned_until = '2099-12-31'
WHERE email = 'user@example.com';
```

### Delete User

```sql
-- Hard delete - permanent removal
DELETE FROM auth.users
WHERE email = 'user@example.com';
```

---

## Where to Configure Admin User

### Configuration Locations

#### 1. Supabase Dashboard
**Primary location for user management**

```
URL: https://supabase.com/dashboard/project/pvatfzwzfgioypdnqjay
Path: Authentication → Users → [Select User]

Actions Available:
- Create new users
- Reset passwords
- View user metadata
- Ban/unban users
- Delete users
```

#### 2. Database (auth.users table)
**Direct database access**

```sql
-- Access auth.users via SQL Editor
SELECT * FROM auth.users;
```

#### 3. Frontend Code
**User interface modifications**

```
Location: /home/siva/sandboxes/jbms1/frontend/src/
Files:
- context/AuthContext.tsx (auth logic)
- lib/supabase.ts (auth helpers)
- pages/Login.tsx (login UI)
```

#### 4. Environment Variables
**API configuration**

```
Location: /home/siva/sandboxes/jbms1/frontend/.env
Variables:
- REACT_APP_SUPABASE_URL (database URL)
- REACT_APP_SUPABASE_ANON_KEY (public API key)
```

---

## Default Credentials (After Setup)

### Recommended Admin Account

```
Email: admin@dtpms.com
Password: Admin@123!
Role: Admin (if roles implemented)
Full Name: System Administrator
```

### Test Accounts (Optional)

```
Manager Account:
Email: manager@dtpms.com
Password: Manager@123
Role: Manager

Employee Account:
Email: employee@dtpms.com
Password: Employee@123
Role: Employee
```

---

## Security Best Practices

### 1. Password Requirements

✅ **Recommended**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@, !, #, etc.)

Example: `Admin@123!`

### 2. Email Confirmation

For production:
```
Supabase Dashboard → Authentication → Settings:
✅ Enable email confirmations
✅ Require email verification before login
```

For development:
```
❌ Disable email confirmations (faster testing)
```

### 3. Session Management

**Default Settings**:
- JWT expiry: 1 hour
- Refresh token expiry: 30 days
- Auto-refresh: Enabled

**To customize** (in Supabase Dashboard):
```
Authentication → Settings → JWT Settings:
- JWT expiry: [Customize time]
- Refresh token rotation: Enabled
```

### 4. Multi-Factor Authentication (Future)

Supabase supports MFA:
```
Authentication → Settings → Multi-Factor Authentication:
✅ Enable MFA
Options: SMS, TOTP (Google Authenticator)
```

---

## Troubleshooting

### Issue: Cannot create admin user via SQL

**Symptom**: Error about `crypt` function not found

**Solution**: Make sure pgcrypto extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Issue: Login fails with "Invalid credentials"

**Possible causes**:
1. Wrong email/password
2. Email not confirmed
3. User doesn't exist
4. User is banned

**Debug steps**:
```sql
-- Check if user exists
SELECT email, email_confirmed_at, banned_until
FROM auth.users
WHERE email = 'your-email@example.com';
```

### Issue: User created but can't login

**Solution**: Ensure email is confirmed:
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-email@example.com'
AND email_confirmed_at IS NULL;
```

### Issue: Logged in but redirected back to login

**Possible causes**:
1. Token expired
2. ProtectedRoute not working
3. Auth state not persisting

**Debug steps**:
1. Check browser console for errors
2. Check localStorage for `supabase.auth.token`
3. Try clearing localStorage and logging in again

### Issue: Need to reset password but forgot email

**Solution**: Query users table:
```sql
-- List all emails
SELECT email FROM auth.users ORDER BY created_at;
```

---

## Quick Reference

### Create Admin User (Quickest Method)

```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'admin@dtpms.com',
  crypt('Admin@123!', gen_salt('bf')),
  NOW(), NOW(), NOW()
);
```

### Test Login

```
URL: http://localhost:3000/login
Email: admin@dtpms.com
Password: Admin@123!
```

### Check if Admin Exists

```sql
SELECT email, email_confirmed_at
FROM auth.users
WHERE email = 'admin@dtpms.com';
```

---

## Next Steps

After creating admin user:

1. ✅ **Test login** at http://localhost:3000
2. ✅ **Create additional users** for your team
3. ✅ **Test all pages** (dashboard, orders, etc.)
4. ⏳ **Implement roles** (optional, for access control)
5. ⏳ **Enable email confirmation** (for production)
6. ⏳ **Setup MFA** (for enhanced security)

---

**End of Guide**

For more information, see:
- [Test Data Management Guide](TEST_DATA_MANAGEMENT_GUIDE.md)
- [Backend Architecture](BACKEND_ARCHITECTURE.md)
- [Comprehensive Test Results](COMPREHENSIVE_TEST_RESULTS.md)
