import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ventasService } from "../../services/ventas.service";

import "./VentaDetallePage.css";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${toDateInputValue(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
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
    NombreCliente: row?.NombreCliente ?? row?.nombre_cliente ?? "",
    Subtotal: row?.Subtotal ?? row?.subtotal ?? null,
    MontoIva: row?.MontoIva ?? row?.monto_iva ?? null,
    Total: row?.Total ?? row?.total ?? 0,
    MetodoPago: row?.MetodoPago ?? row?.metodo_pago ?? "",
    Notas: row?.Notas ?? row?.notas ?? "",
    Vendedor: row?.Vendedor ?? row?.vendedor ?? "",
    Items: Array.isArray(row?.Items ?? row?.items) ? (row?.Items ?? row?.items) : [],
  };
}

function normalizeLinea(l) {
  return {
    cantidad: Number(l?.Cantidad ?? l?.cantidad ?? 0),
    precio_unitario: Number(l?.PrecioUnitario ?? l?.precio_unitario ?? 0),
    subtotal: Number(l?.Subtotal ?? l?.subtotal ?? 0),
    nombre_producto: (l?.NombreProducto ?? l?.nombre_producto ?? "").toString(),
    id_combo: l?.IdCombo ?? l?.id_combo ?? null,
    nombre_combo_snapshot: l?.NombreComboSnapshot ?? l?.nombre_combo_snapshot ?? null,
    precio_combo_unitario_snapshot:
      l?.PrecioComboUnitarioSnapshot ?? l?.precio_combo_unitario_snapshot ?? null,
    combo_cantidad_snapshot: l?.ComboCantidadSnapshot ?? l?.combo_cantidad_snapshot ?? null,
  };
}

export default function VentaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventaRaw, setVentaRaw] = useState(null);

  const venta = useMemo(() => (ventaRaw ? normalizeVentaDetalle(ventaRaw) : null), [ventaRaw]);
  const lineas = useMemo(() => (venta?.Items ?? []).map(normalizeLinea), [venta]);

  const combos = useMemo(() => {
    const map = new Map();
    for (const l of lineas) {
      if (!l?.id_combo) continue;
      const key = String(l.id_combo);
      if (!map.has(key)) {
        map.set(key, {
          id_combo: l.id_combo,
          nombre: (l.nombre_combo_snapshot ?? "").toString() || `Combo #${l.id_combo}`,
          cantidad: Number(l.combo_cantidad_snapshot ?? 0) || null,
          precio_unitario: Number(l.precio_combo_unitario_snapshot ?? 0) || null,
        });
      }
    }
    return Array.from(map.values());
  }, [lineas]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await ventasService.getVenta(id);
        if (cancelled) return;
        setVentaRaw(res);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Error cargando detalle");
        setVentaRaw(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (id) run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const requiereFactura = Number(venta?.MontoIva ?? 0) > 0;

  return (
    <div className="ventaDetallePage">
      <div className="ventaDetalleTop">
        <div>
          <h1 className="ventaDetalleTitle">Detalle de venta</h1>
          <div className="ventaDetalleSubtitle">
            {venta?.IdVenta ? `#${venta.IdVenta}` : `ID: ${id}`}
            {venta?.FechaVenta ? ` · ${formatDateTime(venta.FechaVenta)}` : ""}
          </div>
        </div>

        <div className="ventaDetalleTopActions">
          <button type="button" className="ventaBack" onClick={() => navigate("/ventas")}>
            Volver
          </button>
        </div>
      </div>

      <div className="ventaDetalleGrid">
        <div className="panel">
          <div className="panelHead">
            <strong>Resumen</strong>
            {requiereFactura ? <span className="pill">Factura</span> : <span className="pill">Sin IVA</span>}
          </div>
          <div className="panelBody">
            {isLoading ? <div className="ventaLoading">Cargando...</div> : null}
            {error ? <div className="ventaError">{error}</div> : null}

            {!isLoading && !error && venta ? (
              <div className="ventaSummary">
                <div className="ventaSummaryRow">
                  <span>Cliente</span>
                  <strong>{venta.NombreCliente || "Mostrador"}</strong>
                </div>
                <div className="ventaSummaryRow">
                  <span>Método</span>
                  <strong>{venta.MetodoPago || "-"}</strong>
                </div>
                <div className="ventaSummaryRow">
                  <span>Vendedor</span>
                  <strong>{venta.Vendedor || "-"}</strong>
                </div>
                <div className="ventaSummaryRow">
                  <span>Subtotal</span>
                  <strong>{formatMoney(venta.Subtotal ?? 0)}</strong>
                </div>
                <div className="ventaSummaryRow">
                  <span>IVA</span>
                  <strong>{formatMoney(venta.MontoIva ?? 0)}</strong>
                </div>
                <div className="ventaSummaryRow ventaSummaryTotal">
                  <span>Total</span>
                  <strong>{formatMoney(venta.Total ?? 0)}</strong>
                </div>
                {venta.Notas ? (
                  <div className="ventaNotes">
                    <div className="ventaNotesLabel">Notas</div>
                    <div className="ventaNotesText">{venta.Notas}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {combos.length > 0 ? (
          <div className="panel">
            <div className="panelHead">
              <strong>Combos</strong>
              <span className="pill">{combos.length}</span>
            </div>
            <div className="panelBody">
              <div className="ventaCombos">
                {combos.map((c) => {
                  const total =
                    Number.isFinite(Number(c?.precio_unitario)) && Number.isFinite(Number(c?.cantidad))
                      ? Number(c.precio_unitario) * Number(c.cantidad)
                      : null;
                  return (
                    <div key={c.id_combo} className="ventaComboRow">
                      <div className="ventaComboName">{c.nombre}</div>
                      <div className="ventaComboMeta">
                        {c.cantidad ? `${c.cantidad}x` : ""} {c.precio_unitario ? formatMoney(c.precio_unitario) : ""}
                        {total != null ? ` · ${formatMoney(total)}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="ventaCombosHint">
                Nota: abajo verás las líneas internas usadas para inventario.
              </div>
            </div>
          </div>
        ) : null}

        <div className="panel panelFull">
          <div className="panelHead">
            <strong>Líneas</strong>
            <span className="pill">{lineas.length}</span>
          </div>
          <div className="panelBody">
            <div className="ventaTableWrap">
              <table className="ventaTable">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Combo</th>
                    <th className="ventaRight">Cant.</th>
                    <th className="ventaRight">P. Unit</th>
                    <th className="ventaRight">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && !error && lineas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="ventaEmpty">
                        Sin líneas.
                      </td>
                    </tr>
                  ) : null}
                  {lineas.map((l, idx) => (
                    <tr key={`${l.id_combo ?? "item"}-${idx}`}>
                      <td className="ventaProd">{l.nombre_producto || "(Sin nombre)"}</td>
                      <td className="ventaCombo">
                        {l.id_combo ? (l.nombre_combo_snapshot || `#${l.id_combo}`) : ""}
                      </td>
                      <td className="ventaRight">{Number.isFinite(l.cantidad) ? l.cantidad : ""}</td>
                      <td className="ventaRight">{formatMoney(l.precio_unitario)}</td>
                      <td className="ventaRight">{formatMoney(l.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
