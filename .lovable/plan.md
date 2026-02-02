
## Plan: Full Bilingual Language Switching (English ↔ Luganda)

### Overview

This implementation adds comprehensive internationalization (i18n) support to the TaxAudit Uganda platform, enabling users to switch between English (default) and Luganda at any time. The language preference persists across sessions via database (for logged-in users) or localStorage (for guests).

---

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LANGUAGE SWITCHING SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐   │
│  │  LanguageProvider│───►│   Translation    │───►│   UI Components     │   │
│  │    (Context)     │    │   Dictionary     │    │   (use t() hook)    │   │
│  └─────────────────┘    └──────────────────┘    └─────────────────────┘   │
│           │                      │                                         │
│           │                      ▼                                         │
│           │              ┌──────────────────┐                              │
│           │              │  English (en)    │                              │
│           │              │  Luganda (lg)    │                              │
│           │              └──────────────────┘                              │
│           │                                                                │
│           ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     PERSISTENCE LAYER                                │  │
│  │  ┌───────────────────┐    ┌──────────────────────────────────────┐  │  │
│  │  │   localStorage    │    │   profiles.preferred_language        │  │  │
│  │  │  (guest users)    │    │      (logged-in users)               │  │  │
│  │  └───────────────────┘    └──────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     LANGUAGE SWITCHER UI                             │  │
│  │   [EN] / [LG] toggle in Navbar + Login/Register pages               │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Implementation Steps

#### Step 1: Database Schema Update

**Migration:** Add `preferred_language` column to `profiles` table

```sql
ALTER TABLE profiles 
ADD COLUMN preferred_language TEXT DEFAULT 'en' 
CHECK (preferred_language IN ('en', 'lg'));
```

- Default: `'en'` (English)
- Values: `'en'` (English), `'lg'` (Luganda)
- Nullable: No (defaults to English)

---

#### Step 2: Create Translation System

**New File:** `src/lib/i18n/index.ts`

Core i18n infrastructure:
- Type-safe translation function `t(key: string)`
- Nested key support (`common.save`, `nav.dashboard`)
- Fallback to English if translation missing
- Export `Language` type and supported languages

**New File:** `src/lib/i18n/translations/en.ts`

English translation dictionary with organized namespaces:
- `common`: save, cancel, loading, error, success, submit, back, next, close, delete, edit, view, search, filter, export, import
- `nav`: dashboard, businesses, income, expenses, taxForms, calculator, admin, profile, settings, signOut, signIn, getStarted
- `auth`: login, register, forgotPassword, email, password, confirmPassword, rememberMe, resetLink, backToLogin, noAccount, haveAccount
- `dashboard`: greeting, totalBusinesses, pendingForms, accountants, thisMonth, yourBusinesses, quickActions, upcomingDeadlines
- `business`: addBusiness, businessName, tin, address, businessType, owner, accountant, taxTypes, turnover
- `income`: title, addIncome, source, amount, date, customer, paymentMethod, description, locked, unlock
- `expenses`: title, addExpense, category, amount, date, vendor, paymentMethod, description, locked, unlock
- `tax`: taxForms, createForm, taxType, taxPeriod, status, calculatedTax, dueDate, submit, markReady, download
- `accountant`: dashboard, myClients, pendingReview, withErrors, readyForOwner, totalTaxManaged, auditOverview, reports
- `statuses`: draft, validated, error, submitted, pending, approved, rejected
- `errors`: generic, network, unauthorized, notFound, validation
- `validation`: required, invalidEmail, minLength, maxLength, invalidTIN, invalidNIN, invalidPhone
- `profile`: title, personalInfo, accountInfo, name, phone, nin, saveChanges, language, languagePreference
- `landing`: heroTitle, heroSubtitle, trustedBy, features, cta

**New File:** `src/lib/i18n/translations/lg.ts`

Luganda translation dictionary (same structure as English):
- Professional, business-appropriate Luganda translations
- Technical/tax terms kept in English: URA, TIN, PAYE, VAT, NIN
- Concise translations for UI clarity

