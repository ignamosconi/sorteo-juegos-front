import { apiClient } from './client';
import type { Raffle, GetRafflesFilter } from '@/types/api.types';

export const raffleApi = {
  getAll: (params?: GetRafflesFilter) =>
    apiClient.get<Raffle[]>('/raffles', { params }).then(r => r.data),
  getById: (id: string) => apiClient.get<Raffle>(`/raffles/${id}`).then(r => r.data),
  create: (data: { name: string }) => apiClient.post<Raffle>('/raffles', data).then(r => r.data),
  update: (id: string, data: { name?: string }) =>
    apiClient.patch<Raffle>(`/raffles/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/raffles/${id}`),
  start: (id: string) => apiClient.post<Raffle>(`/raffles/${id}/start`).then(r => r.data),
};