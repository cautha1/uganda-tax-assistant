// API Client and Services for Google Cloud Run Backend
export { apiClient, ApiClient, API_BASE } from './client';
export { authService } from './services/authService';
export { businessService } from './services/businessService';
export { taxFormService } from './services/taxFormService';
export { taxPaymentService } from './services/taxPaymentService';

// Re-export types
export type { RegisterPayload, LoginPayload, AuthResponse, ProfileResponse } from './services/authService';
export type { BusinessPayload, Business, BusinessListResponse, BusinessResponse } from './services/businessService';
export type { TaxFormPayload, TaxForm, TaxFormListResponse, TaxFormResponse, ValidationResponse } from './services/taxFormService';
export type { TaxPaymentPayload, TaxPayment, TaxPaymentListResponse, TaxPaymentResponse } from './services/taxPaymentService';
