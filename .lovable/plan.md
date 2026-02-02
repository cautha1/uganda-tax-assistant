
## Plan: Accountant-Only Session Expiry with OTP Re-Authentication

### Overview

This implementation adds a strict session management system exclusively for users with the **accountant** role. The system will:
- Enforce a **2-hour hard session limit** from login
- Enforce a **2-hour idle timeout** (no user activity)
- Force sign-out and redirect to a dedicated `/reauth` page
- Require **Email OTP (magic link)** to re-authenticate
- Log all session events to the audit trail

**SME owners and admins remain completely unaffected.**

---

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ACCOUNTANT SESSION MANAGEMENT                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐   │
│  │   AuthProvider  │───►│ AccountantSession│───►│  Activity Tracker   │   │
│  │  (existing)     │    │    Manager Hook  │    │  (mouse/keyboard)   │   │
│  └─────────────────┘    └──────────────────┘    └─────────────────────┘   │
│           │                      │                        │               │
│           │                      ▼                        ▼               │
│           │              ┌──────────────────┐    ┌─────────────────┐     │
│           │              │ 2hr Hard Limit   │    │ 2hr Idle Limit  │     │
│           │              │     Timer        │    │     Timer       │     │
│           │              └────────┬─────────┘    └────────┬────────┘     │
│           │                       │                       │               │
│           │                       ▼                       ▼               │
│           │              ┌────────────────────────────────┐               │
│           │              │      Session Expired?          │               │
│           │              └────────────────┬───────────────┘               │
│           │                               │                               │
│           │                               ▼                               │
│           │              ┌────────────────────────────────┐               │
│           │              │  1. Store email in localStorage│               │
│           │              │  2. Log audit event            │               │
│           │              │  3. Send OTP email             │               │
│           │              │  4. Sign out                   │               │
│           │              │  5. Redirect to /reauth        │               │
│           │              └────────────────────────────────┘               │
│           │                                                               │
│           ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        /reauth Page                                  │ │
│  │  - "Session expired for security" message                           │ │
│  │  - Email field (prefilled from localStorage)                         │ │
│  │  - "Resend OTP" button (60s cooldown, max 5 per 15min)              │ │
│  │  - Success/Error states                                              │ │
│  │  - After OTP verification → redirect to /accountant                 │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Implementation Steps

#### Step 1: Create Accountant Session Manager Hook

**New File:** `src/hooks/useAccountantSessionManager.ts`

A custom hook that manages session timing specifically for accountants:

**Responsibilities:**
- Check if current user has "accountant" role (but not admin/sme_owner only)
- Start hard session timer (2 hours from login)
- Track user activity (mousemove, keydown, scroll, touchstart)
- Reset idle timer on activity
- Handle visibility change (tab hidden/shown)
- On expiry:
  1. Store email in localStorage (`accountant_reauth_email`)
  2. Store session start time for audit
  3. Call edge function to log event and send OTP
  4. Sign out user
  5. Redirect to `/reauth`

**Key Constants:**
- `HARD_SESSION_LIMIT_MS = 2 * 60 * 60 * 1000` (2 hours)
- `IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000` (2 hours)
- `ACCOUNTANT_REAUTH_EMAIL_KEY = "accountant_reauth_email"`
- `ACCOUNTANT_SESSION_START_KEY = "accountant_session_start"`

#### Step 2: Create Reauth Page

**New File:** `src/pages/auth/Reauth.tsx`

The re-authentication page for accountants:

**UI Elements:**
- Security icon and "Session Expired" heading
- Message: "Your session expired for security reasons. We sent a one-time sign-in link to your email."
- Email input (prefilled from localStorage if available)
- "Resend OTP" button with loading state
- Success message when OTP sent
- Error message display
- Link to regular login (for non-accountants or different account)

**Rate Limiting (client-side):**
- Track last send time in localStorage
- Enforce 60-second cooldown between sends
- Track send count with timestamps
- Enforce max 5 sends per 15 minutes

**Flow:**
1. On page load, prefill email from localStorage
2. OTP is automatically sent on session expiry (via hook)
3. User clicks magic link in email
4. Auth callback redirects to `/accountant`
5. Clear localStorage keys on successful login

#### Step 3: Create Edge Function for Session Events

**New File:** `supabase/functions/accountant-session-event/index.ts`

Edge function to handle session events and OTP sending:

**Endpoints/Actions:**
- `action: "session_expired"` - Log audit event, send OTP
- `action: "resend_otp"` - Log audit event, send OTP (with server-side rate limiting)
- `action: "reauth_success"` - Log successful re-authentication

**Request Body:**
```json
{
  "action": "session_expired" | "resend_otp" | "reauth_success",
  "email": "accountant@example.com",
  "reason": "hard_limit" | "idle_timeout",
  "user_id": "uuid" // optional, for authenticated calls
}
```

**Server-side Rate Limiting:**
- Check audit_logs for recent OTP sends to this email
- Enforce max 5 per 15 minutes
- Return error if exceeded

