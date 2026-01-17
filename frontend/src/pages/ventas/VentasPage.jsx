import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ventasService } from "../../services/ventas.service";

import "./VentasPage.css";

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

function normalizeVenta(row) {
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
  };
}

export default function VentasPage() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fechaInicio, setFechaInicio] = useState(() => toDateInputValue(today));
  const [fechaFin, setFechaFin] = useState(() => toDateInputValue(today));
  const [qCliente, setQCliente] = useState("");

  const [ventasRaw, setVentasRaw] = useState([]);

  const ventas = useMemo(() => {
    const list = (Array.isArray(ventasRaw) ? ventasRaw : []).map(normalizeVenta);
    const q = qCliente.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) => (v?.NombreCliente ?? "").toString().toLowerCase().includes(q));
  }, [ventasRaw, qCliente]);

  const totals = useMemo(() => {
    const sum = ventas.reduce((acc, v) => acc + Number(v?.Total ?? 0), 0);
    return {
      count: ventas.length,
      sumTotal: sum,
    };
  }, [ventas]);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ventasService.getVentas({
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      });
      setVentasRaw(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Error cargando ventas");
      setVentasRaw([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="ventasPage">
      <div className="ventasTop">
        <div>
          <h1 className="ventasTitle">Ventas</h1>
          <div className="ventasSubtitle">Historial por fecha y cliente</div>
        </div>

        <div className="ventasTopActions">
          <button type="button" className="ventasChip" onClick={setRangeHoy}>
            Hoy
          </button>
          <button type="button" className="ventasChip" onClick={setRange7Dias}>
            Últimos 7 días
          </button>
          <button type="button" className="ventasChip" onClick={setRangeMes}>
            Este mes
          </button>
          <button
            type="button"
            className="ventasPrimary"
            onClick={load}
            disabled={isLoading}
            title="Recargar"
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="ventasGrid">
        <div className="panel">
          <div className="panelHead">
            <strong>Filtros</strong>
            <span className="pill">{formatMoney(totals.sumTotal)}</span>
          </div>
          <div className="panelBody">
            <div className="ventasFilters">
              <label className="ventasField">
                <span>Fecha inicio</span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </label>

              <label className="ventasField">
                <span>Fecha fin</span>
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </label>

              <label className="ventasField ventasFieldFull">
                <span>Cliente (contiene)</span>
                <input
                  value={qCliente}
                  onChange={(e) => setQCliente(e.target.value)}
                  placeholder="Mostrador, Juan, ..."
                />
              </label>
            </div>

            <div className="ventasMetaRow">
              <div className="ventasCount">
                {isLoading ? "Cargando..." : `${totals.count} venta(s)`}
              </div>
              {error ? <div className="ventasError">{error}</div> : null}
            </div>
          </div>
        </div>

        <div className="panel panelFull">
          <div className="panelHead">
            <strong>Resultados</strong>
            <span className="pill">{totals.count}</span>
          </div>
          <div className="panelBody">
            <div className="ventasTableWrap">
              <table className="ventasTable">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Método</th>
                    <th>Vendedor</th>
                    <th className="ventasRight">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && ventas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="ventasEmpty">
                        Sin ventas para esos filtros.
                      </td>
                    </tr>
                  ) : null}
                  {ventas.map((v) => {
                    const requiereFactura = Number(v?.MontoIva ?? 0) > 0;
                    const isAnulada =
                      (v?.Notas && String(v.Notas).includes("[ANULADA]")) || Number(v?.Total ?? 0) === 0;
                    return (
                      <tr key={v.IdVenta} className="ventasRow">
                        <td className="ventasId">#{v.IdVenta}</td>
                        <td>
                          <div className="ventasDate">{formatDateTime(v.FechaVenta)}</div>
                          {isAnulada ? <div className="ventasBadge" style={{ background: "rgba(239, 68, 68, 0.10)", borderColor: "rgba(239, 68, 68, 0.35)", color: "#b91c1c" }}>Anulada</div> : null}
                          {requiereFactura ? <div className="ventasBadge">Factura</div> : null}
                        </td>
                        <td>{v.NombreCliente || "Mostrador"}</td>
                        <td>{v.MetodoPago || "-"}</td>
                        <td>{v.Vendedor || "-"}</td>
                        <td className="ventasRight ventasTotal">{formatMoney(v.Total)}</td>
                        <td className="ventasRight">
                          <button
                            type="button"
                            className="ventasLink"
                            onClick={() => navigate(`/ventas/${v.IdVenta}`)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
