import { apiClient } from '../client';

// Types for Tax Payment endpoints
export interface TaxPaymentPayload {
  taxFormId: string;
  amountDue: number;
  amountPaid?: number;
  dueDate?: string;
  paymentDate?: string;
  paymentMethod?: 'bank_transfer' | 'mobile_money' | 'cash' | 'cheque';
  paymentReference?: string;
}

export interface TaxPayment {
  id: string;
  taxFormId: string;
  amountDue: number;
  amountPaid?: number;
  dueDate?: string;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentProofUrl?: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface TaxPaymentListResponse {
  success: boolean;
  data: TaxPayment[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface TaxPaymentResponse {
  success: boolean;
  data: TaxPayment;
}

export const taxPaymentService = {
  // POST /api/v1/tax-payments
  create: async (payload: TaxPaymentPayload): Promise<TaxPaymentResponse> => {
    return apiClient.post<TaxPaymentResponse>('/tax-payments', payload);
  },

  // GET /api/v1/tax-payments
  list: async (params?: { 
    taxFormId?: string; 
    status?: string;
    page?: number; 
    limit?: number;
  }): Promise<TaxPaymentListResponse> => {
    const queryString = params 
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    return apiClient.get<TaxPaymentListResponse>(`/tax-payments${queryString}`);
  },

  // GET /api/v1/tax-payments/:id
  getById: async (id: string): Promise<TaxPaymentResponse> => {
    return apiClient.get<TaxPaymentResponse>(`/tax-payments/${id}`);
  },

  // PUT /api/v1/tax-payments/:id
  update: async (id: string, payload: Partial<TaxPaymentPayload>): Promise<TaxPaymentResponse> => {
    return apiClient.put<TaxPaymentResponse>(`/tax-payments/${id}`, payload);
  },

  // POST /api/v1/tax-payments/:id/record-payment
  recordPayment: async (id: string, payload: {
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
    paymentReference?: string;
  }): Promise<TaxPaymentResponse> => {
    return apiClient.post<TaxPaymentResponse>(`/tax-payments/${id}/record-payment`, payload);
  },

  // POST /api/v1/tax-payments/:id/upload-proof
  uploadProof: async (id: string, file: File): Promise<TaxPaymentResponse> => {
    const formData = new FormData();
    formData.append('proof', file);
    
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${apiClient['baseUrl']}/tax-payments/${id}/upload-proof`, {
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
