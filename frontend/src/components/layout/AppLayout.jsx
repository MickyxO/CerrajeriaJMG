import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

import "./AppLayout.css";

function BrandMarkLogo() {
  return (
    <img
      src="/jmg-logo.png"
      alt="Logo Cerrajería JMG"
      loading="eager"
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset.fallbackApplied) {
          img.dataset.fallbackApplied = "1";
          img.src = "/jmg-logo.jpg";
          return;
        }
        img.style.display = "none";
      }}
    />
  );
}

function IconMenu(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconCart(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 6h15l-2 9H7L6 6Z" />
      <path d="M6 6 5 3H2" />
      <path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      <path d="M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}

function IconBox(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function IconLayers(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </svg>
  );
}

function IconTag(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.6 13.6 13.4 20.8a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <path d="M7.5 7.5h.01" />
    </svg>
  );
}

function IconReceipt(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 2h12v20l-2-1-2 1-2-1-2 1-2-1-2 1V2Z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </svg>
  );
}

function IconCash(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 7h16v10H4V7Z" />
      <path d="M7 7V5h10v2" />
      <path d="M12 10v4" />
      <path d="M10.5 12h3" />
    </svg>
  );
}

function IconClipboard(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 2h6v3H9V2Z" />
      <path d="M7 4H6a2 2 0 0 0-2 2v16h16V6a2 2 0 0 0-2-2h-1" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
    </svg>
  );
}

function IconUsers(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M6 21a6 6 0 0 1 12 0" />
      <path d="M18 8a3 3 0 1 1 3 3" />
      <path d="M21 21a5 5 0 0 0-3-4" />
    </svg>
  );
}

function getUserLabel(user) {
  return user?.NombreCompleto || user?.Username || user?.nombre_completo || user?.username || "-";
}

function getPageTitle(pathname) {
  if (pathname.startsWith("/ventas/")) return "Detalle de venta";
  const map = {
    "/dashboard": "Dashboard",
    "/pos": "Punto de venta",
    "/items": "Items",
    "/combos": "Combos",
    "/categorias": "Categorías",
    "/ventas": "Ventas",
    "/caja": "Caja",
    "/inventario": "Inventario",
    "/usuarios": "Usuarios",
  };
  return map[pathname] || "";
}

export default function AppLayout() {
  const { user, logout } = useAuth();

  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  const navItems = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard", Icon: IconHome },
      { to: "/pos", label: "POS", Icon: IconCart },
      { to: "/caja", label: "Caja", Icon: IconCash },
      { to: "/items", label: "Items", Icon: IconBox },
      { to: "/combos", label: "Combos", Icon: IconLayers },
      { to: "/categorias", label: "Categorías", Icon: IconTag },
      { to: "/ventas", label: "Ventas", Icon: IconReceipt },
      { to: "/inventario", label: "Inventario", Icon: IconClipboard },
      { to: "/usuarios", label: "Usuarios", Icon: IconUsers },
    ],
    []
  );

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const userLabel = getUserLabel(user);

  return (
    <div className="appShell">
      {drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      <aside className={drawerOpen ? "drawer drawerOpen" : "drawer"} aria-label="Menú">
        <div className="brand" style={{ marginBottom: 12 }}>
          <div className="brandMark" aria-hidden="true">
            <BrandMarkLogo />
          </div>
          <div className="brandText">
            <strong>Cerrajería JMG</strong>
            <span>Automotriz y Residencial</span>
          </div>
        </div>
        <nav className="nav">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon className="navIcon" aria-hidden="true" />
              <span className="navLabel">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="layoutGrid">
        <aside className="sidebar" aria-label="Menú">
          <div className="brand">
            <div className="brandMark" aria-hidden="true">
              <BrandMarkLogo />
            </div>
            <div className="brandText">
              <strong>Cerrajería JMG</strong>
              <span>Automotriz y Residencial</span>
            </div>
          </div>
          <nav className="nav">
            {navItems.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")}>
                <Icon className="navIcon" aria-hidden="true" />
                <span className="navLabel">{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="content">
          <header className="topbar">
            <div className="topbarLeft">
              <button
                type="button"
                className="iconButton menuButton"
                onClick={() => setDrawerOpen((v) => !v)}
                aria-label="Abrir menú"
                title="Menú"
              >
                <IconMenu style={{ width: 20, height: 20 }} aria-hidden="true" />
              </button>
              <div className="pageTitle">{pageTitle}</div>
            </div>

            <div className="userBox">
              <span>
                <strong style={{ color: "var(--jmg-navy)" }}>Usuario:</strong> {userLabel}
              </span>
              <button type="button" className="logoutButton" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </header>

          <main className="main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
