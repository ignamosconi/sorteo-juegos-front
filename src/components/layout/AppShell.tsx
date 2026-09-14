import { AppShell as MantineAppShell, Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useEffect } from 'react';
import { Navbar } from './Navbar';

const NAVBAR_EXPANDED = 220;
const NAVBAR_COLLAPSED = 60;

export function AppShell() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [opened, { close, open, toggle }] = useDisclosure(true);

  useEffect(() => {
    if (isMobile === undefined) return;
    if (isMobile) close();
    else open();
  }, [isMobile]);

  // En mobile el layout nunca cambia de ancho — el navbar abierto va por encima
  const layoutWidth = isMobile ? NAVBAR_COLLAPSED : (opened ? NAVBAR_EXPANDED : NAVBAR_COLLAPSED);

  return (
    <MantineAppShell
      navbar={{ width: layoutWidth, breakpoint: 1 }}
      padding="md"
    >
      <MantineAppShell.Navbar style={{ transition: 'width 200ms ease', overflow: 'visible' }}>
        <Navbar isOpen={opened} onToggle={toggle} onClose={close} isMobile={!!isMobile} />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main style={{ transition: 'padding 200ms ease' }}>
        <Box maw={1100} mx="auto">
          <Outlet />
        </Box>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}