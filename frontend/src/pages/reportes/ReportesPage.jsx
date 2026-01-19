import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { reportesService } from "../../services/reportes.service";

import "./ReportesPage.css";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

function fmtMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return money.format(n);
}

function fmtDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

const RANGE_OPTIONS = [
  { key: "7d", label: "Última semana" },
  { key: "30d", label: "Último mes" },
  { key: "90d", label: "Últimos 3 meses" },
];

export default function ReportesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const itemId = (searchParams.get("itemId") ?? "").toString();

  const [range, setRange] = useState("7d");

  const [bestLoading, setBestLoading] = useState(true);
  const [bestError, setBestError] = useState(null);
  const [best, setBest] = useState([]);

  const [worstLoading, setWorstLoading] = useState(true);
  const [worstError, setWorstError] = useState(null);
  const [worst, setWorst] = useState([]);

  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState(null);
  const [itemReport, setItemReport] = useState(null);

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

  useEffect(() => {
    let cancelled = false;
    async function loadBest() {
      setBestLoading(true);
      setBestError(null);
      try {
        const res = await reportesService.getBestSellers({ range, limit: 15 });
        if (cancelled) return;
        setBest(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        if (cancelled) return;
        setBestError(e?.message || "Error cargando best sellers");
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

  useEffect(() => {
    let cancelled = false;
    async function loadWorst() {
      setWorstLoading(true);
      setWorstError(null);
      try {
        const res = await reportesService.getWorstSellers({ range, limit: 15, incluyeInactivos: false });
        if (cancelled) return;
        setWorst(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        if (cancelled) return;
        setWorstError(e?.message || "Error cargando worst sellers");
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
        setItemError(e?.message || "Error cargando reporte del item");
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

  const bestTotal = useMemo(() => best.reduce((acc, r) => acc + Number(r?.Ingresos ?? 0), 0), [best]);
  const worstTotal = useMemo(() => worst.reduce((acc, r) => acc + Number(r?.Ingresos ?? 0), 0), [worst]);

  return (
    <div className="repPage">
      <div className="repTop">
        <div>
          <h1 className="repTitle">Reportes</h1>
          <div className="repSubtitle">Ventas por producto y por periodo</div>
        </div>

        <div className="repTopActions">
          <button type="button" className="repBtn" onClick={() => navigate("/inventario")}>Inventario</button>
          <button type="button" className="repBtn" onClick={() => navigate("/ventas")}>Ventas</button>
        </div>
      </div>

      <div className="repRanges" aria-label="Rango">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            className={range === r.key ? "repChip repChipActive" : "repChip"}
            onClick={() => updateRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="repGrid">
        <div className="repLeftCol">
          <section className="repCard">
            <div className="repCardHead">
              <strong>Mejores vendidos</strong>
              <span className="repPill">Top {best.length}</span>
            </div>
            <div className="repCardBody">
              {bestError ? <div className="repError">{bestError}</div> : null}
              {bestLoading ? <div className="repHint">Cargando…</div> : null}

              {!bestLoading && !bestError ? (
                <>
                  <div className="repHint">Total (top): <strong>{fmtMoney(bestTotal)}</strong></div>
                  <div className="repTableWrap">
                    <table className="repTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Producto</th>
                          <th className="repRight">Unidades</th>
                          <th className="repRight">Ingresos</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {best.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="repEmpty">Sin ventas en este periodo.</td>
                          </tr>
                        ) : (
                          best.map((r, idx) => (
                            <tr key={r.IdItem} className={String(r.IdItem) === String(itemId) ? "repRowActive" : ""}>
                              <td>{idx + 1}</td>
                              <td>{r.Nombre || `#${r.IdItem}`}</td>
                              <td className="repRight">{Number(r.Unidades || 0)}</td>
                              <td className="repRight">{fmtMoney(r.Ingresos)}</td>
                              <td className="repRight">
                                <button type="button" className="repLink" onClick={() => selectItem(r.IdItem)}>
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className="repCard">
            <div className="repCardHead">
              <strong>Peores vendidos</strong>
              <span className="repPill">Bottom {worst.length}</span>
            </div>
            <div className="repCardBody">
              {worstError ? <div className="repError">{worstError}</div> : null}
              {worstLoading ? <div className="repHint">Cargando…</div> : null}

              {!worstLoading && !worstError ? (
                <>
                  <div className="repHint">Total (bottom): <strong>{fmtMoney(worstTotal)}</strong></div>
                  <div className="repTableWrap">
                    <table className="repTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Producto</th>
                          <th className="repRight">Unidades</th>
                          <th className="repRight">Ingresos</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {worst.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="repEmpty">Sin datos.</td>
                          </tr>
                        ) : (
                          worst.map((r, idx) => (
                            <tr key={r.IdItem} className={String(r.IdItem) === String(itemId) ? "repRowActive" : ""}>
                              <td>{idx + 1}</td>
                              <td>{r.Nombre || `#${r.IdItem}`}</td>
                              <td className="repRight">{Number(r.Unidades || 0)}</td>
                              <td className="repRight">{fmtMoney(r.Ingresos)}</td>
                              <td className="repRight">
                                <button type="button" className="repLink" onClick={() => selectItem(r.IdItem)}>
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </div>

        <section className="repCard">
          <div className="repCardHead">
            <strong>Reporte por producto</strong>
            <span className="repPill">{itemId ? `#${itemId}` : "Selecciona"}</span>
          </div>
          <div className="repCardBody">
            {!itemId ? <div className="repHint">Elige un producto desde vendidos o desde Inventario.</div> : null}

            {itemError ? <div className="repError">{itemError}</div> : null}
            {itemLoading ? <div className="repHint">Cargando…</div> : null}

            {!itemLoading && itemReport?.item ? (
              <>
                <div className="repItemTitle">
                  <div>
                    <div className="repItemName">{itemReport.item?.Nombre}</div>
                    <div className="repHint">{fmtDate(itemReport.desde)} → {fmtDate(itemReport.hasta)}</div>
                  </div>
                  <div className="repItemActions">
                    <button type="button" className="repBtn" onClick={() => selectItem("")}>Quitar</button>
                  </div>
                </div>

                <div className="repKpis">
                  <div className="repKpi">
                    <div className="repKpiLabel">Unidades</div>
                    <div className="repKpiValue">{Number(itemReport.resumen?.Unidades ?? 0)}</div>
                  </div>
                  <div className="repKpi">
                    <div className="repKpiLabel">Tickets</div>
                    <div className="repKpiValue">{Number(itemReport.resumen?.Tickets ?? 0)}</div>
                  </div>
                  <div className="repKpi">
                    <div className="repKpiLabel">Ingresos</div>
                    <div className="repKpiValue">{fmtMoney(itemReport.resumen?.Ingresos)}</div>
                  </div>
                  <div className="repKpi">
                    <div className="repKpiLabel">Precio prom.</div>
                    <div className="repKpiValue">{fmtMoney(itemReport.resumen?.PrecioPromedio)}</div>
                  </div>
                </div>

                <div className="repTableWrap" style={{ marginTop: 10 }}>
                  <table className="repTable">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th className="repRight">Unidades</th>
                        <th className="repRight">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(itemReport.porDia) ? itemReport.porDia : []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="repEmpty">Sin ventas en este periodo.</td>
                        </tr>
                      ) : (
                        itemReport.porDia.map((d) => (
                          <tr key={String(d.Fecha)}>
                            <td>{fmtDate(d.Fecha)}</td>
                            <td className="repRight">{Number(d.Unidades || 0)}</td>
                            <td className="repRight">{fmtMoney(d.Ingresos)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
