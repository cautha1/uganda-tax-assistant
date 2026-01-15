// TIN validation utilities for Uganda tax system

/**
 * Validates a Uganda TIN (Taxpayer Identification Number)
 * Format: 10 digits
 */
export const validateTIN = (tin: string): boolean => {
  if (!tin) return false;
  const cleanTin = tin.replace(/\s/g, '');
  return /^\d{10}$/.test(cleanTin);
};

/**
 * Validates a Uganda NIN (National Identification Number)
 * Format: CM followed by 12 alphanumeric characters
 */
export const validateNIN = (nin: string): boolean => {
  if (!nin) return false;
  const cleanNin = nin.replace(/\s/g, '').toUpperCase();
  return /^CM[A-Z0-9]{12}$/i.test(cleanNin);
};

/**
 * Validates a Uganda phone number
 * Format: +256XXXXXXXXX or 0XXXXXXXXX
 */
export const validateUgandaPhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\s/g, '');
  return /^(\+256|0)[0-9]{9}$/.test(cleanPhone);
};

/**
 * Formats a TIN for display (adds spaces for readability)
 */
export const formatTIN = (tin: string): string => {
  const cleanTin = tin.replace(/\s/g, '');
  if (cleanTin.length !== 10) return tin;
  return `${cleanTin.slice(0, 3)} ${cleanTin.slice(3, 6)} ${cleanTin.slice(6)}`;
};

/**
 * Formats a NIN for display
 */
export const formatNIN = (nin: string): string => {
  const cleanNin = nin.replace(/\s/g, '').toUpperCase();
  if (cleanNin.length !== 14) return nin;
  return `${cleanNin.slice(0, 2)} ${cleanNin.slice(2, 6)} ${cleanNin.slice(6, 10)} ${cleanNin.slice(10)}`;
};

/**
 * Formats a phone number for display
 */
export const formatPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\s/g, '');
  if (cleanPhone.startsWith('+256')) {
    return `+256 ${cleanPhone.slice(4, 7)} ${cleanPhone.slice(7, 10)} ${cleanPhone.slice(10)}`;
  }
  if (cleanPhone.startsWith('0')) {
    return `0${cleanPhone.slice(1, 4)} ${cleanPhone.slice(4, 7)} ${cleanPhone.slice(7)}`;
  }
  return phone;
};

/**
 * Get validation error message for TIN
 */
export const getTINError = (tin: string): string | null => {
  if (!tin) return "TIN is required";
  if (!validateTIN(tin)) return "TIN must be exactly 10 digits";
  return null;
};

/**
 * Get validation error message for NIN
 */
export const getNINError = (nin: string): string | null => {
  if (!nin) return "NIN is required";
  if (!validateNIN(nin)) return "NIN must start with 'CM' followed by 12 characters";
  return null;
};

/**
 * Get validation error message for phone
 */
export const getPhoneError = (phone: string): string | null => {
  if (!phone) return "Phone number is required";
  if (!validateUgandaPhone(phone)) return "Enter a valid Uganda phone number (+256... or 0...)";
  return null;
};
