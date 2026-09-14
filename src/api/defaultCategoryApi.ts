import { apiClient } from './client';
import type { DefaultCategory } from '@/types/api.types';

export const defaultCategoryApi = {
  getAll: () => apiClient.get<DefaultCategory[]>('/default-categories').then(r => r.data),
  create: (data: { name: string; order?: number }) =>
    apiClient.post<DefaultCategory>('/default-categories', data).then(r => r.data),
  update: (id: string, data: { name?: string; order?: number }) =>
    apiClient.patch<DefaultCategory>(`/default-categories/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/default-categories/${id}`),
};