---

#### Step 3: Create Language Context Provider

**New File:** `src/lib/i18n/LanguageProvider.tsx`

React context provider for language state:

**State:**
- `language: 'en' | 'lg'` - Current language
- `isLoading: boolean` - Loading state during initialization

**Methods:**
- `setLanguage(lang: Language)` - Change language and persist
- `t(key: string, params?: Record<string, string>)` - Translate with optional interpolation

**Initialization Logic:**
1. Check if user is logged in → fetch `preferred_language` from profile
2. If not logged in → check localStorage `preferred_language`
3. Default to `'en'`

**Persistence Logic:**
- Logged in: Update `profiles.preferred_language` in database
- Not logged in: Update localStorage `preferred_language`

---

#### Step 4: Create Language Switcher Component

**New File:** `src/components/ui/LanguageSwitcher.tsx`

A compact toggle component for the navbar:

**UI Options:**
- Toggle button style: `[EN] / [LG]` 
- Or dropdown with language names: English, Luganda

**Behavior:**
- Shows current language as active
- Clicking switches immediately (no page reload)
- Works for both authenticated and guest users

**Variants:**
- `variant="compact"` - For navbar (icon + code)
- `variant="full"` - For settings (full language names)

---

#### Step 5: Integrate into App

**Modify File:** `src/App.tsx`

Wrap app with `LanguageProvider`:
```tsx
<LanguageProvider>
  <AuthProvider>
    {/* existing content */}
  </AuthProvider>
</LanguageProvider>
```

---

#### Step 6: Add Language Switcher to Navbar

**Modify File:** `src/components/layout/Navbar.tsx`

- Add `LanguageSwitcher` component to desktop nav (between navigation links and user menu)
- Add to mobile menu as well
- Works for both authenticated and unauthenticated users

---

#### Step 7: Add Language Switcher to Public Pages

**Modify Files:**
- `src/pages/LandingPage.tsx` - Add switcher to top nav
- `src/pages/auth/Login.tsx` - Add switcher (top right corner)
- `src/pages/auth/Register.tsx` - Add switcher
- `src/pages/auth/ForgotPassword.tsx` - Add switcher
- `src/pages/auth/Reauth.tsx` - Add switcher

---

#### Step 8: Add Language Preference to Profile Page

**Modify File:** `src/pages/profile/Profile.tsx`

Add a "Language Preference" section:
- Dropdown/radio to select preferred language
- Saves to profile on change
- Shows current selection

---

#### Step 9: Create Custom Hook for Translations

**New File:** `src/hooks/useTranslation.ts`

A custom hook for easy access to translations:
```tsx
export function useTranslation() {
  const { t, language, setLanguage } = useLanguage();
  return { t, language, setLanguage };
}
```

---

#### Step 10: Update Components with Translations

**High-Priority Pages (Phase 1):**
1. `src/components/layout/Navbar.tsx` - Navigation labels
2. `src/pages/LandingPage.tsx` - Hero, features, CTA
3. `src/pages/auth/Login.tsx` - Form labels, buttons
4. `src/pages/auth/Register.tsx` - Form labels, buttons
5. `src/pages/Dashboard.tsx` - Stats, headings, buttons
6. `src/pages/accountant/AccountantDashboard.tsx` - All UI text

**Medium-Priority Pages (Phase 2):**
7. `src/pages/profile/Profile.tsx`
8. `src/pages/businesses/BusinessesList.tsx`
9. `src/pages/businesses/BusinessDetail.tsx`
10. `src/pages/income/IncomeList.tsx`
11. `src/pages/expenses/ExpensesList.tsx`
12. `src/pages/tax/TaxFormDetail.tsx`

**Shared Components (Phase 3):**
13. `src/components/ui/LoadingSpinner.tsx` (if has text)
14. Toast messages via `useToast` hook
15. Form validation messages
16. Modal dialogs and confirmations

---

### Translation Examples

