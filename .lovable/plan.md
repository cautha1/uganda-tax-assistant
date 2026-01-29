

## Plan: Fix Login and Access Control Issues for Accountants and Business Owners

### Problem Summary
When an accountant logs in, they see an "Access Denied" page. This is caused by multiple issues in the authentication and routing flow.

---

### Root Causes Identified

1. **React Hooks Rule Violation** - In the Dashboard component, there's a conditional early return with navigation BEFORE the `useEffect` hook is called. This causes React errors and unpredictable behavior.

2. **Race Condition in Role Loading** - When a user logs in, the Auth Context fetches roles asynchronously. The ProtectedRoute may check roles before they're fully loaded, leading to false "unauthorized" results.

3. **Missing Route Protections** - Some routes (like `/businesses`) don't restrict access by role, causing accountants to land on pages meant for business owners.

---

### Solution Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW (FIXED)                        │
├─────────────────────────────────────────────────────────────┤
│  1. User logs in                                             │
│  2. Login.tsx fetches roles from DB                          │
│  3. Redirect based on role:                                  │
│     - admin → /admin                                         │
│     - accountant → /accountant                               │
│     - sme_owner → /dashboard                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PROTECTED ROUTE (FIXED)                         │
├─────────────────────────────────────────────────────────────┤
│  • Wait for roles to load before checking permissions        │
│  • Use proper loading states                                 │
│  • Only redirect to /unauthorized when roles are confirmed   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               DASHBOARD (FIXED)                              │
├─────────────────────────────────────────────────────────────┤
│  • Move hooks BEFORE any conditional returns                 │
│  • Handle accountant-only redirect properly                  │
│  • Show loading state during redirect                        │
└─────────────────────────────────────────────────────────────┘
```

---

### Implementation Steps

#### Step 1: Fix Dashboard.tsx - React Hooks Violation
**File:** `src/pages/Dashboard.tsx`

Move the accountant redirect logic to happen AFTER all hooks are declared. The current code has:
```typescript
// ❌ WRONG: Conditional return before useEffect hook
const isAccountantOnly = roles.includes("accountant") && ...;
if (!authLoading && isAccountantOnly) {
  return <Navigate to="/accountant" replace />;
}

useEffect(() => { ... }, []);  // Hook called after conditional return!
```

Fix to:
```typescript
// ✅ CORRECT: All hooks first, then conditional logic
useEffect(() => { ... }, []);

const isAccountantOnly = roles.includes("accountant") && ...;
if (!authLoading && isAccountantOnly) {
  return <Navigate to="/accountant" replace />;
}
```

#### Step 2: Improve ProtectedRoute Role Checking
**File:** `src/components/auth/ProtectedRoute.tsx`

Current implementation has a fixed 100ms delay which may not be enough. Improve to:
- Wait for Auth Context to finish loading (`isLoading` is false)
- Wait for roles array to be populated OR confirm user has no roles in DB
- Only then perform the role check

Key changes:
- Remove the arbitrary 100ms timeout
- Add a more reliable check that waits for `fetchUserData` to complete
- Track when role fetching is truly done (not just when isLoading is false)

#### Step 3: Add Role Restrictions to Routes
**File:** `src/App.tsx`

Add `requiredRoles` to routes that should be restricted:
- `/businesses` → require `["sme_owner", "admin"]`
- `/businesses/new` → require `["sme_owner", "admin"]`  
- `/businesses/:businessId` → keep open (accountants need access to assigned businesses)
- `/businesses/:businessId/expenses` → keep open (accountants may have view permissions)
- `/businesses/:businessId/income` → keep open (accountants may have view permissions)

#### Step 4: Enhance Auth Context with Role Loading State
**File:** `src/lib/auth.tsx`

Add a `rolesLoaded` flag to explicitly track when role fetching is complete:
```typescript
const [rolesLoaded, setRolesLoaded] = useState(false);

const fetchUserData = async (userId: string) => {
  try {
    // ... fetch profile and roles
  } finally {
    setRolesLoaded(true);
  }
};
```

This allows ProtectedRoute to know definitively when roles have been fetched.

---

### Technical Details

**Files to Modify:**
1. `src/pages/Dashboard.tsx` - Fix hooks ordering
2. `src/components/auth/ProtectedRoute.tsx` - Improve role wait logic
3. `src/lib/auth.tsx` - Add `rolesLoaded` state
4. `src/App.tsx` - Add role restrictions to business routes

**Why This Fixes the Issue:**
1. Hooks are called in consistent order (React requirement)
2. ProtectedRoute waits for roles to be fully loaded before checking
3. Accountants are properly redirected to their dashboard
4. Business-owner-only routes are protected from accountant access

---

### Expected Behavior After Fix

| User Role | Login Destination | Can Access |
|-----------|------------------|------------|
| Accountant | `/accountant` | Accountant Dashboard, Assigned Businesses, Tax Forms |
| SME Owner | `/dashboard` | Owner Dashboard, Their Businesses, Income, Expenses |
| Admin | `/admin` | Everything |
| Accountant + SME Owner | `/accountant` or `/dashboard` | Both dashboards based on context |

