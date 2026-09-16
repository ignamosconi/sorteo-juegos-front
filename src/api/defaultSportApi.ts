import { apiClient } from './client';
import type { DefaultSport } from '@/types/api.types';

export const defaultSportApi = {
  getAll: () => apiClient.get<DefaultSport[]>('/default-sports').then(r => r.data),
  create: (data: { name: string; order?: number }) =>
    apiClient.post<DefaultSport>('/default-sports', data).then(r => r.data),
  update: (id: string, data: { name?: string; order?: number }) =>
    apiClient.patch<DefaultSport>(`/default-sports/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/default-sports/${id}`),
};