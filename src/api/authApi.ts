import { apiClient } from './client';
import {
  TokenResponse,
  AdminLoginResponse,
  Admin2faSetupResponse,
  Reset2faPayload,
} from '@/types/api.types';

export const authApi = {
  // Paso 1: valida credenciales, devuelve pending_token
  login: async (username: string, password: string): Promise<AdminLoginResponse> => {
    const { data } = await apiClient.post<AdminLoginResponse>('/admin/auth/login', {
      username,
      password,
    });
    return data;
  },

  // Paso 2a (primera vez): genera QR y secret TOTP
  setup2fa: async (pending_token: string): Promise<Admin2faSetupResponse> => {
    const { data } = await apiClient.post<Admin2faSetupResponse>('/admin/auth/2fa/setup', {
      pending_token,
    });
    return data;
  },

  // Paso 3a (primera vez): confirma el primer código TOTP y activa el 2FA
  confirm2fa: async (pending_token: string, totp_code: string): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/admin/auth/2fa/confirm', {
      pending_token,
      totp_code,
    });
    return data;
  },

  // Paso 2b (logins posteriores): valida código TOTP y emite tokens reales
  validate2fa: async (pending_token: string, totp_code: string): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/admin/auth/2fa/validate', {
      pending_token,
      totp_code,
    });
    return data;
  },

  // Renueva el access token usando el refresh token
  refresh: async (refresh_token: string): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/admin/auth/refresh', {
      refresh_token,
    });
    return data;
  },

  // Cierra sesión revocando el refresh token en el servidor
  logout: async (refresh_token: string): Promise<void> => {
    await apiClient.post('/admin/auth/logout', { refresh_token });
  },

  // Resetea el 2FA del admin autenticado — requiere confirmar password actual
  reset2fa: async (password: string): Promise<void> => {
    // Usamos la interfaz para tipar el body que se envía al servidor
    const payload: Reset2faPayload = { password };
    await apiClient.post('/admin/auth/2fa/reset', payload);
  },
};