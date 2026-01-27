# Super Admin Setup Guide

## Overview

FormFlow uses a role-based access control system where **Super Admins** have system-wide privileges to:
- Create and manage organizations
- Create and manage users
- Assign users to organizations
- View all submissions across all organizations
- Promote/demote other super admins

Regular users **cannot self-register**. All user accounts must be created by a Super Admin through the admin dashboard.

## Initial Setup: Creating the First Super Admin

### Step 1: Configure Environment Variables

Edit your `.env` file and add the following variables:

```bash
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your-secure-password-here
SUPER_ADMIN_NAME=System Administrator
```

**Important:**
- Use a **strong password** (minimum 8 characters)
- Use a **real email address** you have access to
- Keep these credentials **secure**

### Step 2: Run the Migration Script

Execute the migration script to create the initial super admin:

```bash
pnpm migrate:create-super-admin
```

You should see output like:
```
Creating initial Super Admin user...

  Email: admin@yourdomain.com
  Name: System Administrator

✓ Database connected.
✓ Super Admin user created successfully!

User details:
  ID: 1
  Email: admin@yourdomain.com
  Name: System Administrator
  Super Admin: true
  Organization: None (system-wide access)

✓ Setup complete! You can now log in with these credentials.
```

### Step 3: Log In

1. Navigate to `http://localhost:4200/login` (or your production URL)
2. Click "Login with Telegram" or use email/password login
3. You'll be redirected to the dashboard
4. Click the "Admin" link in the navigation to access admin features

## Creating Additional Users

### Via Admin Dashboard

1. Log in as a Super Admin
2. Navigate to **Admin → Users**
3. Click **"+ New User"**
4. Fill in the form:
   - **Email**: User's email address (required)
   - **Password**: Initial password (required, min 8 characters)
   - **Name**: User's display name (optional)
   - **Organization**: Select from dropdown (required)
   - **Role**: Choose "Member" or "Organization Admin" (required)
5. Click **"Create User"**

### Role Differences

- **Member**: Can view and manage forms/submissions within their organization
- **Organization Admin**: Can manage forms, users, and settings within their organization
- **Super Admin**: System-wide access to all organizations and admin features

## Creating Additional Organizations

1. Log in as a Super Admin
2. Navigate to **Admin → Organizations**
3. Click **"+ New Organization"**
4. Fill in:
   - **Name**: Organization display name
   - **Slug**: URL-friendly identifier (lowercase, alphanumeric, hyphens)
   - **Max Forms**: Limit or leave blank for unlimited
   - **Max Submissions Per Month**: Limit or leave blank for unlimited
5. Click **"Create"**

## Promoting Users to Super Admin

1. Navigate to **Admin → Users**
2. Find the user in the list
3. Toggle the "Super Admin" switch
4. The user will immediately have super admin privileges

## Security Best Practices

1. **Limit Super Admins**: Only promote trusted users to super admin status
2. **Use Strong Passwords**: Enforce 8+ character passwords with complexity
3. **Rotate Credentials**: Change super admin passwords regularly
4. **Monitor Access**: Review admin actions periodically
5. **Remove Access**: Disable inactive users promptly

## Troubleshooting

### "A super admin user already exists"

If you see this message, a super admin has already been created. Use the existing credentials or manually update the database.

### "Missing required environment variables"

Ensure all three environment variables are set in your `.env` file:
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_NAME` (optional, defaults to "Super Admin")

### Cannot Access Admin Pages

1. Verify you're logged in as a super admin
2. Check the browser console for errors
3. Verify the user has `isSuperAdmin: true` in the database:
   ```sql
   SELECT id, email, "isSuperAdmin" FROM "user" WHERE email = 'your@email.com';
   ```

### Forgot Super Admin Password

If you lose access to your super admin account:

**Option 1: Database Update**
1. Access your database directly
2. Find your user: `SELECT * FROM "user" WHERE "isSuperAdmin" = true;`
3. Use bcrypt to hash a new password (bcrypt.hash with 10 rounds)
4. Update: `UPDATE "user" SET "passwordHash" = 'new-hash' WHERE id = 1;`

**Option 2: Re-run Migration**
1. Update `SUPER_ADMIN_EMAIL` to an existing user's email
2. Update `SUPER_ADMIN_PASSWORD` to a new password
3. Run `pnpm migrate:create-super-admin`
4. The script will promote the existing user to super admin

## User Management Workflow

### Recommended Setup Flow

1. **Create Organizations First**
   - Navigate to Admin → Organizations
   - Create all necessary organizations

2. **Create Users Second**
   - Navigate to Admin → Users → + New User
   - Assign each user to their appropriate organization
   - Set their role (Member or Organization Admin)

3. **Promote Super Admins** (if needed)
   - Only promote trusted team members
   - Toggle the Super Admin switch for the user

### Offboarding Users

When users leave:
1. **Option 1**: Delete the user (if allowed by your data retention policy)
2. **Option 2**: Remove them from their organization (sets organizationId to null)
3. **Option 3**: Deactivate their organization (prevents all members from accessing)

## API Endpoints (For Reference)

All admin endpoints require:
- Authentication (JWT token)
- Super Admin status (`isSuperAdmin: true`)

### User Management
- `POST /admin/users` - Create new user
- `GET /admin/users` - List all users (paginated)
- `PUT /admin/users/:id/super-admin` - Toggle super admin status

### Organization Management
- `POST /admin/organizations` - Create organization
- `GET /admin/organizations` - List all organizations (paginated)
- `GET /admin/organizations/:id` - Get organization details
- `PUT /admin/organizations/:id` - Update organization
- `DELETE /admin/organizations/:id` - Deactivate organization

### System Stats
- `GET /admin/stats` - View system-wide statistics

## Need Help?

If you encounter issues not covered in this guide:
1. Check the server logs for error messages
2. Verify your database connection is working
3. Ensure all environment variables are correctly set
4. Check the browser console for client-side errors
5. Review [SECURITY.md](SECURITY.md) for authentication details
6. Check [DOCKER.md](DOCKER.md) for deployment troubleshooting
