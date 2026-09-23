import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { reportesService } from "../../services/reportes.service";

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

function fmtPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.0%";
  return `${n.toFixed(1)}%`;
}

function fmtDate(value) {
  if (!value) return "-";
  // Si viene YYYY-MM-DD, parsear sin desfase horario
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

const RANGE_OPTIONS = [
  { key: "today", label: "Hoy", sub: "Día actual" },
  { key: "7d", label: "Última semana", sub: "7 días" },
  { key: "30d", label: "Último mes", sub: "30 días" },
  { key: "90d", label: "Últimos 3 meses", sub: "90 días" },
  { key: "365d", label: "Este año", sub: "12 meses" },
];

export default function ReportesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const itemId = (searchParams.get("itemId") ?? "").toString();
  const [range, setRange] = useState("7d");

  // Estados de datos
  const [resumenLoading, setResumenLoading] = useState(true);
  const [resumenError, setResumenError] = useState(null);
  const [resumenData, setResumenData] = useState(null);

  const [bestLoading, setBestLoading] = useState(true);
  const [bestError, setBestError] = useState(null);
  const [best, setBest] = useState([]);

  const [worstLoading, setWorstLoading] = useState(true);
  const [worstError, setWorstError] = useState(null);
  const [worst, setWorst] = useState([]);

  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState(null);
  const [itemReport, setItemReport] = useState(null);

  // Sincronizar rango con query param inicial
  useEffect(() => {
    const fromUrl = (searchParams.get("range") ?? "").toString();
    if (fromUrl && RANGE_OPTIONS.some((r) => r.key === fromUrl)) {
      setRange(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRange(next) {
    setRange(next);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("range", next);
      return p;
    });
  }

  function selectItem(nextItemId) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (!nextItemId) p.delete("itemId");
      else p.set("itemId", String(nextItemId));
      p.set("range", range);
      return p;
    });
  }

  // Cargar resumen financiero general
  useEffect(() => {
    let cancelled = false;
    async function loadResumen() {
      setResumenLoading(true);
      setResumenError(null);
      try {
        const res = await reportesService.getResumenGeneral({ range });
        if (cancelled) return;
        setResumenData(res || null);
      } catch (e) {
        if (cancelled) return;
        setResumenError(e?.message || "Error al cargar resumen financiero");
        setResumenData(null);
      } finally {
        if (cancelled) return;
        setResumenLoading(false);
      }
    }
    loadResumen();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Cargar mejores vendidos
  useEffect(() => {
    let cancelled = false;
    async function loadBest() {
      setBestLoading(true);
      setBestError(null);
      try {
        const res = await reportesService.getBestSellers({ range, limit: 10 });
        if (cancelled) return;
        setBest(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        if (cancelled) return;
        setBestError(e?.message || "Error al cargar mejores vendidos");
        setBest([]);
      } finally {
        if (cancelled) return;
        setBestLoading(false);
      }
    }
    loadBest();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Cargar peores vendidos
  useEffect(() => {
    let cancelled = false;
    async function loadWorst() {
      setWorstLoading(true);
      setWorstError(null);
      try {
        const res = await reportesService.getWorstSellers({ range, limit: 10, incluyeInactivos: false });
        if (cancelled) return;
        setWorst(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        if (cancelled) return;
        setWorstError(e?.message || "Error al cargar peores vendidos");
        setWorst([]);
      } finally {
        if (cancelled) return;
        setWorstLoading(false);
      }
    }
    loadWorst();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Cargar detalle de producto seleccionado
  useEffect(() => {
    let cancelled = false;
    async function loadItem() {
      if (!itemId) {
        setItemReport(null);
        setItemError(null);
        setItemLoading(false);
        return;
      }

      setItemLoading(true);
      setItemError(null);
      try {
        const res = await reportesService.getReporteItem(itemId, { range });
        if (cancelled) return;
        setItemReport(res || null);
      } catch (e) {
        if (cancelled) return;
        setItemError(e?.message || "Error al cargar reporte del item");
        setItemReport(null);
      } finally {
        if (cancelled) return;
        setItemLoading(false);
      }
    }

    loadItem();
    return () => {
      cancelled = true;
    };
  }, [itemId, range]);

  const kpis = resumenData?.resumen || {};
  const metodos = resumenData?.metodosPago || [];
  const tendencia = resumenData?.tendenciaDiaria || [];
  const vendedores = resumenData?.vendedores || [];

  const maxDiaVenta = useMemo(() => {
    if (!tendencia.length) return 1;
    return Math.max(...tendencia.map((d) => d.ventas), 1);
  }, [tendencia]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inteligencia y Reportes</h1>
              <p className="text-sm text-slate-500 font-medium">
                Análisis financiero, márgenes reales y rendimiento de productos para toma de decisiones
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all border border-slate-300 shadow-sm cursor-pointer"
          >
            <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Imprimir reporte</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/items")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all border border-slate-300 shadow-sm cursor-pointer"
          >
            <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8 12 3 3 8l9 5 9-5Z" />
              <path d="M3 8v8l9 5 9-5V8" />
              <path d="M12 13v8" />
            </svg>
            <span>Catálogo & Stock</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/ventas")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all border border-slate-300 shadow-sm cursor-pointer"
          >
            <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 7h8M8 11h8M8 15h5" />
            </svg>
            <span>Historial Tickets</span>
          </button>
        </div>
      </div>

      {/* Selector de Rango Temporal */}
      <div className="bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 px-3">Periodo:</span>
        {RANGE_OPTIONS.map((r) => {
          const active = range === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => updateRange(r.key)}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                active
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200 scale-[1.02]"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
              }`}
            >
              <span>{r.label}</span>
              <span className={`text-[11px] font-medium ${active ? "text-slate-300" : "text-slate-400"}`}>
                ({r.sub})
              </span>
            </button>
          );
        })}
      </div>

      {/* 1. KPIs FINANCIEROS CLAVE */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            <span>Resumen Financiero Ejecutivo</span>
          </h2>
          {resumenLoading && <span className="text-xs text-indigo-600 font-bold animate-pulse">Actualizando métricas...</span>}
        </div>

        {resumenError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold">
            {resumenError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tarjeta Ventas Totales */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Ventas Totales</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-slate-900 mt-2">
              {fmtMoney(kpis.totalVentas)}
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-slate-500 font-medium">
              <span>{kpis.totalTickets || 0} tickets emitidos</span>
              <span className="text-slate-400">Prom: {fmtMoney(kpis.ticketPromedio)}</span>
            </div>
          </div>

          {/* Tarjeta Gastos Operativos */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Gastos de Caja</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-rose-600 mt-2">
              {fmtMoney(kpis.totalGastos)}
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium">
              {kpis.totalMovimientosGastos || 0} salidas registradas en caja
            </div>
          </div>

          {/* Tarjeta Ganancia Neta Real */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Ganancia Neta Real</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
            </div>
            <div
              className={`text-2xl lg:text-3xl font-black mt-2 ${
                Number(kpis.gananciaNeta ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {fmtMoney(kpis.gananciaNeta)}
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-500">
              Ventas brutas menos gastos operativos
            </div>
          </div>

          {/* Tarjeta Margen Operativo */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Margen de Ganancia</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
            </div>
            <div
              className={`text-2xl lg:text-3xl font-black mt-2 ${
                Number(kpis.margenGanancia ?? 0) >= 20
                  ? "text-emerald-600"
                  : Number(kpis.margenGanancia ?? 0) >= 0
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {fmtPercent(kpis.margenGanancia)}
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium">
              Rentabilidad sobre ventas totales
            </div>
          </div>
        </div>
      </section>

      {/* 2. MÉTODOS DE PAGO Y RENDIMIENTO DE VENDEDORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desglose por Método de Pago */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Ventas por Método de Pago</h3>
            </div>
            <span className="text-xs font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
              {metodos.length} métodos
            </span>
          </div>

          {metodos.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
              Sin registros en este periodo.
            </div>
          ) : (
            <div className="space-y-3">
              {metodos.map((m) => {
                const pct = Number(m.porcentaje || 0);
                return (
                  <div key={m.metodo} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{m.metodo}</span>
                        <span className="text-xs text-slate-400 font-semibold">({m.tickets} tickets)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900">{fmtMoney(m.total)}</span>
                        <span className="text-xs text-slate-500 ml-2 font-bold">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Rendimiento por Vendedor */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Rendimiento por Vendedor</h3>
            </div>
            <span className="text-xs font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
              {vendedores.length} vendedores
            </span>
          </div>

          {vendedores.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
              Sin actividad de vendedores en este periodo.
            </div>
          ) : (
            <div className="space-y-3">
              {vendedores.map((v) => {
                const pct = Number(v.porcentaje || 0);
                return (
                  <div key={v.idUsuario ?? v.nombre} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{v.nombre}</span>
                        <span className="text-xs text-slate-400 font-semibold">({v.tickets} ventas)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900">{fmtMoney(v.total)}</span>
                        <span className="text-xs text-slate-500 ml-2 font-bold">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 3. TENDENCIA DIARIA DE VENTAS Y GASTOS */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Evolución Diaria (Ventas vs Gastos)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {tendencia.length} días con movimientos
          </span>
        </div>

        {tendencia.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
            No se registraron ventas ni gastos en el rango seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-right">Ventas</th>
                  <th className="py-3 px-4 text-right">Gastos</th>
                  <th className="py-3 px-4 text-right">Ganancia Neta</th>
                  <th className="py-3 px-4 text-right">Tickets</th>
                  <th className="py-3 px-4 w-1/4">Volumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tendencia.map((d) => {
                  const ventaPct = (d.ventas / maxDiaVenta) * 100;
                  return (
                    <tr key={d.fecha} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{fmtDate(d.fecha)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{fmtMoney(d.ventas)}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {d.gastos > 0 ? fmtMoney(d.gastos) : "-"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black ${
                          d.ganancia >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {fmtMoney(d.ganancia)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-500">{d.tickets}</td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(4, ventaPct))}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. PRODUCTOS MÁS Y MENOS VENDIDOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Más Vendidos */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Top Productos Más Vendidos</h3>
                <p className="text-xs text-slate-400 font-medium">Mayor volumen y facturación</p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Top {best.length}
            </span>
          </div>

          {bestError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-200">
              {bestError}
            </div>
          )}

          {bestLoading ? (
            <div className="p-8 text-center text-sm text-slate-400 font-medium">Cargando productos...</div>
          ) : best.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
              Sin ventas registradas en el periodo.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3 text-right">Unidades</th>
                    <th className="py-2.5 px-3 text-right">Ingresos</th>
                    <th className="py-2.5 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {best.map((r, idx) => {
                    const isSelected = String(r.IdItem) === String(itemId);
                    return (
                      <tr
                        key={r.IdItem}
                        className={`transition-colors ${
                          isSelected ? "bg-indigo-50/75 font-semibold" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-400 text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[180px]">
                          {r.Nombre || `#${r.IdItem}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{r.Unidades}</td>
                        <td className="py-2.5 px-3 text-right font-black text-indigo-700">{fmtMoney(r.Ingresos)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => selectItem(r.IdItem)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Menos Vendidos */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Productos con Menos Movimiento</h3>
                <p className="text-xs text-slate-400 font-medium">Bajo movimiento o stock estancado</p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
              Bottom {worst.length}
            </span>
          </div>

          {worstError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-200">
              {worstError}
            </div>
          )}

          {worstLoading ? (
            <div className="p-8 text-center text-sm text-slate-400 font-medium">Cargando productos...</div>
          ) : worst.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
              Sin datos para este periodo.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3 text-right">Unidades</th>
                    <th className="py-2.5 px-3 text-right">Ingresos</th>
                    <th className="py-2.5 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {worst.map((r, idx) => {
                    const isSelected = String(r.IdItem) === String(itemId);
                    return (
                      <tr
                        key={r.IdItem}
                        className={`transition-colors ${
                          isSelected ? "bg-indigo-50/75 font-semibold" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-400 text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[180px]">
                          {r.Nombre || `#${r.IdItem}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-600">{r.Unidades}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-600">{fmtMoney(r.Ingresos)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => selectItem(r.IdItem)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* 5. DRILL-DOWN / DETALLE POR PRODUCTO */}
      {itemId && (
        <section className="bg-white p-6 rounded-3xl border-2 border-indigo-200 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Detalle de Producto: {itemReport?.item?.Nombre || `Item #${itemId}`}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Comportamiento individual durante el periodo seleccionado
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => selectItem("")}
              className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              <span>Cerrar detalle</span>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {itemLoading ? (
            <div className="p-8 text-center text-sm text-slate-400 font-medium">Cargando reporte de producto...</div>
          ) : itemError ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-semibold border border-red-200">
              {itemError}
            </div>
          ) : itemReport ? (
            <div className="space-y-6">
              {/* Tarjetas KPI del Item */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-xs font-black text-slate-400 uppercase">Unidades Vendidas</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {itemReport.resumen?.Unidades ?? 0}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-xs font-black text-slate-400 uppercase">Ingresos Generados</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {fmtMoney(itemReport.resumen?.Ingresos)}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-xs font-black text-slate-400 uppercase">Tickets Presentes</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {itemReport.resumen?.Tickets ?? 0}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-xs font-black text-slate-400 uppercase">Precio Prom. Venta</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {fmtMoney(itemReport.resumen?.PrecioPromedio)}
                  </div>
                </div>
              </div>

              {/* Historial Diario del Item */}
              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-800">Historial Diario de este Producto</h4>
                {(itemReport.porDia || []).length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    Sin ventas de este producto en el rango actual.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4">Fecha</th>
                          <th className="py-2.5 px-4 text-right">Unidades</th>
                          <th className="py-2.5 px-4 text-right">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemReport.porDia.map((d) => (
                          <tr key={String(d.Fecha)} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-800">{fmtDate(d.Fecha)}</td>
                            <td className="py-2.5 px-4 text-right font-black text-slate-900">{d.Unidades}</td>
                            <td className="py-2.5 px-4 text-right font-black text-indigo-700">
                              {fmtMoney(d.Ingresos)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
