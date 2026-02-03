
# Tesseract.js Camera OCR Integration for Business Owner Form

## Overview
Add OCR capability to the Business Owner Form that allows SME owners to capture their Uganda National ID using their device camera, then extract the **Full Name** and **NIN** automatically using Tesseract.js.

## Implementation Steps

### 1. Install Tesseract.js Dependency
Add the `tesseract.js` package which provides browser-based OCR without requiring a backend service.

### 2. Create NID Scanner Component
Build a new component `src/components/onboarding/NIDScanner.tsx` with:
- Camera stream access using `navigator.mediaDevices.getUserMedia`
- Live camera preview in a video element
- Capture button to take a photo
- Image preview after capture
- Retake and confirm buttons
- OCR processing with progress indicator
- Integration with existing form validation

### 3. Integrate into Business Owner Form
Update `src/components/onboarding/BusinessOwnerForm.tsx` to:
- Add a "Scan National ID" button near the NIN/Name fields
- Open the NID scanner as a dialog/modal
- Auto-populate name and NIN fields with extracted data
- Allow manual editing after OCR extraction

### 4. OCR Processing Logic
Create utility functions in `src/lib/ocrUtils.ts` to:
- Extract text from the captured image using Tesseract.js
- Parse Uganda NIN format (CM followed by 12 alphanumeric characters)
- Extract name from the ID card text
- Handle OCR confidence scoring

### 5. Bilingual Support
Add translations for the new feature in both English and Luganda:
- Scanner instructions
- Processing messages
- Error messages
- Confirmation dialogs

### 6. Mobile-First Design
The camera capture feature is primarily used on mobile devices:
- Full-screen camera view on mobile
- Touch-friendly capture button
- Orientation handling for landscape/portrait
- Proper aspect ratio for ID card capture

## Component Structure

```text
+---------------------------------------------------+
|               NID Scanner Dialog                  |
+---------------------------------------------------+
|                                                   |
|  +---------------------------------------------+  |
|  |                                             |  |
|  |            Live Camera Preview              |  |
|  |          (or Captured Image)                |  |
|  |                                             |  |
|  +---------------------------------------------+  |
|                                                   |
|  [ Instructions: Hold ID card within frame ]      |
|                                                   |
|  +---------------+  +---------------+             |
|  |   [Capture]   |  |   [Cancel]    |             |
|  +---------------+  +---------------+             |
|                                                   |
|  After capture:                                   |
|  +---------------+  +---------------+             |
|  |   [Retake]    |  |   [Confirm]   |             |
|  +---------------+  +---------------+             |
|                                                   |
|  Processing:                                      |
|  [=========>         ] 45% Recognizing...        |
|                                                   |
+---------------------------------------------------+
```

## Technical Details

### Camera Access
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment' } // Use rear camera
});
```

### Tesseract Configuration
- Language: English (eng)
- Character whitelist for NIN extraction: `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`
- Optimize for document scanning mode

### NIN Pattern Matching
```typescript
// Uganda NIN format: CM + 12 alphanumeric characters
const ninPattern = /CM[A-Z0-9]{12}/gi;
```

### Name Extraction Strategy
1. Look for text after "SURNAME" or "NAME" labels
2. Extract uppercase text patterns
3. Validate against reasonable name patterns

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add tesseract.js dependency |
| `src/components/onboarding/NIDScanner.tsx` | Create | Camera capture and OCR component |
| `src/lib/ocrUtils.ts` | Create | OCR processing utilities |
| `src/components/onboarding/BusinessOwnerForm.tsx` | Modify | Add scanner integration |
| `src/lib/i18n/translations/en.ts` | Modify | English translations |
| `src/lib/i18n/translations/lg.ts` | Modify | Luganda translations |

## User Experience Flow

1. User opens Business Owner form during onboarding
2. User clicks "Scan National ID" button
3. Camera access permission is requested
4. Live camera preview appears with guidance overlay
5. User positions ID card and captures image
6. User can retake or confirm the captured image
7. OCR processing runs with progress indicator
8. Extracted name and NIN auto-populate the form fields
9. User verifies and can manually edit if needed
10. User proceeds with the rest of the onboarding

## Error Handling

- Camera permission denied: Show instructions for enabling camera access
- OCR fails to extract data: Allow manual entry with retry option
- Low confidence match: Show warning and allow user to confirm or retry
- No NIN pattern found: Inform user and suggest proper ID positioning

## Browser Compatibility

Tesseract.js and camera APIs are supported in:
- Chrome/Edge (desktop and mobile)
- Safari (iOS 11+)
- Firefox (desktop and mobile)
