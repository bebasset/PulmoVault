import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PatientsPage from './pages/patients/PatientsPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import NewPatientPage from './pages/patients/NewPatientPage';
import SessionsPage from './pages/sessions/SessionsPage';
import NewSessionPage from './pages/sessions/NewSessionPage';
import SessionDetailPage from './pages/sessions/SessionDetailPage';
import UsersPage from './pages/admin/UsersPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import SettingsPage from './pages/settings/SettingsPage';
import AppLayout from './components/layout/AppLayout';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { role } = useAuthStore();
  return role === 'ADMIN' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/new" element={<NewPatientPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/new" element={<NewSessionPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="admin/users"
            element={<RequireAdmin><UsersPage /></RequireAdmin>}
          />
          <Route
            path="admin/audit"
            element={<RequireAdmin><AuditLogsPage /></RequireAdmin>}
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
