import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cajaService } from "../../services/caja.service";
import { ventasService } from "../../services/ventas.service";
import { useAuth } from "../../hooks/useAuth";

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

export default function CajaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.IdUsuario;

  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;

  const [fechasDisponibles, setFechasDisponibles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [estado, setEstado] = useState(null);
  const [cajaData, setCajaData] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  // Modificar Fondo Inicial (Monto Inicial)
  const [isEditingMontoInicial, setIsEditingMontoInicial] = useState(false);
  const [montoInicialEdit, setMontoInicialEdit] = useState("");
  const [isUpdatingMontoInicial, setIsUpdatingMontoInicial] = useState(false);
  const [montoInicialEditError, setMontoInicialEditError] = useState(null);
  const [montoInicialEditInfo, setMontoInicialEditInfo] = useState(null);

  // Cierre de Caja
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [montoFinalFisico, setMontoFinalFisico] = useState("");
  const [cerrarError, setCerrarError] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Filtro de Movimientos: TODOS | ENTRADA | SALIDA
  const [filtro, setFiltro] = useState("TODOS");

  // Modal de Préstamo / Devolución de Cambio
  const [showPrestamoModal, setShowPrestamoModal] = useState(false);
  const [prestamoTipo, setPrestamoTipo] = useState("ENTRADA"); // 'ENTRADA' | 'SALIDA'
  const [prestamoMonto, setPrestamoMonto] = useState("");
  const [prestamoTrabajador, setPrestamoTrabajador] = useState("");
  const [prestamoNota, setPrestamoNota] = useState("");
  const [isSavingPrestamo, setIsSavingPrestamo] = useState(false);
  const [prestamoError, setPrestamoError] = useState("");

  // Modales de Acciones
  const [ventaAccion, setVentaAccion] = useState(null); // { id }
  const [gastoAccion, setGastoAccion] = useState(null); // { id, monto, metodoPago, concepto }
  const [motivoAccion, setMotivoAccion] = useState("");
  const [editGasto, setEditGasto] = useState(null); // { id, montoStr, metodoPago, concepto }
  const [accionError, setAccionError] = useState(null);
  const [isAccionando, setIsAccionando] = useState(false);

  const didMountRef = useRef(false);

  async function refresh(nextDate = selectedDate) {
    const [estadoRes, resumenRes, movsRes] = await Promise.all([
      cajaService.getEstado({ fecha: nextDate }),
      cajaService.getResumen({ fecha: nextDate }),
      cajaService.getMovimientos({ fecha: nextDate }),
    ]);
    setEstado(estadoRes?.estado || null);
    setCajaData(estadoRes?.data || null);
    setResumen(resumenRes?.data || null);
    setMovimientos(Array.isArray(movsRes?.data) ? movsRes.data : []);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const fechasRes = await cajaService.getFechas({ limit: 60 });
        if (!cancelled) {
          setFechasDisponibles(Array.isArray(fechasRes?.data) ? fechasRes.data : []);
        }
        await refresh(selectedDate);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Error cargando caja");
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
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    let cancelled = false;
    async function loadByDate() {
      setIsLoading(true);
      setError(null);
      try {
        await refresh(selectedDate);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Error cargando caja");
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    }
    loadByDate();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  async function handleActualizarMontoInicial() {
    setMontoInicialEditError(null);
    setMontoInicialEditInfo(null);

    if (!userId) {
      setMontoInicialEditError("No se encontró el usuario. Inicia sesión nuevamente.");
      return;
    }

    const n = Number(montoInicialEdit);
    if (!Number.isFinite(n) || n < 0) {
      setMontoInicialEditError("Ingresa un monto inicial válido.");
      return;
    }

    setIsUpdatingMontoInicial(true);
    try {
      const res = await cajaService.actualizarMontoInicial({ montoInicial: n, idUsuario: userId });
      const diff = Number(res?.data?.diferencia_aplicada ?? 0);
      setIsEditingMontoInicial(false);
      await refresh();
      if (Number.isFinite(diff) && diff !== 0) {
        setMontoInicialEditInfo(`Fondo actualizado. Ajuste a caja: ${fmtMoney(diff)}.`);
      }
    } catch (e) {
      setMontoInicialEditError(e?.message || "Error al actualizar fondo inicial.");
    } finally {
      setIsUpdatingMontoInicial(false);
    }
  }

  function openCerrarModal() {
    setCerrarError(null);
    const suggested = efectivoEnCaja;
    if (suggested !== undefined && suggested !== null && suggested !== "") {
      const n = Number(suggested);
      if (Number.isFinite(n)) setMontoFinalFisico(String(n));
    }
    setShowCerrarModal(true);
  }

  async function handleCerrarCajaDefinitivo() {
    setCerrarError(null);
    if (!userId) {
      setCerrarError("No se encontró el usuario. Inicia sesión nuevamente.");
      return;
    }
    if (estado !== "ABIERTA") {
      setCerrarError("No hay caja abierta para cerrar.");
      return;
    }

    const n = Number(montoFinalFisico);
    if (!Number.isFinite(n) || n < 0) {
      setCerrarError("Ingresa el monto final físico en efectivo.");
      return;
    }

    setIsClosing(true);
    try {
      await cajaService.cerrarCaja({ montoFinalFisico: n, idUsuario: userId });
      await refresh();
      setShowCerrarModal(false);
      setMontoFinalFisico("");
    } catch (e) {
      setCerrarError(e?.message || "No se pudo cerrar la caja.");
    } finally {
      setIsClosing(false);
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

  const gananciaNeta = useMemo(() => {
    if (resumen?.ganancia_neta !== undefined && resumen?.ganancia_neta !== null) {
      return Number(resumen.ganancia_neta);
    }
    return ventasTotal - gastosTotal;
  }, [resumen, ventasTotal, gastosTotal]);

  const movimientosFiltrados = useMemo(() => {
    const list = Array.isArray(movimientos) ? movimientos : [];
    if (filtro === "ENTRADA") return list.filter((m) => m?.tipo === "ENTRADA");
    if (filtro === "SALIDA") return list.filter((m) => m?.tipo === "SALIDA");
    return list;
  }, [movimientos, filtro]);

  const canMutate = isToday && estado === "ABIERTA";

  async function doAnularVenta() {
    if (!ventaAccion?.id) return;
    if (!userId) {
      setAccionError("No se encontró el usuario.");
      return;
    }
    setIsAccionando(true);
    setAccionError(null);
    try {
      await ventasService.anularVenta(ventaAccion.id, { idUsuario: userId, motivo: motivoAccion.trim() || undefined });
      await refresh();
      setVentaAccion(null);
      setMotivoAccion("");
    } catch (e) {
      setAccionError(e?.message || "No se pudo anular la venta.");
    } finally {
      setIsAccionando(false);
    }
  }

  async function doGuardarGasto() {
    if (!editGasto?.id) return;
    if (!userId) {
      setAccionError("No se encontró el usuario.");
      return;
    }
    const n = Number(editGasto.montoStr);
    if (!Number.isFinite(n) || n <= 0) {
      setAccionError("Monto inválido.");
      return;
    }
    if (!editGasto.concepto || !editGasto.concepto.trim()) {
      setAccionError("El concepto es requerido.");
      return;
    }

    setIsAccionando(true);
    setAccionError(null);
    try {
      await cajaService.actualizarGasto(editGasto.id, {
        Monto: n,
        Concepto: editGasto.concepto,
        MetodoPago: editGasto.metodoPago,
        IdUsuario: userId,
      });
      await refresh();
      setEditGasto(null);
    } catch (e) {
      setAccionError(e?.message || "No se pudo actualizar el gasto.");
    } finally {
      setIsAccionando(false);
    }
  }

  async function doAnularGasto() {
    if (!gastoAccion?.id) return;
    if (!userId) {
      setAccionError("No se encontró el usuario.");
      return;
    }
    setIsAccionando(true);
    setAccionError(null);
    try {
      await cajaService.anularGasto(gastoAccion.id, { IdUsuario: userId, Motivo: motivoAccion.trim() || undefined });
      await refresh();
      setGastoAccion(null);
      setMotivoAccion("");
    } catch (e) {
      setAccionError(e?.message || "No se pudo anular el gasto.");
    } finally {
      setIsAccionando(false);
    }
  }

  async function handleGuardarPrestamo(e) {
    e?.preventDefault?.();
    setPrestamoError("");

    const montoNum = parseFloat(prestamoMonto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setPrestamoError("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    if (!prestamoTrabajador.trim()) {
      setPrestamoError("Por favor indica quién prestó o a quién se devuelve el cambio.");
      return;
    }

    setIsSavingPrestamo(true);
    try {
      await cajaService.registrarPrestamoCambio({
        Monto: montoNum,
        Tipo: prestamoTipo,
        Trabajador: prestamoTrabajador.trim(),
        Nota: prestamoNota.trim(),
        IdUsuario: userId ?? 1,
      });

      setShowPrestamoModal(false);
      setPrestamoMonto("");
      setPrestamoNota("");
      await refresh();
    } catch (err) {
      setPrestamoError(err?.message || "Error al registrar el movimiento.");
    } finally {
      setIsSavingPrestamo(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* 1. BARRA SUPERIOR: TÍTULO, ESTADO Y NAVEGACIÓN RÁPIDA */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-700 shadow-xs">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-800 tracking-tight sm:text-2xl">
                Control de Caja y Arqueo
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                  estado === "ABIERTA"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    estado === "ABIERTA" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                {estado === "ABIERTA" ? `Abierta #${cajaData?.IdCaja || ""}` : "Cerrada"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Consulta de efectivo en mostrador, desglose por método de pago y corte del turno.
            </p>
          </div>
        </div>

        {/* ACCIONES SUPERIORES */}
        <div className="flex flex-wrap items-center gap-2">
          {estado === "ABIERTA" && isToday && (
            <button
              type="button"
              onClick={() => {
                setPrestamoTipo("ENTRADA");
                setPrestamoMonto("");
                setPrestamoTrabajador(user?.NombreCompleto || user?.Username || "");
                setPrestamoNota("");
                setPrestamoError("");
                setShowPrestamoModal(true);
              }}
              className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/90 px-3.5 py-2.5 text-xs font-black text-indigo-700 hover:bg-indigo-100 active:scale-95 cursor-pointer shadow-xs"
              title="Registrar préstamo o devolución de cambio"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
              </svg>
              <span>Préstamo / Cambio</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-sm shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>Ir al POS</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => refresh(selectedDate)}
            className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 active:scale-95 cursor-pointer"
            title="Refrescar datos"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. SELECTOR DE FECHA TÁCTIL */}
      <section className="flex flex-col gap-2.5 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-700">Fecha consultada:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-none"
            />
            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="rounded-xl bg-blue-50 border border-blue-200 px-2.5 py-1.5 text-xs font-extrabold text-blue-700 hover:bg-blue-100 cursor-pointer"
              >
                Volver a Hoy
              </button>
            )}
          </div>

          {/* CHIPS DE FECHAS RECIENTES */}
          {Array.isArray(fechasDisponibles) && fechasDisponibles.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[11px] font-bold text-slate-400">Recientes:</span>
              {fechasDisponibles.slice(0, 6).map((f) => {
                const d = String(f).slice(0, 10);
                const active = d === selectedDate;
                return (
                  <button
                    key={`fecha-${d}`}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {d === todayStr ? "Hoy" : d}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* MENSAJES DE ERROR */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 shadow-xs">
          {error}
        </div>
      )}
      {montoInicialEditInfo && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 shadow-xs">
          <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{montoInicialEditInfo}</span>
        </div>
      )}

      {/* 3. HERO ARQUEO DE CAJA (KPIs GRANDES) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* TARJETA 1: EFECTIVO FÍSICO EN CAJA (HERO) */}
        <div className="flex flex-col justify-between rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-6 shadow-xs lg:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-900">
                <svg className="h-3.5 w-3.5 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
                <span>Saldo Físico en Mostrador</span>
              </span>
              <div className="mt-3 text-3xl font-black text-emerald-800 sm:text-4xl">
                {fmtMoney(efectivoEnCaja)}
              </div>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Efectivo real disponible para cambio y operaciones del taller.
              </p>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 pt-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Apertura: <strong>{fmtDateTime(cajaData?.HoraApertura ?? cajaData?.FechaApertura)}</strong></span>
            </div>

            {/* BOTÓN REALIZAR CORTE DE CAJA */}
            {estado === "ABIERTA" && isToday && (
              <button
                type="button"
                onClick={openCerrarModal}
                className="flex items-center gap-1.5 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 shadow-2xs hover:bg-rose-100 active:scale-95 cursor-pointer"
              >
                <svg className="h-3.5 w-3.5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 9h6v6H9z" />
                </svg>
                <span>Realizar Corte de Caja</span>
              </button>
            )}
          </div>
        </div>

        {/* TARJETA 2: FONDO INICIAL Y BALANCE */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs lg:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700">
                <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
                <span>Fondo Inicial (Base de Cambio)</span>
              </span>

              {isEditingMontoInicial ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-700">$</span>
                  <input
                    type="number"
                    className="w-32 rounded-xl border border-blue-500 bg-white px-3 py-1.5 text-lg font-black text-slate-800 focus:outline-none"
                    value={montoInicialEdit}
                    onChange={(e) => setMontoInicialEdit(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleActualizarMontoInicial();
                      if (e.key === "Escape") setIsEditingMontoInicial(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleActualizarMontoInicial}
                    disabled={isUpdatingMontoInicial}
                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>Guardar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMontoInicial(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex items-baseline gap-3">
                  <div className="text-3xl font-black text-slate-800 sm:text-4xl">
                    {fmtMoney(cajaData?.MontoInicial ?? resumen?.monto_inicial ?? 0)}
                  </div>
                  {isToday && estado === "ABIERTA" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMontoInicialEdit(String(cajaData?.MontoInicial ?? resumen?.monto_inicial ?? 0));
                        setIsEditingMontoInicial(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                      <span>Modificar Fondo</span>
                    </button>
                  )}
                </div>
              )}

              <p className="mt-1 text-xs text-slate-400 font-medium">
                Dinero con el que arrancó el mostrador. Modificable en cualquier momento.
              </p>
              {montoInicialEditError && (
                <div className="mt-1 text-xs font-bold text-rose-600">{montoInicialEditError}</div>
              )}
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500 font-medium">
              Ganancia Neta (Ventas - Gastos):
            </span>
            <strong className="text-base font-black text-slate-800">
              {fmtMoney(gananciaNeta)}
            </strong>
          </div>
        </div>
      </div>

      {/* 4. DESGLOSE POR MÉTODO DE PAGO Y GASTOS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* DESGLOSE DE VENTAS */}
        <section className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <h2 className="text-sm font-black text-slate-800">Ventas por Método de Pago</h2>
            </div>
            <strong className="text-base font-black text-blue-700">{fmtMoney(ventasTotal)}</strong>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {(resumen?.ventas_desglose || []).map((v) => (
              <div
                key={`v-${v.metodo_pago}`}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">
                    {v.metodo_pago === "Efectivo" ? (
                      <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    ) : v.metodo_pago === "Tarjeta" ? (
                      <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <line x1="2" x2="22" y1="10" y2="10" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                        <line x1="12" x2="12.01" y1="18" y2="18" />
                      </svg>
                    )}
                  </span>
                  <span>{v.metodo_pago}</span>
                </div>
                <strong className="text-slate-900">{fmtMoney(v.total_ventas)}</strong>
              </div>
            ))}
            {(!resumen?.ventas_desglose || resumen.ventas_desglose.length === 0) && (
              <div className="py-4 text-center text-xs font-semibold text-slate-400">
                No hay ventas registradas en esta fecha.
              </div>
            )}
          </div>
        </section>

        {/* DESGLOSE DE GASTOS */}
        <section className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <h2 className="text-sm font-black text-slate-800">Gastos / Salidas de Caja Chica</h2>
            </div>
            <strong className="text-base font-black text-rose-700">{fmtMoney(gastosTotal)}</strong>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {(resumen?.gastos_desglose || []).map((g) => (
              <div
                key={`g-${g.metodo_pago}`}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">
                    {g.metodo_pago === "Efectivo" ? (
                      <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    ) : g.metodo_pago === "Tarjeta" ? (
                      <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <line x1="2" x2="22" y1="10" y2="10" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                        <line x1="12" x2="12.01" y1="18" y2="18" />
                      </svg>
                    )}
                  </span>
                  <span>{g.metodo_pago}</span>
                </div>
                <strong className="text-rose-600">-{fmtMoney(g.total_gastos)}</strong>
              </div>
            ))}
            {(!resumen?.gastos_desglose || resumen.gastos_desglose.length === 0) && (
              <div className="py-4 text-center text-xs font-semibold text-slate-400">
                No hay gastos registrados en esta fecha.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 5. TABLA DE MOVIMIENTOS DETALLADOS CON FILTROS */}
      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
            <h2 className="text-base font-black text-slate-800">
              Movimientos Detallados ({movimientosFiltrados.length})
            </h2>
          </div>

          {/* FILTROS TÁCTILES */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setFiltro("TODOS")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                filtro === "TODOS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltro("ENTRADA")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                filtro === "ENTRADA" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ventas (Entradas)
            </button>
            <button
              type="button"
              onClick={() => setFiltro("SALIDA")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                filtro === "SALIDA" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Gastos (Salidas)
            </button>
          </div>
        </div>

        {/* LISTADO DE MOVIMIENTOS */}
        {movimientosFiltrados.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <path d="M8 7h8M8 11h8M8 15h5" />
              </svg>
            </div>
            <p className="mt-2 text-xs font-semibold">No hay movimientos para este filtro.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {movimientosFiltrados.map((m) => {
              const isEntrada = m?.tipo === "ENTRADA";
              const isAnulado =
                (m?.concepto && String(m.concepto).includes("[ANULAD")) || Number(m?.monto ?? 0) === 0;

              const isVenta =
                m?.origen === "VENTA" ||
                (!m?.origen && isEntrada && !String(m?.concepto || "").toLowerCase().includes("préstamo"));
              const isPrestamoEntrada = isEntrada && !isVenta;
              const isDevolucionCambio =
                !isEntrada && String(m?.concepto || "").toLowerCase().includes("devolución préstamo");

              return (
                <div
                  key={`${m?.tipo}-${m?.id}-${m?.fechaHora}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition-all hover:bg-slate-50 hover:border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black ${
                        isVenta
                          ? "border border-emerald-200 bg-emerald-100/90 text-emerald-900"
                          : isPrestamoEntrada
                          ? "border border-indigo-200 bg-indigo-100 text-indigo-900"
                          : isDevolucionCambio
                          ? "border border-amber-200 bg-amber-100 text-amber-900"
                          : "border border-rose-200 bg-rose-100/90 text-rose-900"
                      }`}
                    >
                      <span>
                        {isVenta ? "↓" : isPrestamoEntrada ? "🪙" : isDevolucionCambio ? "🤝" : "↑"}
                      </span>
                      <span>
                        {isVenta
                          ? "VENTA"
                          : isPrestamoEntrada
                          ? "PRÉSTAMO CAMBIO"
                          : isDevolucionCambio
                          ? "DEV. CAMBIO"
                          : "GASTO"}
                      </span>
                    </span>

                    <div className="flex flex-col">
                      <strong className="text-xs font-bold text-slate-800">
                        {m?.concepto || (isEntrada ? "Venta en mostrador" : "Salida de caja")}
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        {fmtDateTime(m?.fechaHora)} · {m?.metodoPago || "Efectivo"} · Cajero: {m?.usuario || "Turno"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={`text-sm font-black ${
                          isEntrada
                            ? isPrestamoEntrada
                              ? "text-indigo-700"
                              : "text-emerald-700"
                            : isDevolucionCambio
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {isEntrada ? "+" : "-"}{fmtMoney(m?.monto)}
                      </div>
                      {isAnulado && (
                        <span className="text-[10px] font-bold text-rose-600 uppercase">Anulado</span>
                      )}
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex items-center gap-1">
                      {isVenta ? (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate(`/ventas/${m?.id}`)}
                            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAccionError(null);
                              setMotivoAccion("");
                              setVentaAccion({ id: m?.id });
                            }}
                            disabled={!canMutate || isAnulado || isAccionando}
                            className="rounded-xl border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                            title="Anular venta y reintegrar stock"
                          >
                            Anular
                          </button>
                        </>
                      ) : isPrestamoEntrada ? (
                        <span className="text-[11px] text-slate-400 italic px-1">
                          Sin impacto en ventas
                        </span>
                      ) : (
                        <>
                          {!isDevolucionCambio && (
                            <button
                              type="button"
                              onClick={() => {
                                setAccionError(null);
                                setMotivoAccion("");
                                setEditGasto({
                                  id: m?.id,
                                  montoStr: String(m?.monto ?? ""),
                                  metodoPago: m?.metodoPago ?? "Efectivo",
                                  concepto: m?.concepto ?? "",
                                });
                              }}
                              disabled={!canMutate || isAnulado || isAccionando}
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                            >
                              Editar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setAccionError(null);
                              setMotivoAccion("");
                              setGastoAccion({
                                id: m?.id,
                                monto: m?.monto,
                                metodoPago: m?.metodoPago,
                                concepto: m?.concepto,
                              });
                            }}
                            disabled={!canMutate || isAnulado || isAccionando}
                            className="rounded-xl border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                          >
                            Anular
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* MODALES DE CIERRE, ANULACIÓN, EDICIÓN Y PRÉSTAMO           */}
      {/* ======================================================== */}

      {/* MODAL DE PRÉSTAMO / DEVOLUCIÓN DE CAMBIO */}
      {showPrestamoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Préstamo / Devolución de Cambio
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Ajuste temporal de efectivo sin alterar ventas ni gastos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrestamoModal(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Selector de Acción: Ingresar cambio vs Devolver cambio */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPrestamoTipo("ENTRADA")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
                  prestamoTipo === "ENTRADA"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>+</span>
                <span>Ingresar Cambio Prestado</span>
              </button>
              <button
                type="button"
                onClick={() => setPrestamoTipo("SALIDA")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
                  prestamoTipo === "SALIDA"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>-</span>
                <span>Devolver Cambio Prestado</span>
              </button>
            </div>

            {/* Mensaje explicativo del tipo seleccionado */}
            <div className={`mt-3 rounded-2xl border p-3 text-xs ${
              prestamoTipo === "ENTRADA"
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                : "border-amber-200 bg-amber-50/70 text-amber-900"
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-base">{prestamoTipo === "ENTRADA" ? "💡" : "🤝"}</span>
                <div>
                  <strong className="block font-bold">
                    {prestamoTipo === "ENTRADA" ? "Entrada de dinero a gaveta" : "Salida de dinero de gaveta"}
                  </strong>
                  <span className="text-[11px] leading-relaxed">
                    {prestamoTipo === "ENTRADA"
                      ? "Se sumará al efectivo físico de la caja para que haya cambio. NO cuenta como venta ni altera ganancias."
                      : "Se retira de la caja física para devolvérselo al trabajador. NO cuenta como gasto del taller ni descuadra el corte."}
                  </span>
                </div>
              </div>
            </div>

            {/* Chips Rápidos de Monto */}
            <div className="mt-3.5 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-500">Montos frecuentes:</span>
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 500].map((monto) => (
                  <button
                    key={monto}
                    type="button"
                    onClick={() => setPrestamoMonto(String(monto))}
                    className={`rounded-xl border py-2 text-center text-xs font-black transition-all cursor-pointer ${
                      prestamoMonto === String(monto)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    ${monto}
                  </button>
                ))}
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarPrestamo} className="mt-3.5 flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  Monto ($ MXN) *
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="0.00"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none"
                    value={prestamoMonto}
                    onChange={(e) => setPrestamoMonto(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  ¿Quién prestó? *
                  <input
                    type="text"
                    required
                    placeholder="Nombre del trabajador"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                    value={prestamoTrabajador}
                    onChange={(e) => setPrestamoTrabajador(e.target.value)}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                Nota u observaciones (opcional)
                <input
                  type="text"
                  placeholder="Ej. Monedas de $10 y $5, billetes de $20..."
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  value={prestamoNota}
                  onChange={(e) => setPrestamoNota(e.target.value)}
                />
              </label>

              {prestamoError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">
                  {prestamoError}
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPrestamoModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrestamo}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black text-white shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer ${
                    prestamoTipo === "ENTRADA" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    {isSavingPrestamo
                      ? "Registrando..."
                      : prestamoTipo === "ENTRADA"
                      ? "Ingresar a Caja"
                      : "Registrar Devolución"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CORTE DE CAJA DEFINITIVO */}
      {showCerrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 9h6v6H9z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-800">Corte y Cierre de Caja</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Ingresa el dinero físico que contaste en efectivo para cerrar el turno.
            </p>

            <div className="my-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-700">Efectivo Físico Contado ($):</span>
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-black text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={montoFinalFisico}
                  onChange={(e) => setMontoFinalFisico(e.target.value)}
                  placeholder="0.00"
                />
              </label>

              <div className="text-xs text-slate-600">
                <span>Según sistema (efectivo esperado): </span>
                <strong className="text-slate-800 font-extrabold">{fmtMoney(efectivoEnCaja)}</strong>
                {Number.isFinite(Number(montoFinalFisico)) && (
                  <div className="mt-1">
                    <span>Diferencia: </span>
                    <strong
                      className={`font-black ${
                        Number(montoFinalFisico) - efectivoEnCaja >= 0
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {fmtMoney(Number(montoFinalFisico) - efectivoEnCaja)}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {cerrarError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
                {cerrarError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCerrarModal(false)}
                disabled={isClosing}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCerrarCajaDefinitivo}
                disabled={isClosing}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isClosing ? "Cerrando…" : "Confirmar Corte de Caja"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ANULAR VENTA */}
      {ventaAccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-black text-slate-800">
              ¿Anular Venta #{ventaAccion.id}?
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Esto devolverá las piezas al inventario y restará el importe en efectivo de la caja.
            </p>

            <div className="my-4">
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                <span>Motivo de anulación (opcional):</span>
                <input
                  type="text"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={motivoAccion}
                  onChange={(e) => setMotivoAccion(e.target.value)}
                  placeholder="Ej: Cliente canceló, cobro duplicado..."
                  disabled={isAccionando}
                />
              </label>
            </div>

            {accionError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
                {accionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVentaAccion(null)}
                disabled={isAccionando}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doAnularVenta}
                disabled={isAccionando}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isAccionando ? "Anulando…" : "Anular Venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR GASTO */}
      {editGasto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-black text-slate-800">
              Editar Gasto #{editGasto.id}
            </h3>

            <div className="my-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                <span>Monto ($):</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={editGasto.montoStr}
                  onChange={(e) => setEditGasto((v) => ({ ...v, montoStr: e.target.value }))}
                  disabled={isAccionando}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                <span>Método de Pago:</span>
                <select
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={editGasto.metodoPago}
                  onChange={(e) => setEditGasto((v) => ({ ...v, metodoPago: e.target.value }))}
                  disabled={isAccionando}
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Tarjeta</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                <span>Concepto:</span>
                <input
                  type="text"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={editGasto.concepto}
                  onChange={(e) => setEditGasto((v) => ({ ...v, concepto: e.target.value }))}
                  disabled={isAccionando}
                />
              </label>
            </div>

            {accionError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
                {accionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditGasto(null)}
                disabled={isAccionando}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doGuardarGasto}
                disabled={isAccionando}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {isAccionando ? "Guardando…" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ANULAR GASTO */}
      {gastoAccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-black text-slate-800">
              ¿Anular Gasto #{gastoAccion.id}?
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Se restaurará el monto a la caja ({fmtMoney(gastoAccion.monto)}).
            </p>

            <div className="my-4">
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                <span>Motivo (opcional):</span>
                <input
                  type="text"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={motivoAccion}
                  onChange={(e) => setMotivoAccion(e.target.value)}
                  disabled={isAccionando}
                />
              </label>
            </div>

            {accionError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
                {accionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGastoAccion(null)}
                disabled={isAccionando}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={doAnularGasto}
                disabled={isAccionando}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isAccionando ? "Anulando…" : "Anular Gasto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
