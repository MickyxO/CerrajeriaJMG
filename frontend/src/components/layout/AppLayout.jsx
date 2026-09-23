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

  const navClassName = ({ isActive }) => {
    const base =
      "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200";
    return isActive
      ? `${base} border-white/40 bg-white text-[color:var(--jmg-navy)] shadow-soft`
      : `${base} border-transparent bg-white/12 text-blue-50 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/20`;
  };

  return (
    <div className="min-h-dvh bg-transparent text-[color:var(--jmg-text)]">
      {drawerOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/52 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        className={
          drawerOpen
            ? "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-blue-200/35 bg-[linear-gradient(165deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.92)_100%)] p-4 shadow-soft backdrop-blur-xl transition-transform duration-300 lg:hidden"
            : "fixed inset-y-0 left-0 z-50 w-[280px] -translate-x-full border-r border-blue-200/35 bg-[linear-gradient(165deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.92)_100%)] p-4 shadow-soft backdrop-blur-xl transition-transform duration-300 lg:hidden"
        }
        aria-label="Menú"
      >
        <div className="mb-7 flex items-center gap-3 rounded-3xl border border-white/20 bg-white/10 p-3">
          <BrandMarkLogo className="h-11 w-11" />
          <div className="leading-tight">
            <strong className="block font-black text-base text-white tracking-tight">Cerrajería JMG</strong>
            <span className="text-[11px] font-semibold text-blue-200/80">Automotriz y residencial</span>
          </div>
        </div>

        <nav className="flex flex-col gap-4">
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
      </aside>

      <div className="mx-auto grid min-h-dvh max-w-[1800px] lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-0 hidden h-dvh border-r border-blue-200/35 bg-[linear-gradient(165deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.92)_100%)] p-4 backdrop-blur-xl lg:block" aria-label="Menú">
          <div className="mb-7 flex items-center gap-3 rounded-3xl border border-white/20 bg-white/12 p-3 shadow-soft">
            <BrandMarkLogo className="h-11 w-11" />
            <div className="leading-tight">
              <strong className="block font-black text-base text-white tracking-tight">Cerrajería JMG</strong>
              <span className="text-[11px] font-semibold text-blue-200/80">Automotriz y residencial</span>
            </div>
          </div>

          <nav className="flex flex-col gap-4">
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
        </aside>

        <div className="flex min-h-dvh min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b border-blue-200/35 bg-[linear-gradient(165deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.92)_100%)] px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/40 bg-white/92 text-[color:var(--jmg-navy)] shadow-sm hover:brightness-110 lg:hidden"
                  onClick={() => setDrawerOpen((v) => !v)}
                  aria-label="Abrir menú"
                  title="Menú"
                >
                  <IconMenu style={{ width: 18, height: 18 }} aria-hidden="true" />
                </button>
                <div className="truncate font-display text-lg font-semibold text-white">{pageTitle}</div>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-white/35 bg-blue-950/35 px-3 py-1.5 text-xs text-blue-50 shadow-sm sm:text-sm">
                <span className="hidden sm:inline font-medium text-blue-50">
                  <strong className="font-semibold text-white">Usuario:</strong> {userLabel}
                </span>
                <button
                  type="button"
                  className="rounded-xl border border-[color:var(--jmg-navy)]/30 bg-white px-3 py-1.5 font-semibold text-[color:var(--jmg-navy)] hover:bg-blue-50"
                  onClick={logout}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-4 lg:p-6">
            <div key={location.pathname} className="motion-safe:animate-page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
