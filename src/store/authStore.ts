import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/api/authApi';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  pendingToken: string | null;       // token intermedio del paso 1 del login (2FA)
  isAuthenticated: boolean;
  adminId: string | null;
  adminUsername: string | null;
  isBootstrapping: boolean;          // true mientras se intenta el refresh inicial al cargar

  setTokens: (accessToken: string, refreshToken: string) => void;
  setPendingToken: (token: string) => void;
  clearPendingToken: () => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

function parseJwt(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      pendingToken: null,
      isAuthenticated: false,
      adminId: null,
      adminUsername: null,
      isBootstrapping: false,

      setTokens: (accessToken, refreshToken) => {
        const payload = parseJwt(accessToken);
        set({
          accessToken,
          refreshToken,
          pendingToken: null,
          isAuthenticated: true,
          adminId: (payload.sub as string) ?? null,
          adminUsername: (payload.username as string) ?? null,
        });
      },

      setPendingToken: (token) => {
        set({ pendingToken: token });
      },

      clearPendingToken: () => {
        set({ pendingToken: null });
      },

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const data = await authApi.refresh(refreshToken);
        const payload = parseJwt(data.access_token);
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
          adminId: (payload.sub as string) ?? null,
          adminUsername: (payload.username as string) ?? null,
        });
      },

      logout: async () => {
        const { refreshToken } = get();
        // Revocar en el servidor antes de limpiar el estado local.
        // Si falla la revocación (ej. token ya expirado), limpiamos igual.
        if (refreshToken) {
          try {
            await authApi.logout(refreshToken);
          } catch {
            // Silenciamos el error — el estado local se limpia de todas formas
          }
        }
        set({
          accessToken: null,
          refreshToken: null,
          pendingToken: null,
          isAuthenticated: false,
          adminId: null,
          adminUsername: null,
        });
      },

      // Al cargar la app, si hay un refresh token persistido intentamos
      // obtener un nuevo access token antes de mostrar cualquier UI protegida.
      bootstrap: async () => {
        const { refreshToken, isAuthenticated } = get();

        // Si no hay refresh token no hay sesión que recuperar
        if (!refreshToken) {
          set({ isBootstrapping: false });
          return;
        }

        // Si ya tenemos access token (mismo tab, recarga rápida) salimos
        if (isAuthenticated && get().accessToken) {
          set({ isBootstrapping: false });
          return;
        }

        set({ isBootstrapping: true });
        try {
          await get().refresh();
        } catch {
          // Refresh inválido o expirado — limpiar sesión silenciosamente
          set({
            accessToken: null,
            refreshToken: null,
            pendingToken: null,
            isAuthenticated: false,
            adminId: null,
            adminUsername: null,
          });
        } finally {
          set({ isBootstrapping: false });
        }
      },
    }),
    {
      name: 'sso-admin-auth',
      // sessionStorage: se borra al cerrar el tab — mejor que localStorage
      // para tokens de larga duración como el refresh token
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        // pendingToken NO se persiste: es un token intermedio de vida corta (3 minutos).
        // Persistirlo en sessionStorage no aporta valor (el usuario tiene que completar
        // el 2FA en la misma sesión de navegación) y amplía la superficie de exposición.
        adminId: state.adminId,
        adminUsername: state.adminUsername,
      }),
    }
  )
);