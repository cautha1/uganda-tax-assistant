import Tesseract from 'tesseract.js';

export interface OCRResult {
  fullName: string | null;
  nin: string | null;
  confidence: number;
  rawText: string;
}

export interface OCRProgress {
  status: string;
  progress: number;
}

// Uganda NIN format: CM followed by 12 alphanumeric characters
const NIN_PATTERN = /\b(CM[A-Z0-9]{12})\b/gi;

// Common name label patterns on Uganda NID
const NAME_LABELS = [
  /SURNAME[:\s]+([A-Z][A-Z\s]+)/i,
  /GIVEN\s*NAME[S]?[:\s]+([A-Z][A-Z\s]+)/i,
  /NAME[:\s]+([A-Z][A-Z\s]+)/i,
  /NAMES[:\s]+([A-Z][A-Z\s]+)/i,
];

/**
 * Extract NIN from OCR text
 */
export function extractNIN(text: string): string | null {
  const matches = text.match(NIN_PATTERN);
  if (matches && matches.length > 0) {
    // Return the first valid NIN found, normalized to uppercase
    return matches[0].toUpperCase();
  }
  return null;
}

/**
 * Extract full name from OCR text
 * Tries multiple patterns to find surname and given names
 */
export function extractName(text: string): string | null {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  let surname: string | null = null;
  let givenNames: string | null = null;
  
  // Look for labeled name fields
  for (const line of lines) {
    // Check for surname
    const surnameMatch = line.match(/SURNAME[:\s]+([A-Z][A-Z\s]+)/i);
    if (surnameMatch) {
      surname = surnameMatch[1].trim();
    }
    
    // Check for given names
    const givenMatch = line.match(/GIVEN\s*NAME[S]?[:\s]+([A-Z][A-Z\s]+)/i);
    if (givenMatch) {
      givenNames = givenMatch[1].trim();
    }
  }
  
  // Combine surname and given names if both found
  if (surname && givenNames) {
    return `${surname} ${givenNames}`.replace(/\s+/g, ' ').trim();
  }
  
  if (surname) {
    return surname;
  }
  
  if (givenNames) {
    return givenNames;
  }
  
  // Fallback: look for any name pattern
  for (const pattern of NAME_LABELS) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        return match[1].replace(/\s+/g, ' ').trim();
      }
    }
  }
  
  // Last resort: find lines with all uppercase words that look like names
  // (exclude known ID fields like dates, numbers, etc.)
  for (const line of lines) {
    const cleaned = line.replace(/[^A-Z\s]/gi, '').trim();
    const words = cleaned.split(/\s+/).filter(w => w.length > 1);
    
    // A name typically has 2-4 words, all letters
    if (words.length >= 2 && words.length <= 4) {
      const isAllLetters = words.every(w => /^[A-Z]+$/i.test(w));
      if (isAllLetters) {
        return words.join(' ');
      }
    }
  }
  
  return null;
}

/**
 * Process an image using Tesseract OCR and extract NID information
 */
export async function processNIDImage(
  imageSource: string | File | Blob,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: (m) => {
        if (onProgress && m.status && typeof m.progress === 'number') {
          onProgress({
            status: getProgressMessage(m.status),
            progress: Math.round(m.progress * 100),
          });
        }
      },
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence;
    const nin = extractNIN(rawText);
    const fullName = extractName(rawText);

    return {
      fullName,
      nin,
      confidence,
      rawText,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
}

/**
 * Convert Tesseract status to user-friendly message
 */
function getProgressMessage(status: string): string {
  switch (status) {
    case 'loading tesseract core':
      return 'Initializing...';
    case 'initializing tesseract':
      return 'Preparing...';
    case 'loading language traineddata':
      return 'Loading language...';
    case 'initializing api':
      return 'Setting up...';
    case 'recognizing text':
      return 'Reading text...';
    default:
      return 'Processing...';
  }
}

/**
 * Validate extracted NIN format
 */
export function isValidNIN(nin: string): boolean {
  return /^CM[A-Z0-9]{12}$/i.test(nin);
}

/**
 * Calculate confidence level for extracted data
 */
export function getConfidenceLevel(result: OCRResult): 'high' | 'medium' | 'low' {
  if (result.confidence >= 80 && result.nin && result.fullName) {
    return 'high';
  }
  if (result.confidence >= 60 && (result.nin || result.fullName)) {
    return 'medium';
  }
  return 'low';
}
