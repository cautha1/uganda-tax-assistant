
## Plan: Secure Email Invitation System for Accountant Assignment

### Overview
This plan extends the existing "Assign Accountant" feature to send secure email invitations with cryptographically secure, single-use tokens. The current flow immediately assigns an accountant if they're registered - we'll change it to send an invitation that the accountant must accept.

---

### Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    INVITATION FLOW                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. SME Owner clicks "Invite Accountant"                            │
│     └── Enters email + sets permissions                             │
│                                                                      │
│  2. Frontend calls Edge Function: send-accountant-invitation        │
│     └── Generates secure token (raw)                                │
│     └── Stores SHA-256 hash in DB (token_hash)                      │
│     └── Creates invitation record (status: pending)                 │
│     └── Sends email via Resend with invite link                     │
│                                                                      │
│  3. Accountant receives email                                       │
│     └── Clicks secure link: /invite/accept?token=<RAW_TOKEN>        │
│                                                                      │
│  4. Accept Invitation Page                                          │
│     └── Verifies token (hash match, not expired, not used)          │
│     └── Requires sign-in with matching email                        │
│     └── Creates business_accountant assignment                      │
│     └── Marks invitation as accepted                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Database Schema

#### New Table: `accountant_invitations`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| business_id | UUID | FK to businesses |
| accountant_email | TEXT | Email of invited accountant (lowercased) |
| status | ENUM | pending, accepted, expired, revoked |
| token_hash | TEXT | SHA-256 hash of the secure token |
| permissions | JSONB | {can_view, can_edit, can_upload, can_generate_reports} |
| created_by | UUID | FK to profiles (inviter) |
| created_at | TIMESTAMP | When invitation was created |
| expires_at | TIMESTAMP | Expiry time (default: 7 days) |
| accepted_at | TIMESTAMP | When accepted (nullable) |
| accepted_by | UUID | User ID who accepted (nullable) |
| token_used_at | TIMESTAMP | When token was used (nullable) |
| revoked_at | TIMESTAMP | When revoked (nullable) |
| revoked_by | UUID | Who revoked (nullable) |

#### Status Enum

```sql
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
```

#### RLS Policies
- Business owners can view/create/revoke invitations for their businesses
- Admins can manage all invitations
- Accountants can view invitations sent to their email

---

### Phase 2: Edge Function - `send-accountant-invitation`

**Purpose:** Generate secure token, store hash, send email

**Security Features:**
- Uses Web Crypto API for cryptographically secure random token
- Stores only SHA-256 hash in database
- Token is 32 bytes (256 bits) of entropy, hex-encoded (64 characters)
- Constant-time hash comparison in verification

**Flow:**
1. Validate input (email, business_id, permissions)
2. Check for existing pending invitation (prevent duplicates)
3. Generate secure random token
4. Compute SHA-256 hash
5. Insert invitation record
6. Send email via Resend API
7. Log to audit trail
8. Return success/failure

**Email Template:**
```
Subject: You've been invited as an Accountant

Hi,

[Business Name] has invited you to manage their tax filings on SME Tax Aid.

Click below to accept the invitation:
[Accept Invitation Button]

This invitation expires in 7 days.

If you don't have an account yet, you'll be prompted to register with this email address.

---
SME Tax Aid Uganda
```

---

### Phase 3: Edge Function - `verify-invitation-token`

**Purpose:** Securely verify token and return invitation details

**Security Features:**
- Computes SHA-256 of provided token
- Uses constant-time comparison where possible
- Checks: status=pending, not expired, email match
- Does NOT accept the invitation - just verifies

**Flow:**
1. Receive raw token
2. Hash it with SHA-256
3. Query invitation by token_hash
4. Validate: status, expiry, not used
5. Return invitation details (no sensitive data)

---

### Phase 4: Accept Invitation Page

**Route:** `/invite/accept`

**Behavior:**

