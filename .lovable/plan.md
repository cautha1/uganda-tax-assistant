

## Plan: Enhance Admin Capabilities for Full Platform Access

### Current State Analysis

The user `cauthansanyu203@gmail.com` already has all three roles (admin, sme_owner, accountant) in the database. However, the current UI doesn't provide admins with:

1. Easy navigation to both Business Owner and Accountant dashboards
2. Ability to create new users manually
3. Ability to create businesses for other users
4. A unified view of all capabilities

---

### Solution Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ENHANCED ADMIN DASHBOARD                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ QUICK ACTIONS BAR (New Section)                               │  │
│  │  [View as Owner]  [View as Accountant]  [Create User]         │  │
│  │  [Create Business]                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ EXISTING TABS (Enhanced)                                      │  │
│  │  Businesses | Users | Tax Forms | CREATE NEW TAB              │  │
│  │                                                                │  │
│  │  Users Tab now includes:                                       │  │
│  │   - Role management (existing)                                 │  │
│  │   - CREATE NEW USER button (new)                               │  │
│  │                                                                │  │
│  │  Businesses Tab now includes:                                  │  │
│  │   - View all businesses (existing)                             │  │
│  │   - CREATE BUSINESS FOR USER button (new)                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Implementation Steps

#### Step 1: Update Navbar for Admin Multi-Dashboard Access

**File:** `src/components/layout/Navbar.tsx`

Add admin-specific navigation that shows both dashboards:
- Admin with sme_owner role sees: Dashboard, Admin, Accountant View
- Replace the current `!isAccountant` logic with role-aware logic for admins

Changes:
- If user is admin, show ALL navigation options (Dashboard, Accountant, Admin, Income, Expenses)
- Add dropdown for "View As" functionality for admins

#### Step 2: Create User Dialog Component

**New File:** `src/components/admin/CreateUserDialog.tsx`

Create a dialog for admins to manually create new users with:
- Email (required)
- Name (required)
- Password (required, with confirm)
- Role selection (sme_owner, accountant, or both)
- Optional: Phone, NIN

This will use Supabase Admin API via an edge function.

#### Step 3: Create Edge Function for Admin User Creation

**New File:** `supabase/functions/admin-create-user/index.ts`

Edge function that:
- Validates admin role via JWT
- Creates user in auth.users using service role key
- Creates profile entry
- Assigns selected roles
- Logs to audit trail

#### Step 4: Create Business for Other User Dialog

**New File:** `src/components/admin/CreateBusinessForUserDialog.tsx`

Create a dialog for admins to create businesses on behalf of users:
- Select existing user (owner) from dropdown
- Enter business details (name, TIN, address, type, etc.)
- Business is assigned to selected user, not admin

#### Step 5: Enhance Admin Dashboard with Quick Actions

**File:** `src/pages/admin/AdminDashboard.tsx`

Add to the admin dashboard:
- Quick action buttons: "View as Owner", "View as Accountant"
- "Create User" button that opens CreateUserDialog
- "Create Business" button in Businesses tab that opens CreateBusinessForUserDialog
- Links to navigate to different dashboards

#### Step 6: Update Route Access for Admin

**File:** `src/App.tsx`

Ensure admin can access accountant routes:
- Update `/accountant` route to allow admin OR accountant
- This allows admin to view the accountant dashboard

---

### Technical Details

#### Files to Create

| File | Description |
|------|-------------|
| `src/components/admin/CreateUserDialog.tsx` | Dialog for creating new users |
| `src/components/admin/CreateBusinessForUserDialog.tsx` | Dialog for creating businesses on behalf of users |
| `supabase/functions/admin-create-user/index.ts` | Edge function for user creation |

#### Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/Navbar.tsx` | Add admin multi-view navigation |
| `src/pages/admin/AdminDashboard.tsx` | Add quick actions and create buttons |
| `src/App.tsx` | Allow admin access to accountant routes |
| `supabase/config.toml` | Add new edge function |

#### Database Changes

No database schema changes required. The existing RLS policies already grant admins appropriate access via the `has_role(auth.uid(), 'admin')` check.

#### Security Considerations

1. **Edge Function Security**: The admin-create-user function will:
   - Verify the caller has admin role via JWT claims
   - Use SUPABASE_SERVICE_ROLE_KEY to create users
   - Log all user creations to audit_logs

2. **RLS Already Configured**: Existing policies allow admins to:
   - View all businesses
   - View all profiles
   - Manage all user roles
   - View all tax forms

---

### UI/UX Improvements

#### Navbar Changes for Admin

```
Before (Admin sees):
  Dashboard | Tax Forms | Calculator | Admin

After (Admin sees):
  Dashboard | Accountant | Income | Expenses | Tax Forms | Calculator | Admin
```

#### Admin Dashboard Quick Actions

New section at top of admin dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│  Quick Actions                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ 📊 Owner     │ │ 👔 Accountant│ │ ➕ Create    │         │
│  │ Dashboard    │ │ Dashboard    │ │ New User    │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

#### Businesses Tab Enhancement

Add "Create Business for User" button next to the existing business list with ability to assign to any user.

---

### Expected Behavior After Implementation

| Action | Admin Capability |
|--------|-----------------|
| View Business Owner Dashboard | Navigate via Navbar or Quick Action |
| View Accountant Dashboard | Navigate via Navbar or Quick Action |
| Create new user | Click "Create User" → Fill form → User created with roles |
| Create business for user | Click "Create Business" → Select owner → Business assigned |
| Manage user roles | Existing functionality (already works) |
| View all data | Already works via existing RLS policies |

---

### Acceptance Criteria

- [ ] Admin can navigate to Business Owner Dashboard from navbar
- [ ] Admin can navigate to Accountant Dashboard from navbar
- [ ] Admin can create new users with specified roles
- [ ] Admin can create businesses and assign them to any user
- [ ] All admin actions are logged in audit trail
- [ ] Existing functionality for other roles remains unchanged

