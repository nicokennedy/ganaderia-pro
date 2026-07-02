import { useState, useEffect } from "react";
import Onboarding from "./pages/Onboarding";
import CurrentUser from './pages/CurrentUser';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import { Toaster as SonnerToaster } from 'sonner';

// Pages
import Dashboard from './pages/Dashboard';
import Ganado from './pages/Ganado';
import Potreros from './pages/Potreros';
import Finanzas from './pages/Finanzas';
import Calendario from './pages/Calendario';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Perfil from './pages/Perfil';
import Eventos from './pages/Eventos';
import RegistroLeche from './pages/RegistroLeche.jsx';
import InventarioIA from './pages/InventarioIA.jsx';
import InventarioMedicinas from './pages/InventarioMedicinas.jsx';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyOtp from './pages/VerifyOtp';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminFincas from './pages/AdminFincas';
import AdminRoute from '@/components/AdminRoute';
// import AdminTest from './pages/AdminTest';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, authChecked, user, currentFinca, membership } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!authChecked || !user) return;

    setNeedsOnboarding(!currentFinca || !membership);
  }, [authChecked, user, currentFinca, membership]);

  if (isLoadingPublicSettings || isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
            <span className="text-2xl">🐄</span>
          </div>
          <div className="w-8 h-8 border-3 border-secondary border-t-primary rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Cargando GanaderíaPro...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      window.location.href = "/login";
      return null;
    }
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (needsOnboarding === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Preparando tu finca...</p>
      </div>
    );
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ganado" element={<Ganado />} />
        <Route path="/potreros" element={<Potreros />} />
        <Route path="/finanzas" element={<Finanzas />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/eventos/nuevo" element={<Eventos />} />
        <Route path="/registro-leche" element={<RegistroLeche />} />
        <Route path="/inventario-ia" element={<InventarioIA />} />
        <Route path="/inventario-medicinas" element={<InventarioMedicinas />} />
        <Route
  path="/admin"
  element={
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  }
/>

<Route
  path="/admin/users"
  element={
    <AdminRoute>
      <AdminUsers />
    </AdminRoute>
  }
/>

<Route
  path="/admin/fincas"
  element={
    <AdminRoute>
      <AdminFincas />
    </AdminRoute>
  }
/>

      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/current-user" element={<CurrentUser />} />


          <Route
            path="/*"
            element={
              <AuthProvider>
                <AuthenticatedApp />
              </AuthProvider>
            }
          />
        </Routes>
      </Router>

      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App;
