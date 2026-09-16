import { useState, useRef } from 'react';
import {
  Box, Title, Text, TextInput, PasswordInput,
  Button, Alert, Tabs, Paper, Stack,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconShieldOff, IconUser } from '@tabler/icons-react';
import { adminsApi } from '@/api/adminApi';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';

export function MyProfilePage() {
  const { adminUsername, setTokens, accessToken, refreshToken } = useAuthStore();
  const { reset2fa } = useAuth();

  const [username, setUsername] = useState(adminUsername ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const tabsListRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (value: string | null) => {
    if (!value || !tabsListRef.current) return;
    const container = tabsListRef.current;
    
    const activeTab = container.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
    if (!activeTab) return;

    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const padding = 16; 

    if (tabRect.left < containerRect.left) {
      container.scrollBy({ 
        left: tabRect.left - containerRect.left - padding, 
        behavior: 'smooth' 
      });
    } else if (tabRect.right > containerRect.right) {
      container.scrollBy({ 
        left: tabRect.right - containerRect.right + padding, 
        behavior: 'smooth' 
      });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    const hasUsernameChange = username !== adminUsername;
    const hasPasswordChange = Boolean(password);

    if (!hasUsernameChange && !hasPasswordChange) {
      setProfileError('No hay cambios para guardar.');
      return;
    }

    if (!currentPassword) {
      setProfileError('Ingresá tu contraseña actual para confirmar los cambios.');
      return;
    }

    setProfileLoading(true);
    try {
      const payload: Record<string, string> = { currentPassword };
      if (hasUsernameChange) payload.username = username;
      if (hasPasswordChange) payload.password = password;

      await adminsApi.updateSelf(payload as any);
      setProfileSuccess(true);
      setPassword('');
      setCurrentPassword('');
      if (accessToken && refreshToken) setTokens(accessToken, refreshToken);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setProfileError(axiosError?.response?.data?.message ?? 'Error al guardar.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleReset2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);
    setResetLoading(true);
    try {
      await reset2fa(resetPassword);
      setResetSuccess(true);
      setResetPassword('');
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setResetError(axiosError?.response?.data?.message ?? 'Error al resetear el 2FA.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Box maw={480}>
      <Title order={2} mb={4}>Mi perfil</Title>
      <Text c="dimmed" size="sm" mb="xl">
        Hola, <strong>{adminUsername}</strong>. Desde acá podés actualizar tus datos y gestionar tu autenticador.
      </Text>

      <Tabs defaultValue="perfil" variant="outline" radius="md" onChange={handleTabChange}>
        <Tabs.List
          ref={tabsListRef}
          mb="lg"
          style={{
            flexWrap: 'nowrap',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <Tabs.Tab 
            value="perfil" 
            data-value="perfil"
            leftSection={<IconUser size={14} />} 
            style={{ whiteSpace: 'nowrap' }}
          >
            Datos personales
          </Tabs.Tab>
          
          <Tabs.Tab 
            value="2fa" 
            data-value="2fa"
            leftSection={<IconShieldOff size={14} />} 
            style={{ whiteSpace: 'nowrap' }}
          >
            Autenticador 2FA
          </Tabs.Tab>
        </Tabs.List>

        {/* ── Tab: Datos personales ── */}
        <Tabs.Panel value="perfil">
          <Paper withBorder radius="md" p="lg">
            {profileError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">
                {profileError}
              </Alert>
            )}
            {profileSuccess && (
              <Alert icon={<IconCheck size={16} />} color="green" mb="md" radius="md">
                Cambios guardados correctamente.
              </Alert>
            )}
            <form onSubmit={(e) => void handleProfileSubmit(e)}>
              <Stack gap="sm">
                <TextInput
                  label="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />

                <PasswordInput
                  label="Nueva contraseña"
                  description="Dejá vacío si no querés cambiarla."
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />

                <PasswordInput
                  label="Contraseña actual"
                  description="Requerida para confirmar los cambios de perfil."
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  mt="md"
                  loading={profileLoading}
                  style={{ background: '#f5a705', color: '#1a1200' }}
                >
                  Guardar cambios
                </Button>
              </Stack>
            </form>
          </Paper>
        </Tabs.Panel>

        {/* ── Tab: Reset 2FA ── */}
        <Tabs.Panel value="2fa">
          <Paper withBorder radius="md" p="lg">
            <Text size="sm" c="dimmed" mb="lg">
              Si tu secret TOTP se vio comprometido, reseteá el autenticador. El próximo login te pedirá vincular uno nuevo con un QR fresco.
            </Text>

            {resetError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">
                {resetError}
              </Alert>
            )}
            {resetSuccess && (
              <Alert icon={<IconCheck size={16} />} color="green" mb="md" radius="md">
                Autenticador reseteado. El próximo login te pedirá configurarlo de nuevo.
              </Alert>
            )}

            <form onSubmit={(e) => void handleReset2fa(e)}>
              <PasswordInput
                label="Confirmá tu contraseña actual"
                description="Necesaria para confirmar tu identidad."
                placeholder="••••••••"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                mb="lg"
                required
                minLength={8}
              />
              <Button
                type="submit"
                fullWidth
                loading={resetLoading}
                color="red"
                variant="light"
                leftSection={<IconShieldOff size={16} />}
              >
                Resetear autenticador 2FA
              </Button>
            </form>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}