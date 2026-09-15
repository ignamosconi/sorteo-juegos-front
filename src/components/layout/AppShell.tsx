import { AppShell as MantineAppShell, Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useEffect, useState, useCallback } from 'react';
import { Navbar } from './Navbar';
import { systemConfigApi } from '@/api/systemConfigApi';
import { getImageUrl } from '@/utils/imageUrl';
import { ENV } from '@/config/env';
import type { SystemConfig } from '@/types/api.types';

const NAVBAR_EXPANDED = 220;
const NAVBAR_COLLAPSED = 60;

export function AppShell() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [opened, { close, open, toggle }] = useDisclosure(true);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  const applyAdminConfig = useCallback((cfg: SystemConfig) => {
    setSystemConfig(cfg);

    // Título de la pestaña admin
    const tabName = cfg.adminTabName?.trim() || `${ENV.APP_NAME} - Admin`;
    document.title = tabName;

    // Favicon panel admin
    if (cfg.adminFaviconPath) {
      const faviconUrl = getImageUrl(cfg.adminFaviconPath);
      if (faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      }
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await systemConfigApi.get();
      applyAdminConfig(cfg);
    } catch {
      // Si falla la carga se mantienen fallbacks por defecto
    }
  }, [applyAdminConfig]);

  useEffect(() => {
    void loadConfig();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SystemConfig>;
      if (customEvent.detail) {
        applyAdminConfig(customEvent.detail);
      } else {
        void loadConfig();
      }
    };

    window.addEventListener('system-config-updated', handleUpdate);
    return () => window.removeEventListener('system-config-updated', handleUpdate);
  }, [loadConfig, applyAdminConfig]);

  useEffect(() => {
    if (isMobile === undefined) return;
    if (isMobile) close();
    else open();
  }, [isMobile]);

  const layoutWidth = isMobile ? NAVBAR_COLLAPSED : (opened ? NAVBAR_EXPANDED : NAVBAR_COLLAPSED);

  return (
    <MantineAppShell
      navbar={{ width: layoutWidth, breakpoint: 1 }}
      padding="md"
    >
      <MantineAppShell.Navbar style={{ transition: 'width 200ms ease', overflow: 'visible' }}>
        <Navbar
          isOpen={opened}
          onToggle={toggle}
          onClose={close}
          isMobile={!!isMobile}
          systemConfig={systemConfig}
        />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main style={{ transition: 'padding 200ms ease' }}>
        <Box maw={1100} mx="auto">
          <Outlet />
        </Box>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}