**Audit Events Logged:**
- `ACCOUNTANT_SESSION_EXPIRED_HARD`
- `ACCOUNTANT_SESSION_EXPIRED_IDLE`
- `ACCOUNTANT_OTP_SENT`
- `ACCOUNTANT_OTP_RESENT`
- `ACCOUNTANT_REAUTH_SUCCESS`

**OTP Email Content:**
- Use Supabase `signInWithOtp` via service role
- Include redirect URL to `/accountant`
- Clear message about session security

#### Step 4: Integrate Session Manager into App

**Modify File:** `src/lib/auth.tsx`

Add session tracking for accountants:

**Changes:**
- After roles are loaded, check if user is accountant-only
- Store session start time in localStorage when accountant logs in
- Add `isAccountantOnly` computed property to context

**New Context Values:**
- `accountantSessionStart: number | null`
- `setAccountantSessionStart: (timestamp: number | null) => void`

#### Step 5: Create Session Monitor Component

**New File:** `src/components/auth/AccountantSessionMonitor.tsx`

A component that wraps the app and monitors accountant sessions:

**Behavior:**
- Renders `null` (no UI)
- Uses the session manager hook
- Placed inside `AuthProvider` but wrapping routes
- Only active when user is logged in with accountant role

#### Step 6: Update Routes

**Modify File:** `src/App.tsx`

**Changes:**
- Add `/reauth` route (public, no protection)
- Wrap Routes with `AccountantSessionMonitor`

#### Step 7: Handle Auth Callback for OTP

**Modify File:** `src/pages/auth/Login.tsx` (or create callback handler)

The OTP flow uses Supabase's built-in magic link verification. On successful verification:
- User is automatically logged in
- Check if coming from reauth flow (via URL state or localStorage)
- Log `ACCOUNTANT_REAUTH_SUCCESS` event
- Clear reauth localStorage keys
- Redirect to `/accountant`

**Alternative:** Handle in `onAuthStateChange` in AuthProvider by checking for specific conditions.

#### Step 8: Update Login Flow for Accountants

**Modify File:** `src/pages/auth/Login.tsx`

After successful accountant login:
- Store `accountant_session_start` timestamp in localStorage
- This triggers the session manager to start monitoring

---

### File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useAccountantSessionManager.ts` | Create | Session timing and activity tracking hook |
| `src/pages/auth/Reauth.tsx` | Create | Re-authentication page with OTP flow |
| `src/components/auth/AccountantSessionMonitor.tsx` | Create | Session monitoring wrapper component |
| `supabase/functions/accountant-session-event/index.ts` | Create | Edge function for audit logging and OTP |
| `src/lib/auth.tsx` | Modify | Add session start tracking for accountants |
| `src/App.tsx` | Modify | Add `/reauth` route and session monitor |
| `src/pages/auth/Login.tsx` | Modify | Store session start time for accountants |
| `supabase/config.toml` | Modify | Add new edge function |

---

### Security Considerations

1. **Rate Limiting**: Both client-side (UX) and server-side (security) rate limiting for OTP resends
2. **Audit Trail**: All session events logged with user ID, email, timestamp, and reason
3. **Secure Storage**: Email stored only for convenience, cleared after successful auth
4. **Role-Specific**: Only affects accountants; admins and SME owners are exempt
5. **No Password Storage**: Uses OTP/magic link only, never stores passwords
6. **Tab Visibility**: Handles browser tab switching to prevent bypass

---

### Audit Log Events

| Event | Description | Details Logged |
|-------|-------------|----------------|
| `ACCOUNTANT_SESSION_EXPIRED_HARD` | 2-hour hard limit reached | user_id, email, session_duration |
| `ACCOUNTANT_SESSION_EXPIRED_IDLE` | 2-hour idle timeout | user_id, email, idle_duration |
| `ACCOUNTANT_OTP_SENT` | Initial OTP sent on expiry | email, trigger_reason |
| `ACCOUNTANT_OTP_RESENT` | Manual OTP resend | email, resend_count |
| `ACCOUNTANT_REAUTH_SUCCESS` | Successful re-authentication | user_id, email, auth_method |

---

### Acceptance Criteria Checklist

- [ ] Accountant is signed out automatically at 2 hours (hard limit)
- [ ] Accountant is signed out automatically after 2 hours of inactivity
- [ ] Accountant cannot continue browsing authenticated screens after expiry
- [ ] OTP email is sent automatically on session expiry
- [ ] Accountant can re-login only via OTP (magic link)
- [ ] Resend OTP respects 60-second cooldown
- [ ] Resend OTP limited to 5 per 15 minutes
- [ ] SME owners session behavior is unchanged
- [ ] Admin session behavior is unchanged
- [ ] All session events are logged to audit trail
- [ ] Email is prefilled on reauth page
- [ ] Clear error/success states displayed
- [ ] Successful OTP login redirects to Accountant Dashboard
