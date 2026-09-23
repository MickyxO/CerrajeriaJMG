import { useEffect, useMemo, useState } from "react";
import { ventasService } from "../../services/ventas.service";
import { useAuth } from "../../hooks/useAuth";
import { useConfirmModal } from "../../hooks/useConfirmModal";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return money.format(v);
}

function normalizeVenta(row) {
  return {
    IdVenta: row?.IdVenta ?? row?.id_venta ?? null,
    FechaVenta: row?.FechaVenta ?? row?.fecha_venta ?? null,
    NombreCliente: row?.NombreCliente ?? row?.nombre_cliente ?? "",
    Subtotal: row?.Subtotal ?? row?.subtotal ?? null,
    MontoIva: row?.MontoIva ?? row?.monto_iva ?? null,
    Total: row?.Total ?? row?.total ?? 0,
    MetodoPago: row?.MetodoPago ?? row?.metodo_pago ?? "Efectivo",
    Notas: row?.Notas ?? row?.notas ?? "",
    Vendedor: row?.Vendedor ?? row?.vendedor ?? "Mostrador",
    Estado: row?.Estado ?? row?.estado ?? "COMPLETADA",
  };
}

function normalizeLinea(l) {
  return {
    cantidad: Number(l?.Cantidad ?? l?.cantidad ?? 0),
    precio_unitario: Number(l?.PrecioUnitario ?? l?.precio_unitario ?? 0),
    subtotal: Number(l?.Subtotal ?? l?.subtotal ?? 0),
    nombre_producto: (l?.NombreProducto ?? l?.nombre_producto ?? "").toString(),
  };
}

