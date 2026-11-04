// src/services/http/listingService.ts

import { api } from './apiClient';
import { ApiResponse, PaginatedResponse, Listing } from '@shared/types/api';

export interface CreateListingPayload {
  title: string;
  description: string;
  category: string;
  price?: number;
  currency?: string;
  location?: { address?: string; city?: string; country?: string };
  images?: string[];
}

export interface ListingSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  beds?: number;
  type?: string;
}

const listingService = {
  getListings: (params?: ListingSearchParams) =>
    api.get<PaginatedResponse<Listing>>('/housing', { params }),

  getListing: (id: string) => api.get<ApiResponse<Listing>>(`/housing/${id}`),

  createListing: (data: CreateListingPayload) =>
    api.post<ApiResponse<Listing>>('/housing', data),

  updateListing: (id: string, data: Partial<CreateListingPayload>) =>
    api.patch<ApiResponse<Listing>>(`/housing/${id}`, data),

  deleteListing: (id: string) => api.delete<ApiResponse<null>>(`/housing/${id}`),

  markInterest: (id: string) => api.post<ApiResponse<unknown>>(`/housing/${id}/interest`),

  removeInterest: (id: string) => api.delete<ApiResponse<unknown>>(`/housing/${id}/interest`),

  getInterested: (params?: ListingSearchParams) =>
    api.get<PaginatedResponse<Listing>>('/housing/interested', { params }),

  getMyListings: (params?: ListingSearchParams) =>
    api.get<PaginatedResponse<Listing>>('/housing/my-listings', { params }),
};

export default listingService;
