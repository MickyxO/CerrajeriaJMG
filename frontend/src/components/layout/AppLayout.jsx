import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

function BrandMarkLogo({ className = "" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-900/40 border border-white/20 p-2 shadow-inner backdrop-blur-md shrink-0 ${className}`}
    >
      <img
        src="/jmg-logo.svg"
        alt="Logo Cerrajería JMG"
        className="h-full w-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
        loading="eager"
        onError={(e) => {
          e.currentTarget.src = "/jmg-logo.jpg";
        }}
      />
    </div>
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

function IconBarChart(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20V8" />
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
  if (pathname.startsWith("/ventas/")) return "Detalle de Ticket";
  const map = {
    "/dashboard": "Dashboard",
    "/pos": "Punto de venta",
    "/caja": "Caja",
    "/ventas": "Historial de Tickets",
    "/items": "Catálogo & Stock",
    "/reportes": "Reportes",
    "/usuarios": "Usuarios",
  };
  return map[pathname] || "";
}

export default function AppLayout() {
  const { user, logout } = useAuth();

  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  const navGroups = useMemo(
    () => [
      {
        title: "Operaciones",
        items: [
          { to: "/dashboard", label: "Dashboard", Icon: IconHome },
          { to: "/pos", label: "POS", Icon: IconCart },
          { to: "/caja", label: "Caja", Icon: IconCash },
          { to: "/ventas", label: "Historial de Tickets", Icon: IconReceipt },
        ],
      },
      {
        title: "Administración",
        items: [
          { to: "/items", label: "Catálogo & Stock", Icon: IconBox },
          { to: "/reportes", label: "Reportes", Icon: IconBarChart },
          { to: "/usuarios", label: "Usuarios", Icon: IconUsers },
        ],
      },
    ],
    []
  );

  // Ítems del bottom nav — los 4 más usados + "Más" que abre el drawer
  const bottomNavItems = [
    { to: "/dashboard", label: "Inicio", Icon: IconHome },
    { to: "/pos", label: "POS", Icon: IconCart },
    { to: "/caja", label: "Caja", Icon: IconCash },
    { to: "/items", label: "Catálogo", Icon: IconBox },
  ];

  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const userLabel = getUserLabel(user);

  const navClassName = ({ isActive }) => {
    const base =
      "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200";
    return isActive
      ? `${base} border-white/40 bg-white text-[color:var(--jmg-navy)] shadow-soft`
      : `${base} border-transparent bg-white/12 text-blue-50 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/20`;
  };

  return (
    <div className="min-h-screen bg-transparent text-[color:var(--jmg-text)]">

      {/* Overlay del drawer — solo mobile */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/52 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* ══ Drawer lateral — solo mobile ══ */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col",
          "border-r border-blue-200/35",
          "bg-[linear-gradient(165deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.92)_100%)]",
          "p-4 shadow-soft backdrop-blur-xl",
          "transition-transform duration-300 lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-label="Menú"
      >
        {/* Logo en drawer */}
        <div className="mb-6 flex items-center gap-3 rounded-3xl border border-white/20 bg-white/10 p-3">
          <BrandMarkLogo className="h-11 w-11" />
          <div className="leading-tight">
            <strong className="block font-black text-base text-white tracking-tight">Cerrajería JMG</strong>
            <span className="text-[11px] font-semibold text-blue-200/80">Automotriz y residencial</span>
          </div>
        </div>

        {/* Navegación scrollable en drawer */}
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1.5">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-blue-200/70">
                {group.title}
              </span>
              {group.items.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={navClassName}
                  onClick={() => setDrawerOpen(false)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout en el drawer (mobile) */}
        <div className="mt-4 border-t border-white/15 pt-4">
          <p className="mb-2 px-1 text-xs text-blue-200/70 font-medium truncate">
            Sesión: <span className="text-white font-semibold">{userLabel}</span>
          </p>
          <button
            type="button"
            className="w-full rounded-2xl border border-white/20 bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ══ Layout principal ══ */}
      <div className="mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[280px_1fr]">

        {/* Sidebar desktop — oculto en mobile */}
        <aside
          className="sticky top-0 hidden h-screen flex-col border-r border-blue-200/35 bg-[linear-gradient(165deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.92)_100%)] p-4 backdrop-blur-xl lg:flex"
          aria-label="Menú"
        >
          <div className="mb-7 flex items-center gap-3 rounded-3xl border border-white/20 bg-white/12 p-3 shadow-soft">
            <BrandMarkLogo className="h-11 w-11" />
            <div className="leading-tight">
              <strong className="block font-black text-base text-white tracking-tight">Cerrajería JMG</strong>
              <span className="text-[11px] font-semibold text-blue-200/80">Automotriz y residencial</span>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-1.5">
                <span className="px-3 text-[10px] font-black uppercase tracking-wider text-blue-200/70">
                  {group.title}
                </span>
                {group.items.map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} className={navClassName}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Logout en sidebar desktop */}
          <div className="mt-4 border-t border-white/15 pt-4">
            <p className="mb-2 px-1 text-xs text-blue-200/70 font-medium truncate">
              Sesión: <span className="text-white font-semibold">{userLabel}</span>
            </p>
            <button
              type="button"
              className="w-full rounded-2xl border border-white/20 bg-white/10 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              onClick={logout}
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Columna de contenido */}
        <div className="flex min-h-screen min-w-0 flex-col">

          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-blue-200/35 bg-[linear-gradient(165deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.92)_100%)] px-3 py-2.5 backdrop-blur-xl sm:px-4 lg:px-6">
            <div className="flex items-center justify-between gap-2">

              {/* Izquierda: hamburguesa (solo mobile) + título */}
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/15 text-white shadow-sm hover:bg-white/25 transition-colors lg:hidden"
                  onClick={() => setDrawerOpen((v) => !v)}
                  aria-label="Abrir menú"
                  title="Menú"
                >
                  <IconMenu style={{ width: 16, height: 16 }} aria-hidden="true" />
                </button>
                <div className="truncate font-display text-base font-semibold text-white sm:text-lg">
                  {pageTitle}
                </div>
              </div>

              {/* Derecha (desktop/tablet ≥ sm): usuario + logout */}
              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/35 bg-blue-950/35 px-3 py-1.5 text-sm text-blue-50 shadow-sm">
                <span className="font-medium text-blue-50">
                  <strong className="font-semibold text-white">Usuario:</strong> {userLabel}
                </span>
                <button
                  type="button"
                  className="rounded-xl border border-[color:var(--jmg-navy)]/30 bg-white px-3 py-1.5 text-sm font-semibold text-[color:var(--jmg-navy)] hover:bg-blue-50"
                  onClick={logout}
                >
                  Cerrar sesión
                </button>
              </div>

              {/* Derecha (mobile < sm): ícono de usuario con popover de sesión */}
              <div className="sm:hidden relative">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/15 text-white shadow-sm hover:bg-white/25 transition-colors"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Menú de usuario"
                  aria-expanded={userMenuOpen}
                  title="Usuario"
                >
                  <IconUsers style={{ width: 16, height: 16 }} aria-hidden="true" />
                </button>

                {/* Popover */}
                {userMenuOpen && (
                  <>
                    {/* Overlay para cerrar al tocar fuera */}
                    <button
                      type="button"
                      className="fixed inset-0 z-40"
                      aria-label="Cerrar menú de usuario"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    {/* Card del popover */}
                    <div className="absolute right-0 top-11 z-50 min-w-[180px] rounded-2xl border border-white/20 bg-[rgba(7,27,74,0.97)] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                        Sesión activa
                      </p>
                      <p className="mb-3 truncate text-sm font-semibold text-white">
                        {userLabel}
                      </p>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-white/20 bg-white/10 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Contenido — padding-bottom extra en mobile para el bottom nav */}
          <main className="flex-1 p-3 pb-[5.5rem] sm:p-4 sm:pb-4 lg:p-6">
            <div key={location.pathname} className="motion-safe:animate-page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* ══ BOTTOM NAVIGATION BAR — solo mobile (lg:hidden) ══ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-blue-200/20 bg-[linear-gradient(165deg,rgba(7,27,74,0.99)_0%,rgba(20,60,160,0.99)_100%)] shadow-[0_-4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:hidden"
        aria-label="Navegación principal"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {bottomNavItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors duration-150 ${
                isActive ? "text-white" : "text-blue-300 hover:text-blue-100"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                    isActive ? "bg-white/20 shadow-inner" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Botón "Más" — abre el drawer con el resto de opciones */}
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold text-blue-300 hover:text-blue-100 transition-colors duration-150"
          aria-label="Más opciones"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl">
            <IconMenu style={{ width: 20, height: 20 }} aria-hidden="true" />
          </span>
          <span className="leading-none">Más</span>
        </button>
      </nav>
    </div>
  );
}
