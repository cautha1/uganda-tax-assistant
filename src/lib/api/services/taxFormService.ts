import { apiClient } from '../client';

// Types for Tax Form endpoints
export interface TaxFormPayload {
  businessId: string;
  taxType: 'paye' | 'income' | 'presumptive' | 'vat';
  taxPeriod: string; // e.g., "2024-01"
  formData: Record<string, unknown>;
  calculatedTax?: number;
}

export interface TaxForm {
  id: string;
  businessId: string;
  taxType: string;
  taxPeriod: string;
  formData: Record<string, unknown>;
  calculatedTax?: number;
  status: 'draft' | 'validated' | 'error' | 'submitted';
  validationErrors?: Record<string, unknown>;
  uraAcknowledgementNumber?: string;
  uraSubmissionDate?: string;
  submissionProofUrl?: string;
  createdBy: string;
  submittedBy?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxFormListResponse {
  success: boolean;
  data: TaxForm[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface TaxFormResponse {
  success: boolean;
  data: TaxForm;
}

export interface ValidationResponse {
  success: boolean;
  valid: boolean;
  errors?: Record<string, string[]>;
  warnings?: string[];
}

export const taxFormService = {
  // POST /api/v1/tax-forms
  create: async (payload: TaxFormPayload): Promise<TaxFormResponse> => {
    return apiClient.post<TaxFormResponse>('/tax-forms', payload);
  },

  // GET /api/v1/tax-forms
  list: async (params?: { 
    businessId?: string; 
    taxType?: string; 
    status?: string;
    page?: number; 
    limit?: number;
  }): Promise<TaxFormListResponse> => {
    const queryString = params 
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    return apiClient.get<TaxFormListResponse>(`/tax-forms${queryString}`);
  },

  // GET /api/v1/tax-forms/:id
  getById: async (id: string): Promise<TaxFormResponse> => {
    return apiClient.get<TaxFormResponse>(`/tax-forms/${id}`);
  },

  // PUT /api/v1/tax-forms/:id
  update: async (id: string, payload: Partial<TaxFormPayload>): Promise<TaxFormResponse> => {
    return apiClient.put<TaxFormResponse>(`/tax-forms/${id}`, payload);
  },

  // DELETE /api/v1/tax-forms/:id
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/tax-forms/${id}`);
  },

  // POST /api/v1/tax-forms/:id/validate
  validate: async (id: string): Promise<ValidationResponse> => {
    return apiClient.post<ValidationResponse>(`/tax-forms/${id}/validate`);
  },

  // POST /api/v1/tax-forms/:id/submit
  submit: async (id: string): Promise<TaxFormResponse> => {
    return apiClient.post<TaxFormResponse>(`/tax-forms/${id}/submit`);
  },

  // POST /api/v1/tax-forms/:id/upload-proof
  uploadProof: async (id: string, file: File, acknowledgementNumber?: string): Promise<TaxFormResponse> => {
    const formData = new FormData();
    formData.append('proof', file);
    if (acknowledgementNumber) {
      formData.append('acknowledgementNumber', acknowledgementNumber);
    }
    
    // Use fetch directly for multipart/form-data
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${apiClient['baseUrl']}/tax-forms/${id}/upload-proof`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { message: error.message || 'Upload failed', status: response.status };
    }
    
    return response.json();
  },
};
