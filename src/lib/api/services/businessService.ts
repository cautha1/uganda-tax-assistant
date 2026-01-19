import { apiClient } from '../client';

// Types for Business endpoints
export interface BusinessPayload {
  name: string;
  tin: string;
  businessType: 'sole_proprietorship' | 'partnership' | 'limited_company' | 'ngo' | 'cooperative' | 'other';
  address?: string;
  annualTurnover?: number;
  taxTypes?: ('paye' | 'income' | 'presumptive' | 'vat')[];
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerNin?: string;
}

export interface Business {
  id: string;
  name: string;
  tin: string;
  businessType: string;
  address?: string;
  annualTurnover?: number;
  taxTypes?: string[];
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerNin?: string;
  tinVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessListResponse {
  success: boolean;
  data: Business[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface BusinessResponse {
  success: boolean;
  data: Business;
}

export const businessService = {
  // POST /api/v1/business
  create: async (payload: BusinessPayload): Promise<BusinessResponse> => {
    return apiClient.post<BusinessResponse>('/business', payload);
  },

  // GET /api/v1/business
  list: async (params?: { page?: number; limit?: number }): Promise<BusinessListResponse> => {
    const queryString = params 
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    return apiClient.get<BusinessListResponse>(`/business${queryString}`);
  },

  // GET /api/v1/business/:id
  getById: async (id: string): Promise<BusinessResponse> => {
    return apiClient.get<BusinessResponse>(`/business/${id}`);
  },

  // PUT /api/v1/business/:id
  update: async (id: string, payload: Partial<BusinessPayload>): Promise<BusinessResponse> => {
    return apiClient.put<BusinessResponse>(`/business/${id}`, payload);
  },

  // DELETE /api/v1/business/:id
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/business/${id}`);
  },

  // POST /api/v1/business/:id/verify-tin
  verifyTin: async (id: string): Promise<{ success: boolean; verified: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; verified: boolean; message: string }>(`/business/${id}/verify-tin`);
  },
};
