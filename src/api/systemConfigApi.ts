import { apiClient } from './client';
import type { SystemConfig, UpdateSystemConfigPayload } from '@/types/api.types';

export const systemConfigApi = {
  get: () => apiClient.get<SystemConfig>('/system-config').then(r => r.data),
  getPublic: () => apiClient.get<SystemConfig>('/system-config/public').then(r => r.data),
  update: (data: UpdateSystemConfigPayload) =>
    apiClient.patch<SystemConfig>('/system-config', data).then(r => r.data),
};