import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import App from './App';
import { useAuthStore } from '@/store/authStore';

const theme = createTheme({
  fontFamily: 'Inter, sans-serif',
  primaryColor: 'orange',
  colors: {
    orange: [
      '#fff8e1', '#ffecb3', '#ffe082', '#ffd54f',
      '#ffca28', '#ffc107', '#f5a705', '#ff8f00',
      '#ff6f00', '#e65100',
    ],
  },
});

// Intentar recuperar sesión antes de montar React
// ProtectedRoute usará isBootstrapping para mostrar un loader mientras tanto
void useAuthStore.getState().bootstrap().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <ModalsProvider>
          <Notifications />
          <App />
        </ModalsProvider>
      </MantineProvider>
    </StrictMode>,
  );
});