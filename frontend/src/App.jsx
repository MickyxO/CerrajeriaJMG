import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PosPage from "./pages/pos/PosPage";
import ItemsPage from "./pages/items/ItemsPage";
import VentasPage from "./pages/ventas/VentasPage";
import VentaDetallePage from "./pages/ventas/VentaDetallePage";
import CajaPage from "./pages/caja/CajaPage";
import UsuariosPage from "./pages/usuarios/UsuariosPage";
import ReportesPage from "./pages/reportes/ReportesPage";
import NotFoundPage from "./pages/NotFoundPage";
import { CartProvider } from "./context/CartContext.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* App protegida: si no hay usuario => /login */}
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <CartProvider>
              <AppLayout />
            </CartProvider>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/ventas/:id" element={<VentaDetallePage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/catalogo" element={<Navigate to="/items" replace />} />
          <Route path="/categorias" element={<Navigate to="/items" replace />} />
          <Route path="/inventario" element={<Navigate to="/items" replace />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
