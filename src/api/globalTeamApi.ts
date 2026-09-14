import { apiClient } from './client';
import type { GlobalTeam } from '@/types/api.types';

export const globalTeamApi = {
  getAll: () => apiClient.get<GlobalTeam[]>('/global-teams').then(r => r.data),
  create: (data: { name: string; abbreviation: string; imagePath?: string }) =>
    apiClient.post<GlobalTeam>('/global-teams', data).then(r => r.data),
  update: (id: string, data: Partial<{ name: string; abbreviation: string; imagePath: string }>) =>
    apiClient.patch<GlobalTeam>(`/global-teams/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/global-teams/${id}`),
};