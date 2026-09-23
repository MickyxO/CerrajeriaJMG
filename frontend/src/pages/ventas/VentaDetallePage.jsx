import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ventasService } from "../../services/ventas.service";
import { useAuth } from "../../hooks/useAuth";

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

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return v.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeVentaDetalle(row) {
  return {
    IdVenta: row?.IdVenta ?? row?.id_venta ?? null,
    FechaVenta: row?.FechaVenta ?? row?.fecha_venta ?? null,
    NombreCliente: row?.NombreCliente ?? row?.nombre_cliente ?? "Mostrador",
    Subtotal: row?.Subtotal ?? row?.subtotal ?? 0,
    MontoIva: row?.MontoIva ?? row?.monto_iva ?? 0,
    Total: row?.Total ?? row?.total ?? 0,
    MetodoPago: row?.MetodoPago ?? row?.metodo_pago ?? "Efectivo",
    Notas: row?.Notas ?? row?.notas ?? "",
    Vendedor: row?.Vendedor ?? row?.vendedor ?? "-",
    Estado: row?.Estado ?? row?.estado ?? "COMPLETADA",
    Items: Array.isArray(row?.Items ?? row?.items) ? (row?.Items ?? row?.items) : [],
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

export default function VentaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventaRaw, setVentaRaw] = useState(null);

  const [showAnular, setShowAnular] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [isAnulando, setIsAnulando] = useState(false);
  const [anularError, setAnularError] = useState(null);

  const venta = useMemo(() => (ventaRaw ? normalizeVentaDetalle(ventaRaw) : null), [ventaRaw]);
  const lineas = useMemo(() => (venta?.Items ?? []).map(normalizeLinea), [venta]);

  async function loadTicket() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ventasService.getVenta(id);
      setVentaRaw(res);
    } catch (e) {
      setError(e?.message || "Error al cargar información del ticket");
      setVentaRaw(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isAnulada = useMemo(() => {
    if (!venta) return false;
    return (
      (venta?.Notas && String(venta.Notas).includes("[ANULADA]")) ||
      String(venta?.Estado).toUpperCase() === "ANULADA" ||
      Number(venta?.Total) === 0
    );
  }, [venta]);

  async function handleAnular() {
    if (!venta?.IdVenta) return;
    setIsAnulando(true);
    setAnularError(null);
    try {
      await ventasService.anularVenta(venta.IdVenta, {
        idUsuario: user?.IdUsuario ?? user?.id_usuario,
        motivo: motivoAnular.trim() || undefined,
      });
      await loadTicket();
      setShowAnular(false);
      setMotivoAnular("");
    } catch (e) {
      setAnularError(e?.message || "No se pudo anular la venta");
    } finally {
      setIsAnulando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 7h8M8 11h8M8 15h5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Detalle de Ticket #{id}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {venta?.FechaVenta ? formatDateTime(venta.FechaVenta) : "Comprobante individual"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {!isAnulada && !showAnular && (
            <button
              type="button"
              onClick={() => setShowAnular(true)}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-black text-xs sm:text-sm border border-rose-200 transition-all cursor-pointer"
            >
              Anular / Devolver
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/ventas")}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm border border-slate-200 cursor-pointer"
          >
            ← Volver a Tickets
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-sm text-slate-400 font-medium bg-white rounded-3xl border border-slate-200">
          Cargando comprobante...
        </div>
      )}

      {error && (
        <div className="p-6 bg-rose-50 text-rose-700 rounded-3xl text-sm font-semibold border border-rose-200">
          {error}
        </div>
      )}

      {/* Formulario de anulación */}
      {showAnular && (
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl space-y-3 print:hidden">
          <div className="font-black text-rose-900 text-base flex items-center gap-2">
            <svg className="h-5 w-5 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Anular Ticket #{id} con Reversión</span>
          </div>
          <p className="text-xs text-rose-700 font-medium max-w-xl">
            Esta acción reintegrará automáticamente los productos vendidos al inventario físico y, si fue pagado en efectivo, ajustará el saldo de la caja.
          </p>
          <input
            type="text"
            value={motivoAnular}
            onChange={(e) => setMotivoAnular(e.target.value)}
            placeholder="Motivo de la anulación (ej. Error de cobro, devolución de cliente)..."
            className="w-full max-w-xl px-4 py-2.5 bg-white rounded-2xl border border-rose-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            disabled={isAnulando}
          />
          {anularError && (
            <div className="p-3 bg-red-100 text-red-800 rounded-xl text-xs font-bold">
              {anularError}
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAnular(false)}
              disabled={isAnulando}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAnular}
              disabled={isAnulando}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black shadow-md shadow-rose-200"
            >
              {isAnulando ? "Anulando..." : "Confirmar Anulación Definitiva"}
            </button>
          </div>
        </div>
      )}

      {/* Comprobante de Ticket Impreso / Vista Detallada */}
      {!isLoading && !error && venta && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formato Ticket Recibo (8 columnas) */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="font-black text-slate-900 text-lg">Productos Facturados</span>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full border ${
                  isAnulada
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {isAnulada ? "Ticket Anulado" : "Ticket Completado"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Producto / Servicio</th>
                    <th className="py-3 px-4 text-right">Cantidad</th>
                    <th className="py-3 px-4 text-right">Precio Unitario</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineas.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {l.nombre_producto || "Producto"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-700">
                        {l.cantidad}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                        {formatMoney(l.precio_unitario)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {formatMoney(l.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen Financiero Lateral (4 columnas) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-base border-b border-slate-100 pb-3">
              Información de la Transacción
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Cliente:</span>
                <span className="font-bold text-slate-900">{venta.NombreCliente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Atendió:</span>
                <span className="font-bold text-slate-900">{venta.Vendedor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Método de pago:</span>
                <span className="px-2.5 py-0.5 bg-slate-100 rounded-lg text-xs font-black text-slate-700">
                  {venta.MetodoPago}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Fecha:</span>
                <span className="font-medium text-slate-700 text-xs">
                  {formatDateTime(venta.FechaVenta)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold">{formatMoney(venta.Subtotal)}</span>
                </div>
                {Number(venta.MontoIva) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IVA:</span>
                    <span className="font-bold">{formatMoney(venta.MontoIva)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>TOTAL:</span>
                  <span className="text-indigo-600">{formatMoney(venta.Total)}</span>
                </div>
              </div>

              {venta.Notas && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-400 uppercase">Notas:</span>
                  <p className="text-xs text-slate-600 font-medium mt-1 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {venta.Notas}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
