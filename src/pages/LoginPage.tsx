import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, TextInput, PasswordInput, Button,
  Text, Title, Alert, Group, Image, PinInput,
  Stack, Divider, CopyButton, Tooltip, ActionIcon,
  Code, Transition,
} from '@mantine/core';
import {
  IconAlertCircle, IconShieldCheck, IconCopy, IconCheck,
} from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import logoUtn from '@/assets/logo-utn.png';
import type { Admin2faSetupResponse } from '@/types/api.types';
import { ENV } from '@/config/env';


type LoginStep = 'credentials' | 'setup_2fa' | 'validate_2fa';

export function LoginPage() {
  const { loginStep1, setup2fa, confirm2fa, validate2fa } = useAuth();
  const { isAuthenticated, pendingToken } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState<LoginStep>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [setupData, setSetupData] = useState<Admin2faSetupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ref al primer input del PinInput para darle foco automático
  const pinContainerRef = useRef<HTMLDivElement>(null);


  const focusFirstPinInput = () => {
    const firstInput = pinContainerRef.current?.querySelector('input');

    if (firstInput instanceof HTMLInputElement) {
      firstInput.focus();
    }
  };

  const focusNextPinInput = () => {
    const inputs = pinContainerRef.current?.querySelectorAll('input');

    if (!inputs || inputs.length === 0) return;

    const nextIndex = Math.min(totpCode.length, inputs.length - 1);
    const nextInput = inputs[nextIndex];

    if (nextInput instanceof HTMLInputElement) {
      nextInput.focus();
    }
  };

  //Evitar tab o shift+tab para navegar por los pines
  const handlePinKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
    }
  };

  const resetTotpInput = () => {
    setTotpCode('');

    setTimeout(() => {
      focusFirstPinInput();
    }, 50);
  };

  // Extrae el mensaje de error de una respuesta Axios
  const extractErrorMessage = (err: unknown): string => {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    return axiosErr?.response?.data?.message ?? '';
  };

  // Errores que invalidan el challenge actual — el usuario debe volver
  // a ingresar sus credenciales para obtener un nuevo pending token.
  const isFatalAuthError = (message: string): boolean => {
    return (
      message.includes('Demasiados intentos fallidos') ||
      message.includes('Token de sesión pendiente inválido o expirado') ||
      message.includes('Too Many Requests')
    );
  };

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // Foco automático en el primer input del PinInput al cambiar de step
  useEffect(() => {
    if (step === 'validate_2fa' || step === 'setup_2fa') {
      const timer = setTimeout(() => {
        focusFirstPinInput();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [step]);

  // ── Paso 1: credenciales ──────────────────────────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación manual para evitar el pop-in del browser con minLength nativo
    if (username.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await loginStep1(username, password);
      if (response.requires_2fa_setup) {
        const qrData = await setup2fa(response.pending_token);
        setSetupData(qrData);
        setStep('setup_2fa');
      } else {
        setStep('validate_2fa');
      }
    } catch {
      setError('Credenciales inválidas. Verificá tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2a: confirmar primer código TOTP (setup) ─────────────────────────
  const handleConfirm2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData?.confirm_pending_token) {
      setError('La sesión expiró. Volvé a ingresar tus credenciales.');
      setStep('credentials');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await confirm2fa(setupData.confirm_pending_token, totpCode);
    } catch (err) {
      const message = extractErrorMessage(err);
      if (isFatalAuthError(message)) {
        goBackToCredentials();
        setError(message);
      } else {
        setError('Código incorrecto. Verificá que el autenticador esté sincronizado e intentá de nuevo.');
        resetTotpInput();
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2b: validar código TOTP (logins posteriores) ────────────────────
  const handleValidate2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingToken) {
      setError('La sesión expiró. Volvé a ingresar tus credenciales.');
      setStep('credentials');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await validate2fa(pendingToken, totpCode);
    } catch (err) {
      const message = extractErrorMessage(err);
      if (isFatalAuthError(message)) {
        goBackToCredentials();
        setError(message);
      } else {
        setError('Código incorrecto. Intentá de nuevo con el código actual de tu autenticador.');
        resetTotpInput();
      }
    } finally {
      setLoading(false);
    }
  };

  const goBackToCredentials = () => {
    setStep('credentials');
    setTotpCode('');
    setSetupData(null);
    setError(null);
    setUsername('');
    setPassword('');
  };

  const isSetupStep = step === 'setup_2fa';
  const is2faStep = step === 'setup_2fa' || step === 'validate_2fa';
  const cardWidth = isSetupStep ? 480 : is2faStep ? 400 : 360;

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <Card
        withBorder
        shadow="sm"
        radius="md"
        p="xl"
        style={{
          width: cardWidth,
          transition: 'width 0.3s ease',
          overflow: 'hidden',
        }}
      >
        <Group justify="space-between" align="center" mb="xs">
          <Group gap="xs">
            <Image src={logoUtn} w={32} h={32} fit="contain" />
            <Text fw={600} size="sm">FRVM</Text>
          </Group>
          <ThemeToggle />
        </Group>

        <Transition
          mounted={!!error && step !== 'setup_2fa'}
          transition="fade"
          duration={200}
        >
          {(styles) => (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              mb="md"
              radius="md"
              mt="sm"
              style={styles}
            >
              {error}
            </Alert>
          )}
        </Transition>

        {/* ── Step 1: Credenciales ── */}
        {step === 'credentials' && (
          <>
            <Title order={2} mb={4} mt="sm">Iniciar sesión</Title>
            <Text size="sm" c="dimmed" mb="lg">Panel de administración de {ENV.APP_NAME}</Text>
            <form onSubmit={(e) => void handleCredentials(e)}>
              <TextInput
                label="Usuario"
                placeholder="admin"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                mb="sm"
                required
                autoComplete="username"
                data-autofocus
              />
              <PasswordInput
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                mb="lg"
                required
                autoComplete="current-password"
              />
              <Button
                type="submit"
                fullWidth
                loading={loading}
                style={{ background: '#f5a705', color: '#1a1200' }}
              >
                Continuar
              </Button>
            </form>
          </>
        )}

        {/* ── Step 2a: Setup 2FA ── */}
        {step === 'setup_2fa' && setupData && (
          <>
            <Title order={3} mb={4} mt="sm">Configurar autenticador</Title>

            <Alert icon={<IconShieldCheck size={16} />} color="orange" mb="md" radius="md">
              <Text size="sm" fw={500}>
                Descargá <strong>Google Authenticator</strong> u otra app de autenticación para continuar.
              </Text>
            </Alert>

            <Stack gap="md" mb="md">
              <Box>
                <Text size="sm" fw={500} mb="xs">1. Escaneá este código QR con la app:</Text>
                <Box
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    background: 'white',
                    borderRadius: 8,
                    padding: 3,
                  }}
                >
                  <img
                    src={setupData.qrCodeDataUrl}
                    alt="Código QR para autenticador"
                    style={{ width: 180, height: 180 }}
                  />
                </Box>
              </Box>

              <Box>
                <Text size="sm" fw={500} mb={4}>
                  2. O bien ingresá este código manualmente:
                </Text>
                <Group gap="xs" align="center">
                  <Code
                    style={{
                      flex: 1,
                      letterSpacing: '0.1em',
                      fontSize: 13,
                      padding: '6px 10px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {setupData.manualEntrySecret}
                  </Code>
                  <CopyButton value={setupData.manualEntrySecret} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copiado' : 'Copiar'}>
                        <ActionIcon variant="subtle" onClick={copy} size="lg">
                          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Box>
            </Stack>

            <Divider mb="md" />

            <form onSubmit={(e) => void handleConfirm2fa(e)}>
              <Text size="sm" fw={500} mb="xs">
                3. Ingresá el código de 6 dígitos generado por la app:
              </Text>
              <Group
                justify="center"
                mt="md"
                mb={error ? 'sm' : 'lg'}
                ref={pinContainerRef}
                className="pin-input-container"
                onMouseDown={(event) => {
                  event.preventDefault();
                  focusNextPinInput();
                }}
                onKeyDown={handlePinKeyDown}
              >
                <PinInput
                  length={6}
                  type="number"
                  value={totpCode}
                  onChange={(val) => { setTotpCode(val); setError(null); }}
                  placeholder="○"
                  size="lg"
                  oneTimeCode
                />
              </Group>

              <Transition mounted={!!error} transition="fade" duration={200}>
                {(styles) => (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    mb="md"
                    radius="md"
                    style={styles}
                  >
                    {error}
                  </Alert>
                )}
              </Transition>

              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={totpCode.length !== 6}
                style={{ background: '#f5a705', color: '#1a1200' }}
                mb="xs"
              >
                Activar autenticador e ingresar
              </Button>
              <Button variant="subtle" fullWidth size="xs" onClick={goBackToCredentials}>
                Volver a credenciales
              </Button>
            </form>
          </>
        )}

        {/* ── Step 2b: Validar 2FA ── */}
        {step === 'validate_2fa' && (
          <>
            <Title order={2} mb={4} mt="sm">Verificación en dos pasos</Title>
            <Text size="sm" c="dimmed" mb="lg">
              Ingresá el código de 6 dígitos de tu app autenticadora.
            </Text>
            <form onSubmit={(e) => void handleValidate2fa(e)}>
              <Group
                justify="center"
                mt="md"
                mb="lg"
                ref={pinContainerRef}
                className="pin-input-container"
                onMouseDown={(event) => {
                  event.preventDefault();
                  focusNextPinInput();
                }}
                onKeyDown={handlePinKeyDown}
              >
                <PinInput
                  length={6}
                  type="number"
                  value={totpCode}
                  onChange={(val) => { setTotpCode(val); setError(null); }}
                  placeholder="○"
                  size="lg"
                  oneTimeCode
                />
              </Group>

              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={totpCode.length !== 6}
                style={{ background: '#f5a705', color: '#1a1200' }}
                mb="xs"
              >
                Verificar e ingresar
              </Button>
              <Button variant="subtle" fullWidth size="xs" onClick={goBackToCredentials}>
                Volver a credenciales
              </Button>
            </form>
          </>
        )}
      </Card>
    </Box>
  );
}