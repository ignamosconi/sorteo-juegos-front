import { apiClient } from './client';
import type {
  Sport,
  SportCategory,
  SportCategoryGroup,
  SportCategoryTeam,
  CreateGroupItem,
  BulkCreateGroupsPayload,
  AssignTeamPayload,
} from '@/types/api.types';

export const sportApi = {
  // Sports
  getByRaffle: (raffleId: string) =>
    apiClient.get<Sport[]>(`/raffles/${raffleId}/sports`).then(r => r.data),
  createSport: (raffleId: string, data: { name: string; abbreviation: string; order?: number }) =>
    apiClient.post<Sport>(`/raffles/${raffleId}/sports`, data).then(r => r.data),
  updateSport: (id: string, data: Partial<{ name: string; abbreviation: string; order: number }>) =>
    apiClient.patch<Sport>(`/sports/${id}`, data).then(r => r.data),
  deleteSport: (id: string) => apiClient.delete(`/sports/${id}`),

  // Categories
  getCategories: (sportId: string) =>
    apiClient.get<SportCategory[]>(`/sports/${sportId}/categories`).then(r => r.data),
  createCategory: (sportId: string, data: { name: string; order?: number }) =>
    apiClient.post<SportCategory>(`/sports/${sportId}/categories`, data).then(r => r.data),
  updateCategory: (id: string, data: Partial<{ name: string; order: number }>) =>
    apiClient.patch<SportCategory>(`/sport-categories/${id}`, data).then(r => r.data),
  deleteCategory: (id: string) => apiClient.delete(`/sport-categories/${id}`),

  // Groups
  getGroups: (sportId: string, categoryId?: string | null) =>
    apiClient.get<SportCategoryGroup[]>(`/sports/${sportId}/groups`, {
      params: categoryId !== undefined ? { categoryId } : undefined,
    }).then(r => r.data),
  createGroups: (sportId: string, groups: CreateGroupItem[], categoryId?: string | null) =>
    apiClient.post<SportCategoryGroup[]>(`/sports/${sportId}/groups`, { groups } as BulkCreateGroupsPayload, {
      params: categoryId ? { categoryId } : undefined,
    }).then(r => r.data),
  updateGroup: (id: string, data: Partial<{ name: string; capacity: number; sortOrder: number }>) =>
    apiClient.patch<SportCategoryGroup>(`/sport-groups/${id}`, data).then(r => r.data),
  deleteGroup: (id: string) => apiClient.delete(`/sport-groups/${id}`),

  // Team assignments
  getAssignedTeams: (sportId: string, categoryId?: string | null) =>
    apiClient.get<SportCategoryTeam[]>(`/sports/${sportId}/assigned-teams`, {
      params: categoryId !== undefined ? { categoryId } : undefined,
    }).then(r => r.data),
  assignTeam: (sportId: string, raffleTeamId: string, categoryId?: string | null) =>
    apiClient.post<SportCategoryTeam>(`/sports/${sportId}/assign-team`, { raffleTeamId } as AssignTeamPayload, {
      params: categoryId ? { categoryId } : undefined,
    }).then(r => r.data),
  removeTeamAssignment: (id: string) => apiClient.delete(`/sport-category-teams/${id}`),
};