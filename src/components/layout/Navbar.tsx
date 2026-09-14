import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Stack, Text, UnstyledButton, Group, Box, Divider, Image, Loader, Tooltip,
} from '@mantine/core';
import { IconUser, IconUsers, IconLogout, IconDashboard, IconQuestionMark } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import logoUtn from '@/assets/logo-utn.png';
import { ENV } from '@/config/env';


const NAVBAR_EXPANDED = 220;
const NAVBAR_COLLAPSED = 60;

// ── Drag handle ───────────────────────────────────────────────────────────────

interface DragHandleProps {
  isOpen: boolean;
  onToggle: () => void;
}

function DragHandle({ isOpen, onToggle }: DragHandleProps) {
  const startX = useRef(0);
  const didDrag = useRef(false);
  const [hovered, setHovered] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    didDrag.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (Math.abs(e.clientX - startX.current) > 8) didDrag.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const delta = e.clientX - startX.current;
    if (!didDrag.current || Math.abs(delta) < 8) {
      onToggle();
    } else if (delta > 30 && !isOpen) {
      onToggle();
    } else if (delta < -30 && isOpen) {
      onToggle();
    }
  };

  return (
    <Box
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 14,
        height: '100%',
        cursor: 'col-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      <Box
        style={{
          width: 3,
          height: 36,
          borderRadius: 2,
          background: hovered
            ? 'var(--mantine-color-orange-4)'
            : 'var(--mantine-color-default-border)',
          transition: 'background 150ms ease',
        }}
      />
    </Box>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ElementType;
  isOpen: boolean;
}

function NavItem({ to, label, icon: Icon, isOpen }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  const button = (
    <NavLink to={to}>
      {() => (
        <UnstyledButton
          w="100%"
          px="sm"
          py={7}
          style={(theme) => ({
            borderRadius: theme.radius.sm,
            background: isActive ? 'var(--mantine-color-orange-light)' : 'transparent',
            color: isActive ? '#f5a705' : 'var(--mantine-color-text)',
          })}
        >
          <Group gap="sm" justify={isOpen ? 'flex-start' : 'center'} wrap="nowrap">
            <Icon size={15} style={{ flexShrink: 0 }} />
            {isOpen && (
              <Text size="sm" style={{ whiteSpace: 'nowrap' }}>{label}</Text>
            )}
          </Group>
        </UnstyledButton>
      )}
    </NavLink>
  );

  if (!isOpen) {
    return (
      <Tooltip label={label} position="right" withArrow>
        {button}
      </Tooltip>
    );
  }

  return button;
}

// ── Navbar ────────────────────────────────────────────────────────────────────

interface NavbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  isMobile: boolean;
}

export function Navbar({ isOpen, onToggle, onClose, isMobile }: NavbarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      setLogoutLoading(false);
      navigate('/login');
    }
  };

  // En mobile: el contenedor interno se posiciona fixed y puede expandirse
  // por encima del contenido. El AppShell siempre ve 60px.
  const visualWidth = isOpen ? NAVBAR_EXPANDED : NAVBAR_COLLAPSED;

  return (
    <>
      {/* Backdrop: solo en mobile cuando está abierto */}
      {isMobile && isOpen && (
        <Box
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 99,
          }}
        />
      )}

      {/* Contenedor visual del navbar */}
      <Box
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 0 : undefined,
          left: isMobile ? 0 : undefined,
          height: isMobile ? '100dvh' : '100%',
          width: visualWidth,
          transition: 'width 200ms ease',
          overflow: 'visible',
          zIndex: isMobile ? 100 : undefined,
          background: 'var(--mantine-color-body)',
          borderRight: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <DragHandle isOpen={isOpen} onToggle={onToggle} />

        <Stack h="100%" justify="space-between" p="md" style={{ overflow: 'hidden' }}>
          <Box>
            <NavLink to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Group mb="xl" gap="xs" justify={isOpen ? 'flex-start' : 'center'} wrap="nowrap" style={{ cursor: 'pointer' }}>
                <Image src={logoUtn} w={32} h={32} fit="contain" style={{ flexShrink: 0 }} />
                {isOpen && (
                  <Box style={{ overflow: 'hidden' }}>
                    <Text fw={600} size="sm" lh={1.2} style={{ whiteSpace: 'nowrap' }}>
                      {ENV.APP_NAME}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      Panel de administración
                    </Text>
                  </Box>
                )}
              </Group>
            </NavLink>

            <Stack gap={2}>
              <NavItem to="/dashboard" label="Dashboard" icon={IconDashboard} isOpen={isOpen} />
              <NavItem to="/admins/me" label="Mi perfil" icon={IconUser} isOpen={isOpen} />
              <NavItem to="/admins" label="Administradores" icon={IconUsers} isOpen={isOpen} />
              <NavItem to="/faqs" label="FAQs" icon={IconQuestionMark} isOpen={isOpen} />
            </Stack>
          </Box>

          <Box>
            <Divider mb="sm" />
            {isOpen ? (
              <Group justify="space-between">
                <UnstyledButton onClick={() => void handleLogout()} disabled={logoutLoading}>
                  <Group gap="sm">
                    {logoutLoading
                      ? <Loader size={16} color="orange" />
                      : <IconLogout size={16} />}
                    <Text size="sm" c={logoutLoading ? 'dimmed' : undefined}>
                      {logoutLoading ? 'Cerrando...' : 'Cerrar sesión'}
                    </Text>
                  </Group>
                </UnstyledButton>
                <ThemeToggle />
              </Group>
            ) : (
              <Stack gap="xs" align="center">
                <Tooltip label="Cerrar sesión" position="right" withArrow>
                  <UnstyledButton onClick={() => void handleLogout()} disabled={logoutLoading}>
                    {logoutLoading
                      ? <Loader size={16} color="orange" />
                      : <IconLogout size={16} />}
                  </UnstyledButton>
                </Tooltip>
                <ThemeToggle />
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
    </>
  );
}