export default function VentasPage() {
  const { user } = useAuth();
  const { confirm, modal: confirmDialog } = useConfirmModal();

  const today = useMemo(() => new Date(), []);
  const [fechaInicio, setFechaInicio] = useState(() => toDateInputValue(today));
  const [fechaFin, setFechaFin] = useState(() => toDateInputValue(today));

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS"); // 'TODOS', 'COMPLETADA', 'ANULADA'
  const [filtroMetodo, setFiltroMetodo] = useState("TODOS");

  const [ventasRaw, setVentasRaw] = useState([]);

  // Estado del modal de detalle de ticket
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetalle, setTicketDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [detalleError, setDetalleError] = useState(null);

  // Estado de anulación dentro del modal
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [isAnulando, setIsAnulando] = useState(false);
  const [anularError, setAnularError] = useState(null);

  async function loadVentas() {
    setIsLoading(true);
    setError(null);
    try {
      const rawQuery = searchQuery.trim();

      // Si el usuario busca por folio específico (#123 o 123)
      if (/^#?\d+$/.test(rawQuery)) {
        const id = Number(rawQuery.replace(/^#/, ""));
        if (Number.isInteger(id) && id > 0) {
          const venta = await ventasService.getVenta(id);
          setVentasRaw(venta ? [venta] : []);
          return;
        }
      }

      const res = await ventasService.getVentas({
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      });
      setVentasRaw(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Error al cargar tickets de venta");
      setVentasRaw([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin]);

  // Filtrado reactivo en memoria
  const ventas = useMemo(() => {
    const list = (Array.isArray(ventasRaw) ? ventasRaw : []).map(normalizeVenta);
    const q = searchQuery.trim().toLowerCase();

    return list.filter((v) => {
      // Filtro de texto (cliente o folio)
      if (q && !/^#?\d+$/.test(q)) {
        const cliente = (v.NombreCliente || "").toLowerCase();
        const vendedor = (v.Vendedor || "").toLowerCase();
        if (!cliente.includes(q) && !vendedor.includes(q)) return false;
      }

      // Filtro de estado
      const isAnulada =
        (v.Notas && String(v.Notas).includes("[ANULADA]")) ||
        String(v.Estado).toUpperCase() === "ANULADA" ||
        Number(v.Total) === 0;

      if (filtroEstado === "COMPLETADA" && isAnulada) return false;
      if (filtroEstado === "ANULADA" && !isAnulada) return false;

      // Filtro de método de pago
      if (filtroMetodo !== "TODOS") {
        const metodo = (v.MetodoPago || "").toLowerCase();
        if (metodo !== filtroMetodo.toLowerCase()) return false;
      }

      return true;
    });
  }, [ventasRaw, searchQuery, filtroEstado, filtroMetodo]);

  // Métricas rápidas de los tickets filtrados
  const metricas = useMemo(() => {
    let totalFacturado = 0;
    let totalAnulado = 0;
    let countCompletadas = 0;
    let countAnuladas = 0;

    ventas.forEach((v) => {
      const isAnulada =
        (v.Notas && String(v.Notas).includes("[ANULADA]")) ||
        String(v.Estado).toUpperCase() === "ANULADA" ||
        Number(v.Total) === 0;

      if (isAnulada) {
        countAnuladas++;
        totalAnulado += Number(v.Total || 0);
      } else {
        countCompletadas++;
        totalFacturado += Number(v.Total || 0);
      }
    });

    return {
      totalTickets: ventas.length,
      countCompletadas,
      countAnuladas,
      totalFacturado,
      totalAnulado,
    };
  }, [ventas]);

  // Cargar detalle de un ticket al seleccionarlo
  async function abrirTicket(idVenta) {
    setSelectedTicketId(idVenta);
    setLoadingDetalle(true);
    setDetalleError(null);
    setShowAnularModal(false);
    setMotivoAnular("");
    setAnularError(null);

    try {
      const data = await ventasService.getVenta(idVenta);
      setTicketDetalle(data);
    } catch (e) {
      setDetalleError(e?.message || "Error al cargar detalle del ticket");
      setTicketDetalle(null);
    } finally {
      setLoadingDetalle(false);
    }
  }

  function cerrarTicket() {
    setSelectedTicketId(null);
    setTicketDetalle(null);
    setShowAnularModal(false);
  }

  // Anular ticket con reversión de inventario y caja
  async function handleAnularTicket() {
    if (!ticketDetalle?.id_venta && !ticketDetalle?.IdVenta) return;
    const id = ticketDetalle?.IdVenta ?? ticketDetalle?.id_venta;

    setIsAnulando(true);
    setAnularError(null);
    try {
      await ventasService.anularVenta(id, {
        idUsuario: user?.IdUsuario ?? user?.id_usuario,
        motivo: motivoAnular.trim() || undefined,
      });

      // Recargar ticket actual y lista general
      const updated = await ventasService.getVenta(id);
      setTicketDetalle(updated);
      setShowAnularModal(false);
      setMotivoAnular("");
      await loadVentas();
    } catch (e) {
      setAnularError(e?.message || "No se pudo anular el ticket.");
    } finally {
      setIsAnulando(false);
    }
  }

  function setRangeHoy() {
    const v = toDateInputValue(new Date());
    setFechaInicio(v);
    setFechaFin(v);
  }

  function setRange7Dias() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    setFechaInicio(toDateInputValue(start));
    setFechaFin(toDateInputValue(end));
  }

  function setRangeMes() {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setFechaInicio(toDateInputValue(start));
    setFechaFin(toDateInputValue(end));
  }

  const detalleLineas = useMemo(() => {
    const items = ticketDetalle?.Items ?? ticketDetalle?.items ?? [];
    return Array.isArray(items) ? items.map(normalizeLinea) : [];
  }, [ticketDetalle]);

  const ticketEsAnulado = useMemo(() => {
    if (!ticketDetalle) return false;
    const notas = ticketDetalle.Notas ?? ticketDetalle.notas ?? "";
    const estado = ticketDetalle.Estado ?? ticketDetalle.estado ?? "";
    return String(notas).includes("[ANULADA]") || String(estado).toUpperCase() === "ANULADA";
  }, [ticketDetalle]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {confirmDialog}

      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 7h8M8 11h8M8 15h5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Historial de Tickets</h1>
            <p className="text-sm text-slate-500 font-medium">
              Consulta transaccional, reimpresión de comprobantes y devoluciones con reversión de inventario
            </p>
          </div>
        </div>

        {/* Acciones Rápidas de Fecha */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={setRangeHoy}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all border border-slate-200"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={setRange7Dias}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all border border-slate-200"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={setRangeMes}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all border border-slate-200"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={loadVentas}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5"
          >
            <svg className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{isLoading ? "Buscando..." : "Actualizar"}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Transaccional */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
            <span>Total Facturado</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 mt-2">
            {formatMoney(metricas.totalFacturado)}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-2">
            {metricas.countCompletadas} tickets completados con éxito
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
            <span>Tickets Emitidos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-indigo-600 mt-2">
            {metricas.totalTickets}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-2">
            En el rango de fechas seleccionado
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
            <span>Tickets Anulados</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-rose-600 mt-2">
            {metricas.countAnuladas}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-2">
            Devoluciones o errores cancelados
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Buscador unificado */}
          <div className="md:col-span-5 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por folio (#123) o nombre de cliente..."
              className="w-full !pl-11 pr-8 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Fecha Inicio */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Fecha Fin */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Filtro Estado */}
          <div className="md:col-span-3">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="COMPLETADA">Solo Completadas</option>
              <option value="ANULADA">Solo Anuladas</option>
            </select>
          </div>
        </div>

        {/* Filtros de método de pago rápidos */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 mr-2">Método de pago:</span>
          {["TODOS", "Efectivo", "Tarjeta", "Transferencia"].map((m) => {
            const active = filtroMetodo === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setFiltroMetodo(m)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla Principal de Tickets */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900">Listado de Tickets</span>
            <span className="text-xs font-black px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
              {ventas.length}
            </span>
          </div>
          {isLoading && <span className="text-xs font-bold text-indigo-600 animate-pulse">Cargando tickets...</span>}
        </div>

        {error && (
          <div className="p-4 m-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Atendió</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!isLoading && ventas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-400 font-medium">
                    No se encontraron tickets con los filtros aplicados.
                  </td>
                </tr>
              ) : null}

              {ventas.map((v) => {
                const isAnulada =
                  (v.Notas && String(v.Notas).includes("[ANULADA]")) ||
                  String(v.Estado).toUpperCase() === "ANULADA" ||
                  Number(v.Total) === 0;

                return (
                  <tr key={v.IdVenta} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      <span className="text-xs text-slate-400">#</span>
                      {v.IdVenta}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 text-xs">
                      {formatDateTime(v.FechaVenta)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 truncate max-w-[160px]">
                      {v.NombreCliente || "Mostrador"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
                        {v.MetodoPago || "Efectivo"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                      {v.Vendedor || "Mostrador"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                          isAnulada
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isAnulada ? "Anulada" : "Completada"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-base">
                      {formatMoney(v.Total)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => abrirTicket(v.IdVenta)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all border border-indigo-200"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                          <path d="M8 7h8M8 11h8M8 15h5" />
                        </svg>
                        <span>Ver Ticket</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE COMPROBANTE / DETALLE DE TICKET */}
      {selectedTicketId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={cerrarTicket}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                    <path d="M8 7h8M8 11h8M8 15h5" />
                  </svg>
                </div>
                <span className="font-black text-slate-900">
                  Comprobante de Ticket #{selectedTicketId}
                </span>
              </div>
              <button
                type="button"
                onClick={cerrarTicket}
                className="text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-7 h-7 flex items-center justify-center transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {loadingDetalle ? (
                <div className="py-12 text-center text-sm text-slate-400 font-medium">
                  Cargando información del comprobante...
                </div>
              ) : detalleError ? (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-200">
                  {detalleError}
                </div>
              ) : ticketDetalle ? (
                <>
                  {/* Tarjeta Tipo Ticket / Recibo */}
                  <div className="p-5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-4 font-mono text-xs text-slate-700">
                    <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
                      <div className="font-black text-base text-slate-900 font-sans">CERRAJERÍA JMG</div>
                      <div className="text-slate-500">Comprobante de Venta</div>
                      <div className="text-slate-400 font-sans">Folio: #{selectedTicketId}</div>
                    </div>

                    <div className="space-y-1 border-b border-dashed border-slate-300 pb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fecha:</span>
                        <span className="font-bold">{formatDateTime(ticketDetalle.FechaVenta ?? ticketDetalle.fecha_venta)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cliente:</span>
                        <span className="font-bold">{ticketDetalle.NombreCliente ?? ticketDetalle.nombre_cliente ?? "Mostrador"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Atendió:</span>
                        <span className="font-bold">{ticketDetalle.Vendedor ?? ticketDetalle.vendedor ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Método de pago:</span>
                        <span className="font-bold">{ticketDetalle.MetodoPago ?? ticketDetalle.metodo_pago ?? "Efectivo"}</span>
                      </div>
                    </div>

                    {/* Desglose de Líneas de Producto */}
                    <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                      <div className="font-bold text-slate-900 flex justify-between uppercase">
                        <span>Cant · Descripción</span>
                        <span>Total</span>
                      </div>
                      {detalleLineas.map((l, i) => (
                        <div key={i} className="flex justify-between items-start gap-2">
                          <span className="truncate">
                            {l.cantidad}x {l.nombre_producto || "Producto"}
                            <span className="text-[10px] text-slate-400 block font-sans">
                              a {formatMoney(l.precio_unitario)} c/u
                            </span>
                          </span>
                          <span className="font-bold shrink-0">{formatMoney(l.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Totales */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatMoney(ticketDetalle.Subtotal ?? ticketDetalle.subtotal ?? 0)}</span>
                      </div>
                      {Number(ticketDetalle.MontoIva ?? ticketDetalle.monto_iva ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span>IVA:</span>
                          <span>{formatMoney(ticketDetalle.MontoIva ?? ticketDetalle.monto_iva)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-300 pt-2 font-sans">
                        <span>TOTAL:</span>
                        <span>{formatMoney(ticketDetalle.Total ?? ticketDetalle.total ?? 0)}</span>
                      </div>
                    </div>

                    {/* Notas o Motivo de Anulación */}
                    {(ticketDetalle.Notas || ticketDetalle.notas) && (
                      <div className="pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-500 font-sans">
                        <span className="font-bold text-slate-700">Notas: </span>
                        {ticketDetalle.Notas ?? ticketDetalle.notas}
                      </div>
                    )}

                    {ticketEsAnulado && (
                      <div className="flex items-center justify-center gap-2 p-2.5 bg-rose-100 text-rose-800 font-black rounded-xl border border-rose-200 font-sans">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        <span>ESTE TICKET HA SIDO ANULADO</span>
                      </div>
                    )}
                  </div>

                  {/* Formulario de Anulación (desplegable si se solicita) */}
                  {showAnularModal && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-3">
                      <div className="font-black text-rose-800 text-sm flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>¿Anular este ticket de venta?</span>
                      </div>
                      <p className="text-xs text-rose-700 font-medium">
                        Al anularlo, el sistema **reintegrará las piezas vendidas al inventario** y, si fue cobrado en efectivo, revertirá el saldo en caja.
                      </p>
                      <input
                        type="text"
                        value={motivoAnular}
                        onChange={(e) => setMotivoAnular(e.target.value)}
                        placeholder="Motivo de la anulación (ej. Error de cobro, devolución)..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-rose-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        disabled={isAnulando}
                      />

                      {anularError && (
                        <div className="p-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                          {anularError}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAnularModal(false)}
                          disabled={isAnulando}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAnularTicket}
                          disabled={isAnulando}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer"
                        >
                          {isAnulando ? "Anulando..." : "Confirmar Anulación"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botones de Acción del Modal */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-slate-200 cursor-pointer"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      <span>Imprimir Ticket</span>
                    </button>

                    {!ticketEsAnulado && !showAnularModal && (
                      <button
                        type="button"
                        onClick={() => setShowAnularModal(true)}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-black text-xs sm:text-sm border border-rose-200 transition-all cursor-pointer"
                      >
                        Anular / Devolver
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={cerrarTicket}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm border border-slate-200"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
