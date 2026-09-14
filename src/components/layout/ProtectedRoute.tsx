import { Navigate } from 'react-router-dom';
import { Center, Loader, Text, Stack } from '@mantine/core';
import { useAuthStore } from '@/store/authStore';

interface Props {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  // Verificar tanto isAuthenticated como la presencia del accessToken en memoria.
  // isAuthenticated puede ser manipulado en sessionStorage, pero accessToken
  // no se persiste — solo existe en memoria si el bootstrap lo obtuvo del servidor.
  const { isAuthenticated, isBootstrapping, accessToken } = useAuthStore();

  // Mientras el bootstrap intenta recuperar la sesión desde sessionStorage,
  // mostramos un loader en lugar de redirigir al login prematuramente.
  // Esto evita el flash de UI autenticada y el redirect falso cuando
  // hay un refresh token válido pero el access token todavía no se recuperó.
  if (isBootstrapping) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader color="orange" />
          <Text size="sm" c="dimmed">Verificando sesión...</Text>
        </Stack>
      </Center>
    );
  }

  if (!isAuthenticated || !accessToken) return <Navigate to="/login" replace />;

  return <>{children}</>;
}