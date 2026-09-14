import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/authApi';
import type { AdminLoginResponse, Admin2faSetupResponse, TokenResponse } from '@/types/api.types';

export function useAuth() {
  const {
    isAuthenticated,
    setTokens,
    setPendingToken,
    clearPendingToken,
    logout,
    refresh,
  } = useAuthStore();

  // Paso 1: valida credenciales, guarda el pending_token, devuelve la respuesta
  // para que LoginPage decida qué step mostrar
  const loginStep1 = async (
    username: string,
    password: string,
  ): Promise<AdminLoginResponse> => {
    const data = await authApi.login(username, password);
    setPendingToken(data.pending_token);
    return data;
  };

  // Paso 2a: solicita el QR al backend (primera vez)
  const setup2fa = async (pendingToken: string): Promise<Admin2faSetupResponse> => {
    return authApi.setup2fa(pendingToken);
  };

  // Paso 3a: confirma el primer código TOTP y obtiene tokens reales
  const confirm2fa = async (
    pendingToken: string,
    totpCode: string,
  ): Promise<void> => {
    const data: TokenResponse = await authApi.confirm2fa(pendingToken, totpCode);
    clearPendingToken();
    setTokens(data.access_token, data.refresh_token);
  };

  // Paso 2b: valida código TOTP en logins posteriores y obtiene tokens reales
  const validate2fa = async (
    pendingToken: string,
    totpCode: string,
  ): Promise<void> => {
    const data: TokenResponse = await authApi.validate2fa(pendingToken, totpCode);
    clearPendingToken();
    setTokens(data.access_token, data.refresh_token);
  };

  // Reset del 2FA — requiere confirmar la password actual
  const reset2fa = async (password: string): Promise<void> => {
    await authApi.reset2fa(password);
  };

  return {
    isAuthenticated,
    loginStep1,
    setup2fa,
    confirm2fa,
    validate2fa,
    reset2fa,
    logout,
    refresh,
  };
}