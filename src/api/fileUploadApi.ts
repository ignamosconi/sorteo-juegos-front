import { apiClient } from './client';

export interface UploadImageResponse {
  path: string;
}

export const fileUploadApi = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<UploadImageResponse>('/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.path;
  },

  deleteImage: async (path: string): Promise<void> => {
    if (!path) return;
    await apiClient.delete('/uploads/image', { data: { path } }).catch(() => {});
  },
};