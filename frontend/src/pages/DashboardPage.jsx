import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cajaService } from "../services/caja.service";
import { useAuth } from "../hooks/useAuth";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

function fmtMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return money.format(n);
}

function fmtDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function sumByKey(rows, key) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((acc, r) => acc + Number(r?.[key] ?? 0), 0);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [flash, setFlash] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [estado, setEstado] = useState(null);
  const [cajaData, setCajaData] = useState(null);
  const [estadoMessage, setEstadoMessage] = useState(null);
  const [estadoAlertType, setEstadoAlertType] = useState(null);
  const [autoCloseNotice, setAutoCloseNotice] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  // Edición rápida de monto inicial (fondo de caja)
  const [isEditingMontoInicial, setIsEditingMontoInicial] = useState(false);
  const [nuevoMontoInicial, setNuevoMontoInicial] = useState("");
  const [isSavingMonto, setIsSavingMonto] = useState(false);

  const userId = user?.IdUsuario;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [estadoRes, resumenRes, movsRes] = await Promise.all([
          cajaService.getEstado(),
          cajaService.getResumen(),
          cajaService.getMovimientos(),
        ]);

        if (cancelled) return;

        setEstado(estadoRes?.estado || null);
        setCajaData(estadoRes?.data || null);
        setEstadoMessage(estadoRes?.message || null);
        setEstadoAlertType(estadoRes?.alertType || null);
        setAutoCloseNotice(estadoRes?.autoCloseNotice || null);
        setResumen(resumenRes?.data || null);
        setMovimientos(Array.isArray(movsRes?.data) ? movsRes.data : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Error cargando dashboard");
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const msg = location?.state?.flash;
    if (!msg) return;
    setFlash(String(msg));
    refreshDashboard().catch(() => {});
    navigate(location.pathname, { replace: true, state: {} });
  }, [location?.state, location.pathname, navigate]);

  async function refreshDashboard() {
    const [estadoRes, resumenRes, movsRes] = await Promise.all([
      cajaService.getEstado(),
      cajaService.getResumen(),
      cajaService.getMovimientos(),
    ]);
    setEstado(estadoRes?.estado || null);
    setCajaData(estadoRes?.data || null);
    setEstadoMessage(estadoRes?.message || null);
    setEstadoAlertType(estadoRes?.alertType || null);
    setAutoCloseNotice(estadoRes?.autoCloseNotice || null);
    setResumen(resumenRes?.data || null);
    setMovimientos(Array.isArray(movsRes?.data) ? movsRes.data : []);
  }

  async function handleGuardarMontoInicial() {
    const n = Number(nuevoMontoInicial);
    if (!Number.isFinite(n) || n < 0) return;
    setIsSavingMonto(true);
    try {
      await cajaService.actualizarMontoInicial({ montoInicial: n, idUsuario: userId });
      setIsEditingMontoInicial(false);
      await refreshDashboard();
    } catch (e) {
      alert(e?.message || "Error al actualizar fondo inicial");
    } finally {
      setIsSavingMonto(false);
    }
  }

  const ventasTotal = useMemo(() => sumByKey(resumen?.ventas_desglose, "total_ventas"), [resumen]);
  const gastosTotal = useMemo(() => sumByKey(resumen?.gastos_desglose, "total_gastos"), [resumen]);

  const ventasEfectivo = useMemo(() => {
    if (Number.isFinite(Number(resumen?.ventas_efectivo))) return Number(resumen.ventas_efectivo);
    const row = (resumen?.ventas_desglose || []).find((v) => v.metodo_pago === "Efectivo");
    return Number(row?.total_ventas ?? 0);
  }, [resumen]);

  const gastosEfectivo = useMemo(() => {
    if (Number.isFinite(Number(resumen?.gastos_efectivo))) return Number(resumen.gastos_efectivo);
    const row = (resumen?.gastos_desglose || []).find((g) => g.metodo_pago === "Efectivo");
    return Number(row?.total_gastos ?? 0);
  }, [resumen]);

  const efectivoEnCaja = useMemo(() => {
    if (cajaData?.MontoActual !== undefined && cajaData?.MontoActual !== null) {
      return Number(cajaData.MontoActual);
    }
    if (resumen?.efectivo_en_caja !== undefined && resumen?.efectivo_en_caja !== null) {
      return Number(resumen.efectivo_en_caja);
    }
    const mi = Number(cajaData?.MontoInicial ?? resumen?.monto_inicial ?? 0);
    return mi + ventasEfectivo - gastosEfectivo;
  }, [cajaData, resumen, ventasEfectivo, gastosEfectivo]);

  const ultimosMovimientos = useMemo(() => {
    const list = Array.isArray(movimientos) ? movimientos : [];
    return list.slice(-8).reverse();
  }, [movimientos]);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* NOTIFICACIONES Y ALERTAS */}
      {flash && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-xs" role="status">
          {flash}
        </div>
      )}

      {estadoAlertType === "OPEN_OTHER_DAY" && estadoMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-xs" role="status">
          <svg className="h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{estadoMessage}</span>
        </div>
      )}

      {autoCloseNotice?.message && (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800 shadow-xs" role="status">
          <svg className="h-4 w-4 shrink-0 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{autoCloseNotice.message}{autoCloseNotice?.horaCierre ? ` Último cierre automático: ${fmtDateTime(autoCloseNotice.horaCierre)}.` : ""}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-xs">
          {error}
        </div>
      )}

      {/* HEADER DE BIENVENIDA */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-2xl">
              ¡Hola, {user?.NombreCompleto || user?.Username || "Cerrajería JMG"}!
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Panel de control principal · Turno del día: <strong className="text-slate-700">{new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</strong>
          </p>
        </div>

        {/* ESTADO DE CAJA HEADER BADGE */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-extrabold text-emerald-800 shadow-2xs">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Caja Activa (Turno de Hoy)</span>
            {cajaData?.IdCaja ? <span className="opacity-70">#{cajaData.IdCaja}</span> : null}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 1. BOTONES GIGANTES Y PROMINENTES DE ACCIÓN RÁPIDA (HERO) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* BOTÓN GIGANTE 1: IR AL PUNTO DE VENTA (POS) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate("/pos")}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-md shadow-blue-600/20 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ventas de Mostrador
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Punto de Venta (POS)
              </h2>
              <p className="mt-1 text-sm font-medium text-blue-100 max-w-sm">
                Atiende clientes al instante: duplicados residenciales, llaves y carcasas automotrices y servicios.
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner backdrop-blur-md transition-transform group-hover:scale-110">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-3">
            <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">
              Acceso 1 Toque
            </span>
            <div className="flex items-center gap-1.5 text-sm font-black text-white">
              <span>Entrar al POS</span>
              <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
            </div>
          </div>
        </div>

        {/* BOTÓN GIGANTE 2: CONTROL DE CAJA Y CORTE */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate("/caja")}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 text-slate-800 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Caja Activa #{cajaData?.IdCaja || "-"}
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
                Control de Caja
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500 max-w-sm">
                Revisa el balance de efectivo, registra gastos menores del taller y realiza el corte de caja.
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-transform group-hover:scale-110">
              <svg className="h-8 w-8 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Efectivo en Caja</span>
              <div className="text-base font-black text-emerald-600 sm:text-lg">
                {fmtMoney(efectivoEnCaja)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-black text-blue-600 group-hover:text-blue-800">
              <span>Ver Caja y Corte</span>
              <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. KPIS DEL DÍA EN TARJETAS LIMPIAS                      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Efectivo en Caja */}
        <div className="flex flex-col justify-between rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Efectivo en Caja</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 sm:text-3xl">
              {fmtMoney(efectivoEnCaja)}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">Saldo actual en caja física</span>
          </div>
        </div>

        {/* Ventas del Día */}
        <div className="flex flex-col justify-between rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Ventas de Hoy</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100/80 text-blue-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-700 sm:text-3xl">
              {fmtMoney(ventasTotal)}
            </div>
            <span className="text-[11px] font-semibold text-blue-600">Total cobrado en ventas</span>
          </div>
        </div>

        {/* Gastos del Día */}
        <div className="flex flex-col justify-between rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800">Gastos de Hoy</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100/80 text-rose-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700 sm:text-3xl">
              {fmtMoney(gastosTotal)}
            </div>
            <span className="text-[11px] font-semibold text-rose-600">Salidas de caja chica</span>
          </div>
        </div>

        {/* Fondo Inicial Editable */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Fondo Inicial</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            {isEditingMontoInicial ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  className="w-24 rounded-lg border border-blue-500 bg-white px-2 py-1 text-sm font-extrabold text-slate-800 focus:outline-none"
                  value={nuevoMontoInicial}
                  onChange={(e) => setNuevoMontoInicial(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGuardarMontoInicial();
                    if (e.key === "Escape") setIsEditingMontoInicial(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleGuardarMontoInicial}
                  disabled={isSavingMonto}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  title="Guardar"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingMontoInicial(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                  title="Cancelar"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-slate-800 sm:text-3xl">
                  {fmtMoney(cajaData?.MontoInicial ?? resumen?.monto_inicial ?? 0)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNuevoMontoInicial(String(cajaData?.MontoInicial ?? resumen?.monto_inicial ?? 0));
                    setIsEditingMontoInicial(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  title="Modificar fondo inicial"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                  <span>Editar</span>
                </button>
              </div>
            )}
            <span className="text-[11px] font-semibold text-slate-400">Modificable en cualquier momento</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ÚLTIMOS MOVIMIENTOS DEL DÍA                           */}
      {/* ======================================================== */}
      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
            <h2 className="text-base font-extrabold text-slate-800">
              Últimos Movimientos de Hoy ({ultimosMovimientos.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/caja")}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer"
            >
              Ver historial completo
            </button>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">
              Cargando movimientos...
            </div>
          ) : ultimosMovimientos.length === 0 ? (
            <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                  <path d="M8 7h8M8 11h8M8 15h5" />
                </svg>
              </div>
              <p className="mt-2 text-xs font-semibold">No hay movimientos registrados hoy todavía.</p>
              <p className="text-[11px] text-slate-400">Las ventas del POS y los gastos aparecerán aquí en tiempo real.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {ultimosMovimientos.map((m) => {
                const isEntrada = m?.tipo === "ENTRADA";
                return (
                  <div
                    key={`${m?.tipo}-${m?.id}-${m?.fechaHora}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black ${
                          isEntrada
                            ? "bg-emerald-100/90 text-emerald-900 border border-emerald-200"
                            : "bg-rose-100/90 text-rose-900 border border-rose-200"
                        }`}
                      >
                        <span>{isEntrada ? "↓" : "↑"}</span>
                        <span>{isEntrada ? "VENTA" : "GASTO"}</span>
                      </span>

                      <div className="flex flex-col">
                        <strong className="text-xs font-bold text-slate-800">
                          {m?.concepto || (isEntrada ? "Venta en mostrador" : "Salida de caja")}
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          {fmtDateTime(m?.fechaHora)} · {m?.metodoPago || "Efectivo"} · {m?.usuario || "Turno"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-sm font-black ${isEntrada ? "text-emerald-700" : "text-rose-700"}`}>
                        {isEntrada ? "+" : "-"}{fmtMoney(m?.monto)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
