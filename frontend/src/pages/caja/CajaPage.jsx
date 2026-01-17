import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cajaService } from "../../services/caja.service";
import { useAuth } from "../../hooks/useAuth";

import "./CajaPage.css";

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

  const [montoInicial, setMontoInicial] = useState(0);
  const [abrirError, setAbrirError] = useState(null);
  const [isOpening, setIsOpening] = useState(false);

  const [showCerrarCard, setShowCerrarCard] = useState(false);
  const [montoFinalFisico, setMontoFinalFisico] = useState("");
  const [cerrarError, setCerrarError] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  const [filtro, setFiltro] = useState("TODOS"); // TODOS | ENTRADA | SALIDA

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function handleAbrirCaja() {
    setAbrirError(null);
    if (!userId) {
      setAbrirError("No se encontró el usuario (IdUsuario). Vuelve a iniciar sesión.");
      return;
    }

    const n = Number(montoInicial);
    if (!Number.isFinite(n) || n < 0) {
      setAbrirError("Monto inicial inválido.");
      return;
    }

    setIsOpening(true);
    try {
      await cajaService.abrirCaja({ montoInicial: n, idUsuario: userId });
      await refresh();
    } catch (e) {
      setAbrirError(e?.message || "No se pudo abrir caja");
    } finally {
      setIsOpening(false);
    }
  }

  function openCerrarCard() {
    setCerrarError(null);
    setShowCerrarCard(true);
    const suggested = cajaData?.MontoActual ?? resumen?.ganancia_dia;
    if (suggested !== undefined && suggested !== null && suggested !== "") {
      const n = Number(suggested);
      if (Number.isFinite(n)) setMontoFinalFisico(String(n));
    }
  }

  function closeCerrarCard() {
    setShowCerrarCard(false);
    setCerrarError(null);
    setMontoFinalFisico("");
  }

  async function handleCerrarCajaDefinitivo() {
    setCerrarError(null);
    if (!userId) {
      setCerrarError("No se encontró el usuario (IdUsuario). Vuelve a iniciar sesión.");
      return;
    }
    if (!isToday) {
      setCerrarError("Solo puedes cerrar la caja del día (hoy).");
      return;
    }
    if (estado !== "ABIERTA") {
      setCerrarError("No hay caja abierta para cerrar.");
      return;
    }

    const n = Number(montoFinalFisico);
    if (!Number.isFinite(n) || n < 0) {
      setCerrarError("Monto final físico inválido.");
      return;
    }

    setIsClosing(true);
    try {
      await cajaService.cerrarCaja({ montoFinalFisico: n, idUsuario: userId });
      await refresh();
      closeCerrarCard();
    } catch (e) {
      setCerrarError(e?.message || "No se pudo cerrar caja");
    } finally {
      setIsClosing(false);
    }
  }

  useEffect(() => {
    // Si cambias de fecha o deja de estar abierta, cerramos el panel de cierre.
    if (!isToday || estado !== "ABIERTA") {
      setShowCerrarCard(false);
      setCerrarError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, estado]);

  const ventasTotal = useMemo(() => sumByKey(resumen?.ventas_desglose, "total_ventas"), [resumen]);
  const gastosTotal = useMemo(() => sumByKey(resumen?.gastos_desglose, "total_gastos"), [resumen]);

  const movimientosFiltrados = useMemo(() => {
    const list = Array.isArray(movimientos) ? movimientos : [];
    if (filtro === "ENTRADA") return list.filter((m) => m?.tipo === "ENTRADA");
    if (filtro === "SALIDA") return list.filter((m) => m?.tipo === "SALIDA");
    return list;
  }, [movimientos, filtro]);

  return (
    <div className="cajaPage">
      <div className="cajaTop">
        <div className="cajaTitle">
          <h1>Caja del día</h1>
          <div className="cajaSubtitle">Aquí se ve el detalle de ventas (entradas) y gastos (salidas).</div>
        </div>

        <div className="cajaTopActions">
          <button type="button" className="ghost" onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button type="button" className="primary" onClick={() => navigate("/pos")}
          >
            Ir a POS
          </button>
          <button type="button" className="ghost" onClick={refresh}>
            Refrescar
          </button>
        </div>
      </div>

      {error && <div className="status statusError">{error}</div>}
      {isLoading && !error && <div className="status">Cargando caja…</div>}

      <section className="panel panelFull">
        <div className="panelHead">
          <strong>Fecha</strong>
          <span className="pill">{selectedDate}</span>
        </div>
        <div className="panelBody">
          <div className="dateRow">
            <label className="field">
              <span>Seleccionar fecha</span>
              <input
                className="textInput"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>

            <div className="dateActions">
              <button type="button" className="ghost" onClick={() => setSelectedDate(todayStr)}>
                Hoy
              </button>
              <button type="button" className="ghost" onClick={() => refresh(selectedDate)}>
                Cargar
              </button>
            </div>
          </div>

          {Array.isArray(fechasDisponibles) && fechasDisponibles.length > 0 ? (
            <div className="dateChips">
              <div className="hint">Fechas recientes:</div>
              <div className="chipRow">
                {fechasDisponibles.slice(0, 10).map((f) => {
                  const d = String(f).slice(0, 10);
                  return (
                    <button
                      key={`fecha-${d}`}
                      type="button"
                      className={d === selectedDate ? "dateChip dateChipActive" : "dateChip"}
                      onClick={() => setSelectedDate(d)}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="cajaGrid">
        <section className="panel">
          <div className="panelHead">
            <strong>Estado</strong>
            <span className="pill">{estado || "-"}</span>
          </div>

          <div className="panelBody">
            {estado === "SIN_CAJA" ? (
              <div className="hint">No hay caja registrada para {selectedDate}.</div>
            ) : estado === "CERRADA" ? (
              <>
                <div className="hint">
                  {isToday
                    ? "No hay caja abierta. Abre caja para registrar efectivo."
                    : "Esta caja ya está cerrada (o no se abrió ese día)."}
                </div>

                {isToday ? (
                  <>
                    <div className="openBox">
                      <label className="field">
                        <span>Monto inicial</span>
                        <input
                          className="textInput"
                          inputMode="decimal"
                          value={montoInicial}
                          onChange={(e) => setMontoInicial(e.target.value)}
                          placeholder="0.00"
                        />
                      </label>
                      <button type="button" className="primary" onClick={handleAbrirCaja} disabled={isOpening}>
                        {isOpening ? "Abriendo…" : "Abrir caja"}
                      </button>
                    </div>
                    {abrirError ? <div className="status statusError">{abrirError}</div> : null}
                  </>
                ) : null}
              </>
            ) : (
              <div className="kpis">
                <div className="kpi">
                  <div className="kpiLabel">Monto inicial</div>
                  <div className="kpiValue">{fmtMoney(cajaData?.MontoInicial)}</div>
                </div>
                <div className="kpi">
                  <div className="kpiLabel">Monto actual</div>
                  <div className="kpiValue">{fmtMoney(cajaData?.MontoActual)}</div>
                </div>
                <div className="meta">
                  <div>
                    <strong>Apertura:</strong> {String(cajaData?.FechaApertura ?? "-")}
                  </div>
                  <div>
                    <strong>ID Caja:</strong> {cajaData?.IdCaja ?? "-"}
                  </div>
                </div>

                {estado === "ABIERTA" && isToday ? (
                  <div className="closeActions">
                    <button type="button" className="danger" onClick={openCerrarCard}>
                      Cerrar caja
                    </button>
                  </div>
                ) : null}

                {showCerrarCard ? (
                  <div className="closeCard" role="region" aria-label="Cerrar caja">
                    <div className="closeCardTitle">Cierre de caja</div>
                    <div className="hint">Escribe cuánto efectivo hay físicamente al final.</div>

                    <label className="field" style={{ marginTop: 10 }}>
                      <span>Monto final físico</span>
                      <input
                        className="textInput"
                        inputMode="decimal"
                        value={montoFinalFisico}
                        onChange={(e) => setMontoFinalFisico(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>

                    <div className="hint">
                      Según sistema (balance): <strong>{fmtMoney(resumen?.ganancia_dia)}</strong>
                      {Number.isFinite(Number(montoFinalFisico)) && Number.isFinite(Number(resumen?.ganancia_dia))
                        ? ` · Diferencia: ${fmtMoney(Number(montoFinalFisico) - Number(resumen?.ganancia_dia))}`
                        : ""}
                    </div>

                    {cerrarError ? <div className="status statusError">{cerrarError}</div> : null}

                    <div className="closeCardActions">
                      <button type="button" className="ghost" onClick={closeCerrarCard} disabled={isClosing}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={handleCerrarCajaDefinitivo}
                        disabled={isClosing}
                      >
                        {isClosing ? "Cerrando…" : "Cerrar caja definitivamente"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHead">
            <strong>Resumen</strong>
            <span className="pill">Hoy</span>
          </div>
          <div className="panelBody">
            <div className="kpis kpis4">
              <div className="kpi">
                <div className="kpiLabel">Monto inicial</div>
                <div className="kpiValue">{fmtMoney(resumen?.monto_inicial)}</div>
              </div>
              <div className="kpi">
                <div className="kpiLabel">Ventas</div>
                <div className="kpiValue">{fmtMoney(ventasTotal)}</div>
              </div>
              <div className="kpi">
                <div className="kpiLabel">Gastos</div>
                <div className="kpiValue">{fmtMoney(gastosTotal)}</div>
              </div>
              <div className="kpi">
                <div className="kpiLabel">Balance (según caja)</div>
                <div className="kpiValue">{fmtMoney(resumen?.ganancia_dia)}</div>
              </div>
            </div>

            <div className="split">
              <div>
                <div className="miniTitle">Ventas por método</div>
                <div className="miniList">
                  {(resumen?.ventas_desglose || []).map((r) => (
                    <div key={`v-${r.metodo_pago}`} className="miniRow">
                      <span>{r.metodo_pago}</span>
                      <strong>{fmtMoney(r.total_ventas)}</strong>
                    </div>
                  ))}
                  {(!resumen?.ventas_desglose || resumen.ventas_desglose.length === 0) && (
                    <div className="hint">Sin ventas registradas.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="miniTitle">Gastos por método</div>
                <div className="miniList">
                  {(resumen?.gastos_desglose || []).map((r) => (
                    <div key={`g-${r.metodo_pago}`} className="miniRow">
                      <span>{r.metodo_pago}</span>
                      <strong>{fmtMoney(r.total_gastos)}</strong>
                    </div>
                  ))}
                  {(!resumen?.gastos_desglose || resumen.gastos_desglose.length === 0) && (
                    <div className="hint">Sin gastos registrados.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel panelFull">
          <div className="panelHead movHead">
            <strong>Movimientos</strong>
            <div className="movFilters">
              <button
                type="button"
                className={filtro === "TODOS" ? "cajaMovButton cajaMovButtonActive" : "cajaMovButton"}
                onClick={() => setFiltro("TODOS")}
              >
                Todos
              </button>
              <button
                type="button"
                className={filtro === "ENTRADA" ? "cajaMovButton cajaMovButtonActive" : "cajaMovButton"}
                onClick={() => setFiltro("ENTRADA")}
              >
                Entradas
              </button>
              <button
                type="button"
                className={filtro === "SALIDA" ? "cajaMovButton cajaMovButtonActive" : "cajaMovButton"}
                onClick={() => setFiltro("SALIDA")}
              >
                Salidas
              </button>
              <span className="pill" title="Movimientos mostrados">
                {movimientosFiltrados.length}
              </span>
            </div>
          </div>

          <div className="panelBody">
            {movimientosFiltrados.length === 0 ? (
              <div className="hint">No hay movimientos para mostrar.</div>
            ) : (
              <div className="movList">
                {movimientosFiltrados.map((m) => {
                  const isEntrada = m?.tipo === "ENTRADA";
                  return (
                    <div key={`${m?.tipo}-${m?.id}-${m?.fechaHora}`} className="movRow">
                      <span className={isEntrada ? "chip chipIn" : "chip chipOut"}>
                        {isEntrada ? "ENTRADA" : "SALIDA"}
                      </span>
                      <div className="movMain">
                        <div className="movTitle">{m?.concepto || (isEntrada ? "Venta" : "Salida")}</div>
                        <div className="movSub">
                          {fmtDateTime(m?.fechaHora)} · {m?.metodoPago || "-"} · {m?.usuario || "-"}
                        </div>
                      </div>
                      <div className="movAmount">{fmtMoney(m?.monto)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
