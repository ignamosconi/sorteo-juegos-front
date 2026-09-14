import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    setup2fa: vi.fn(),
    confirm2fa: vi.fn(),
    validate2fa: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    reset2fa: vi.fn(),
  },
}));

import { authApi } from '../api/authApi';

const mockAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-admin', username: 'admin', type: 'access', exp: 9999999999 })) +
  '.signature';

describe('useAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      pendingToken: null,
      isAuthenticated: false,
      adminId: null,
      adminUsername: null,
      isBootstrapping: false,
    });
    vi.clearAllMocks();
  });

  describe('loginStep1', () => {
    it('debería guardar el pending_token y devolver la respuesta', async () => {
      vi.mocked(authApi.login).mockResolvedValue({
        pending_token: 'pending-jwt',
        requires_2fa_setup: false,
      });

      const { result } = renderHook(() => useAuth());

      let response;
      await act(async () => {
        response = await result.current.loginStep1('admin', 'password123');
      });

      expect(authApi.login).toHaveBeenCalledWith('admin', 'password123');
      expect(useAuthStore.getState().pendingToken).toBe('pending-jwt');
      expect(response).toEqual({ pending_token: 'pending-jwt', requires_2fa_setup: false });
    });

    it('debería propagar el error si el login falla', async () => {
      vi.mocked(authApi.login).mockRejectedValue(new Error('Credenciales inválidas'));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => { await result.current.loginStep1('admin', 'wrong'); })
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('confirm2fa', () => {
    it('debería setear los tokens reales y limpiar el pending token', async () => {
      useAuthStore.setState({ pendingToken: 'pending-jwt' });

      vi.mocked(authApi.confirm2fa).mockResolvedValue({
        access_token: mockAccessToken,
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 900,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.confirm2fa('pending-jwt', '123456');
      });

      expect(authApi.confirm2fa).toHaveBeenCalledWith('pending-jwt', '123456');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().pendingToken).toBeNull();
    });
  });

  describe('validate2fa', () => {
    it('debería setear los tokens reales y limpiar el pending token', async () => {
      useAuthStore.setState({ pendingToken: 'pending-jwt' });

      vi.mocked(authApi.validate2fa).mockResolvedValue({
        access_token: mockAccessToken,
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 900,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.validate2fa('pending-jwt', '654321');
      });

      expect(authApi.validate2fa).toHaveBeenCalledWith('pending-jwt', '654321');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().pendingToken).toBeNull();
    });
  });

  describe('reset2fa', () => {
    it('debería llamar al endpoint de reset con la password', async () => {
      vi.mocked(authApi.reset2fa).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.reset2fa('mi-password-actual');
      });

      expect(authApi.reset2fa).toHaveBeenCalledWith('mi-password-actual');
    });
  });

  describe('logout', () => {
    it('debería limpiar el estado y llamar al servidor', async () => {
      useAuthStore.setState({
        accessToken: mockAccessToken,
        refreshToken: 'refresh-token',
        isAuthenticated: true,
      });
      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});