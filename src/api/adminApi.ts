import { apiClient } from './client';
import {
  AdminResponse,
  CreateAdminPayload,
  UpdateAdminPayload,
} from '@/types/api.types';

export const adminsApi = {
  findAll: async (): Promise<AdminResponse[]> => {
    const { data } = await apiClient.get<AdminResponse[]>('/admin/admins');
    return data;
  },

  findOne: async (id: string): Promise<AdminResponse> => {
    const { data } = await apiClient.get<AdminResponse>(`/admin/admins/${id}`);
    return data;
  },

  create: async (payload: CreateAdminPayload): Promise<AdminResponse> => {
    const { data } = await apiClient.post<AdminResponse>('/admin/admins', payload);
    return data;
  },

  updateSelf: async (payload: UpdateAdminPayload): Promise<AdminResponse> => {
    const { data } = await apiClient.patch<AdminResponse>('/admin/admins/me', payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/admins/${id}`);
  },
};