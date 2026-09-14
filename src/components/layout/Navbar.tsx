import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Stack, Text, UnstyledButton, Group, Box, Divider, Image,
  Loader, Tooltip, Collapse,
} from '@mantine/core';
import {
  IconUser, IconUsers, IconLogout, IconDashboard,
  IconTrophy, IconSettings, IconCategory,
  IconChevronRight, IconTool,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import logoUtn from '@/assets/logo-utn.png';
import { ENV } from '@/config/env';

const NAVBAR_EXPANDED = 220;
const NAVBAR_COLLAPSED = 60;

// ── DragHandle ────────────────────────────────────────────────────────────────
function DragHandle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const startX = useRef(0);
  const didDrag = useRef(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onPointerDown={e => { startX.current = e.clientX; didDrag.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (Math.abs(e.clientX - startX.current) > 8) didDrag.current = true; }}
      onPointerUp={e => {
        const delta = e.clientX - startX.current;
        if (!didDrag.current || Math.abs(delta) < 8) onToggle();
        else if (delta > 30 && !isOpen) onToggle();
        else if (delta < -30 && isOpen) onToggle();
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{ position: 'absolute', top: 0, right: 0, width: 14, height: '100%', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', zIndex: 10 }}
    >
      <Box style={{ width: 3, height: 36, borderRadius: 2, background: hovered ? 'var(--mantine-color-orange-4)' : 'var(--mantine-color-default-border)', transition: 'background 150ms ease' }} />
    </Box>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ to, label, icon: Icon, isOpen }: { to: string; label: string; icon: React.ElementType; isOpen: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === to || (
    to !== '/dashboard' &&
    to !== '/admins' &&
    location.pathname.startsWith(`${to}/`)
  );

  const button = (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      <UnstyledButton w="100%" px="sm" py={7} style={(theme) => ({
        borderRadius: theme.radius.sm,
        background: isActive ? 'var(--mantine-color-orange-light)' : 'transparent',
        color: isActive ? '#f5a705' : 'var(--mantine-color-text)',
      })}>
        <Group gap="sm" justify={isOpen ? 'flex-start' : 'center'} wrap="nowrap">
          <Icon size={15} style={{ flexShrink: 0 }} />
          {isOpen && <Text size="sm" style={{ whiteSpace: 'nowrap' }}>{label}</Text>}
        </Group>
      </UnstyledButton>
    </NavLink>
  );

  return !isOpen ? <Tooltip label={label} position="right" withArrow>{button}</Tooltip> : button;
}

// ── NavSection ────────────────────────────────────────────────────────────────
interface NavSectionProps {
  label: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggleNavbar: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function NavSection({ label, icon: Icon, isOpen, onToggleNavbar, children, defaultOpen = false }: NavSectionProps) {
  const [expanded, setExpanded] = useState(defaultOpen);

  const handleClick = () => {
    if (!isOpen) {
      onToggleNavbar();
      setExpanded(true);
    } else {
      setExpanded(v => !v);
    }
  };

  if (!isOpen) {
    return (
      <Tooltip label={label} position="right" withArrow>
        <UnstyledButton
          w="100%"
          px="sm"
          py={7}
          onClick={handleClick}
          style={(theme) => ({
            borderRadius: theme.radius.sm,
            color: 'var(--mantine-color-text)',
          })}
        >
          <Group gap="sm" justify="center" wrap="nowrap">
            <Icon size={15} style={{ flexShrink: 0 }} />
          </Group>
        </UnstyledButton>
      </Tooltip>
    );
  }

  return (
    <Box>
      <UnstyledButton
        w="100%"
        px="sm"
        py={7}
        onClick={handleClick}
        style={(theme) => ({
          borderRadius: theme.radius.sm,
          color: 'var(--mantine-color-dimmed)',
        })}
      >
        <Group gap="sm" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Icon size={15} style={{ flexShrink: 0 }} />
            <Text size="xs" fw={600} tt="uppercase" style={{ whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>{label}</Text>
          </Group>
          <IconChevronRight size={12} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }} />
        </Group>
      </UnstyledButton>
      <Collapse in={expanded} expanded={expanded}>
        <Box pl="xs">
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export function Navbar({ isOpen, onToggle, onClose, isMobile }: { isOpen: boolean; onToggle: () => void; onClose: () => void; isMobile: boolean }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try { await logout(); } finally { setLogoutLoading(false); navigate('/login'); }
  };

  const visualWidth = isOpen ? NAVBAR_EXPANDED : NAVBAR_COLLAPSED;

  return (
    <>
      {isMobile && isOpen && (
        <Box onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} />
      )}
      <Box style={{
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
      }}>
        <DragHandle isOpen={isOpen} onToggle={onToggle} />
        <Stack h="100%" justify="space-between" p="md" style={{ overflow: 'hidden' }}>
          <Box>
            <NavLink to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Group mb="md" gap="xs" justify={isOpen ? 'flex-start' : 'center'} wrap="nowrap" style={{ cursor: 'pointer' }}>
                <Image src={logoUtn} w={32} h={32} fit="contain" style={{ flexShrink: 0 }} />
                {isOpen && (
                  <Box style={{ overflow: 'hidden' }}>
                    <Text fw={600} size="sm" lh={1.2} style={{ whiteSpace: 'nowrap' }}>{ENV.APP_NAME}</Text>
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>Panel de administración</Text>
                  </Box>
                )}
              </Group>
            </NavLink>

            <Stack gap={2}>
              <NavItem to="/dashboard" label="Inicio" icon={IconDashboard} isOpen={isOpen} />
              <NavItem to="/raffles" label="Sorteos" icon={IconTrophy} isOpen={isOpen} />

              <NavSection
                label="Configuración"
                icon={IconSettings}
                isOpen={isOpen}
                onToggleNavbar={onToggle}
                defaultOpen
              >
                <Stack gap={2}>
                  <NavItem to="/admins/me" label="Mi Perfil" icon={IconUser} isOpen={isOpen} />
                  <NavItem to="/admins" label="Administradores" icon={IconUsers} isOpen={isOpen} />
                  <NavItem to="/system-config" label="Sistema" icon={IconTool} isOpen={isOpen} />
                </Stack>
              </NavSection>
            </Stack>
          </Box>

          <Box>
            <Divider mb="sm" />
            {isOpen ? (
              <Group justify="space-between">
                <UnstyledButton onClick={() => void handleLogout()} disabled={logoutLoading}>
                  <Group gap="sm">
                    {logoutLoading ? <Loader size={16} color="orange" /> : <IconLogout size={16} />}
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
                    {logoutLoading ? <Loader size={16} color="orange" /> : <IconLogout size={16} />}
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