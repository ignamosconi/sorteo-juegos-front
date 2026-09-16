import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MyProfilePage } from '@/pages/MyProfilePage';
import { AdminsPage } from '@/pages/AdminsPage';
import { FaqsPage } from '@/pages/FaqsPage';
import { RafflesPage } from '@/pages/RafflesPage';
import { RaffleDetailPage } from '@/pages/RaffleDetailPage';
import { SystemConfigPage } from '@/pages/SystemConfigPage';
import { DrawPage } from '@/pages/DrawPage';
import { PublicRafflePage } from '@/pages/PublicRafflePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/s/:publicSlug" element={<PublicRafflePage />} />

        {/* Private fullscreen (no AppShell) */}
        <Route path="/sortear/:drawSlug" element={
          <ProtectedRoute>
            <DrawPage />
          </ProtectedRoute>
        } />

        {/* Admin panel */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="admins/me" element={<MyProfilePage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="faqs" element={<FaqsPage />} />
          <Route path="raffles" element={<RafflesPage />} />
          <Route path="raffles/:id" element={<RaffleDetailPage />} />
          <Route path="system-config" element={<SystemConfigPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}