```text
┌─────────────────────────────────────────────────────────────┐
│                 /invite/accept?token=xxx                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Extract token from URL                                   │
│  2. Call verify-invitation-token edge function               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ IF Invalid/Expired/Used                              │    │
│  │   → Show error message                               │    │
│  │   → "Request new invite" instruction                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ IF Valid Token                                       │    │
│  │   → Check if user is signed in                       │    │
│  │                                                      │    │
│  │   IF Not signed in:                                  │    │
│  │     → Show "Sign in or Register" buttons             │    │
│  │     → Pre-fill email (read-only)                     │    │
│  │     → After auth, return to this page                │    │
│  │                                                      │    │
│  │   IF Signed in:                                      │    │
│  │     → Verify email matches invitation                │    │
│  │     → Show "Accept Invitation" button                │    │
│  │     → Display business name & permissions            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  3. On Accept:                                               │
│     → Call accept-invitation edge function                   │
│     → Redirect to accountant dashboard                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 5: Edge Function - `accept-invitation`

**Purpose:** Atomically accept invitation and create assignment

**Security Features:**
- Validates token again (double-check)
- Verifies authenticated user's email matches invitation
- Uses transaction to ensure atomicity
- Marks token as used immediately

**Flow:**
1. Verify JWT and get user
2. Hash provided token
3. Find invitation by token_hash
4. Validate: status=pending, not expired, email match
5. Begin transaction:
   - Update invitation: status=accepted, accepted_at, token_used_at
   - Insert into business_accountants with permissions
6. Log to audit trail
7. Return success

---

### Phase 6: Owner Controls (Resend/Revoke)

**Modify:** `AccountantManagement.tsx`

Add new section: "Pending Invitations"

**Features:**
- View all pending/expired invitations
- Resend invitation (generates new token, extends expiry)
- Revoke invitation (sets status=revoked)
- Show expiry countdown

**Resend Logic:**
1. Generate new secure token
2. Update invitation: new token_hash, new expires_at
3. Send new email
4. Log to audit trail

**Revoke Logic:**
1. Update invitation: status=revoked, revoked_at, revoked_by
2. Log to audit trail

---

### Phase 7: Modify AssignAccountantDialog

**Changes:**
- Remove the "lookup and immediate assign" logic
- Always create an invitation
- Show success message: "Invitation sent! They'll receive an email with instructions."
- Support for inviting non-registered users (they'll register when accepting)

---

### Phase 8: Audit Trail Events

New audit log actions:
- `INVITE_CREATED` - Invitation created and email queued
- `INVITE_EMAIL_SENT` - Email successfully sent (logged by edge function)
- `INVITE_RESENT` - Invitation resent with new token
- `INVITE_REVOKED` - Invitation cancelled by owner
- `INVITE_ACCEPTED` - Accountant accepted the invitation
- `INVITE_EXPIRED` - Token expired (can be logged on access attempt)

**Logged Details:**
- business_id
- invitation_id
- actor_user_id
- timestamp
- target_email
- permissions (on create/accept)

---

### Files to Create

| File | Description |
|------|-------------|
| `supabase/functions/send-accountant-invitation/index.ts` | Generate token, send email |
| `supabase/functions/verify-invitation-token/index.ts` | Verify token validity |
| `supabase/functions/accept-invitation/index.ts` | Accept and create assignment |
| `supabase/functions/resend-invitation/index.ts` | Generate new token, resend email |
| `src/pages/invite/AcceptInvitation.tsx` | Public page for accepting invites |
| `src/components/business/PendingInvitations.tsx` | Owner view of pending invites |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/invite/accept` |
| `src/components/business/AssignAccountantDialog.tsx` | Call edge function instead of direct insert |
| `src/components/business/AccountantManagement.tsx` | Add pending invitations section |
| `src/pages/businesses/BusinessDetail.tsx` | Include pending invitations display |
| `supabase/config.toml` | Add new edge functions |

---

### Security Considerations

1. **Token Security**
   - 256-bit entropy (32 bytes → 64 hex chars)
   - SHA-256 hashing before storage
   - Single-use enforcement server-side

2. **Email Verification**
   - Authenticated user's email must exactly match invitation email
   - Case-insensitive comparison (both lowercased)

3. **Expiry**
   - 7-day default (configurable in edge function)
   - Expired tokens rejected even if unused

4. **Rate Limiting**
   - Consider adding rate limits on email sends (future enhancement)

5. **No Sensitive Data in Email**
   - Only business name and link
   - No TIN, passwords, or financial data

---

### API Key Requirement

This feature requires the **RESEND_API_KEY** secret to send emails. You'll need to:
1. Sign up at https://resend.com
2. Verify your email domain at https://resend.com/domains
3. Create an API key at https://resend.com/api-keys
4. Add the secret to the project

---

### Acceptance Criteria Checklist

- [ ] Accountant receives email and can open link to accept invite
- [ ] Token cannot be reused after acceptance
- [ ] Token expires after 7 days
- [ ] Wrong email account cannot accept the invitation
- [ ] Owner can resend invitation (new token)
- [ ] Owner can revoke invitation
- [ ] All actions appear in audit logs
- [ ] Works for both registered and new accountants