**English:**
```typescript
{
  common: {
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
  },
  nav: {
    dashboard: "Dashboard",
    income: "Income",
    expenses: "Expenses",
  },
  auth: {
    signIn: "Sign in to your account",
    email: "Email address",
    password: "Password",
  },
  dashboard: {
    greeting_morning: "Good morning",
    greeting_afternoon: "Good afternoon",
    greeting_evening: "Good evening",
    totalBusinesses: "Total Businesses",
    pendingForms: "Pending Forms",
  },
}
```

**Luganda:**
```typescript
{
  common: {
    save: "Tereka",
    cancel: "Sazaamu",
    loading: "Kiteekebwa...",
  },
  nav: {
    dashboard: "Ekisenge Ekinene",
    income: "Ensimbi Eziyingira",
    expenses: "Ensimbi Ezivaamu",
  },
  auth: {
    signIn: "Yingira mu akawunti yo",
    email: "Endagiriro y'email",
    password: "Ekigambo ekyama",
  },
  dashboard: {
    greeting_morning: "Wasuze otya",
    greeting_afternoon: "Osiibye otya",
    greeting_evening: "Obudde bwerere",
    totalBusinesses: "Bizinensi Byonna",
    pendingForms: "Ebifoomu Ebitanaze",
  },
}
```

---

### File Summary

| File | Action | Description |
|------|--------|-------------|
| **Database** | Migrate | Add `preferred_language` column to `profiles` |
| `src/lib/i18n/index.ts` | Create | Core i18n utilities and types |
| `src/lib/i18n/translations/en.ts` | Create | English translations dictionary |
| `src/lib/i18n/translations/lg.ts` | Create | Luganda translations dictionary |
| `src/lib/i18n/LanguageProvider.tsx` | Create | Language context provider |
| `src/components/ui/LanguageSwitcher.tsx` | Create | Language toggle component |
| `src/hooks/useTranslation.ts` | Create | Translation hook |
| `src/App.tsx` | Modify | Wrap with LanguageProvider |
| `src/components/layout/Navbar.tsx` | Modify | Add language switcher |
| `src/pages/LandingPage.tsx` | Modify | Add switcher, translate content |
| `src/pages/auth/Login.tsx` | Modify | Add switcher, translate content |
| `src/pages/auth/Register.tsx` | Modify | Add switcher, translate content |
| `src/pages/Dashboard.tsx` | Modify | Translate all UI text |
| `src/pages/accountant/AccountantDashboard.tsx` | Modify | Translate all UI text |
| `src/pages/profile/Profile.tsx` | Modify | Add language preference setting |
| + ~50 other component files | Modify | Replace hardcoded text with `t()` calls |

---

### Luganda Translation Guidelines

1. **Professional Language**: Use formal, business-appropriate Luganda
2. **Keep English Terms**: URA, TIN, PAYE, VAT, NIN, PDF, CSV, Excel
3. **No Slang**: Avoid informal expressions
4. **Concise**: Keep translations short for UI buttons and labels
5. **Context-Aware**: Use appropriate formality for business context

---

### Technical Details

**Translation Key Format:**
```typescript
t('namespace.key')  // e.g., t('common.save'), t('nav.dashboard')
t('namespace.nested.key')  // e.g., t('validation.errors.required')
```

**Interpolation Support:**
```typescript
t('greeting.hello', { name: 'John' })  // "Hello, John!" or "Oli otya, John!"
```

**Fallback Behavior:**
- If Luganda translation missing → show English
- If key not found → show key itself (for debugging)
- Log missing keys in development

---

### Acceptance Criteria Checklist

- [ ] User can switch between EN and LG at any time
- [ ] Language choice persists after refresh
- [ ] Language choice persists after logout/login (for logged-in users)
- [ ] Entire UI updates consistently (no mixed languages)
- [ ] Language switcher visible in navbar (all pages)
- [ ] Language switcher on login/register pages
- [ ] Platform remains fully functional in both languages
- [ ] Tax terms (URA, TIN, PAYE, VAT) remain in English
- [ ] Missing translations fall back to English
- [ ] Additional languages can be added without refactoring
