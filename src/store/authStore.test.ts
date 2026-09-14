import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';

// Mock de authApi para no hacer llamadas reales
vi.mock('../api/authApi', () => ({
  authApi: {
    refresh: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authApi } from '../api/authApi';

const mockAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-admin', username: 'admin', type: 'access', exp: 9999999999 })) +
  '.signature';

const mockRefreshToken = 'refresh-token-mock';

describe('authStore', () => {
  beforeEach(() => {
    // Resetear el store antes de cada test
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

  describe('setTokens', () => {
    it('debería setear los tokens y parsear el payload del JWT', () => {
      useAuthStore.getState().setTokens(mockAccessToken, mockRefreshToken);
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe(mockAccessToken);
      expect(state.refreshToken).toBe(mockRefreshToken);
      expect(state.adminId).toBe('uuid-admin');
      expect(state.adminUsername).toBe('admin');
      expect(state.pendingToken).toBeNull();
    });
  });

  describe('setPendingToken / clearPendingToken', () => {
    it('debería guardar y limpiar el pending token', () => {
      useAuthStore.getState().setPendingToken('pending-jwt');
      expect(useAuthStore.getState().pendingToken).toBe('pending-jwt');

      useAuthStore.getState().clearPendingToken();
      expect(useAuthStore.getState().pendingToken).toBeNull();
    });
  });

  describe('logout', () => {
    it('debería revocar el token en el servidor y limpiar el estado', async () => {
      useAuthStore.setState({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        isAuthenticated: true,
        adminId: 'uuid-admin',
        adminUsername: 'admin',
      });

      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      expect(authApi.logout).toHaveBeenCalledWith(mockRefreshToken);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.adminId).toBeNull();
      expect(state.adminUsername).toBeNull();
    });

    it('debería limpiar el estado local incluso si el servidor falla', async () => {
      useAuthStore.setState({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        isAuthenticated: true,
      });

      vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      // El estado local se limpia aunque el servidor haya fallado
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().refreshToken).toBeNull();
    });

    it('no debería llamar al servidor si no hay refresh token', async () => {
      await useAuthStore.getState().logout();
      expect(authApi.logout).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('debería actualizar los tokens con los nuevos valores del servidor', async () => {
      useAuthStore.setState({ refreshToken: mockRefreshToken });

      vi.mocked(authApi.refresh).mockResolvedValue({
        access_token: mockAccessToken,
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 900,
      });

      await useAuthStore.getState().refresh();

      const state = useAuthStore.getState();
      expect(authApi.refresh).toHaveBeenCalledWith(mockRefreshToken);
      expect(state.accessToken).toBe(mockAccessToken);
      expect(state.refreshToken).toBe('new-refresh-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('debería lanzar error si no hay refresh token', async () => {
      await expect(useAuthStore.getState().refresh()).rejects.toThrow('No refresh token');
    });
  });

  describe('bootstrap', () => {
    it('debería limpiar isBootstrapping si no hay refresh token', async () => {
      await useAuthStore.getState().bootstrap();
      expect(useAuthStore.getState().isBootstrapping).toBe(false);
      expect(authApi.refresh).not.toHaveBeenCalled();
    });

    it('debería intentar refresh si hay refresh token y limpiar si falla', async () => {
      useAuthStore.setState({ refreshToken: mockRefreshToken });
      vi.mocked(authApi.refresh).mockRejectedValue(new Error('Expired'));

      await useAuthStore.getState().bootstrap();

      const state = useAuthStore.getState();
      expect(state.isBootstrapping).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.refreshToken).toBeNull();
    });

    it('debería setear isAuthenticated si el refresh es exitoso', async () => {
      useAuthStore.setState({ refreshToken: mockRefreshToken });
      vi.mocked(authApi.refresh).mockResolvedValue({
        access_token: mockAccessToken,
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 900,
      });

      await useAuthStore.getState().bootstrap();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isBootstrapping).toBe(false);
    });
  });
});