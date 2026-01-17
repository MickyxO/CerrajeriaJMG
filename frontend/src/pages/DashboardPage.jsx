import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cajaService } from "../services/caja.service";
import { useAuth } from "../hooks/useAuth";

import "./DashboardPage.css";

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [flash, setFlash] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [estado, setEstado] = useState(null);
  const [cajaData, setCajaData] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  const [montoInicial, setMontoInicial] = useState(0);
  const [abrirError, setAbrirError] = useState(null);
  const [isOpening, setIsOpening] = useState(false);

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
    refreshDashboard().catch(() => {
      // ignore refresh errors; dashboard already handles initial errors
    });
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
    setResumen(resumenRes?.data || null);
    setMovimientos(Array.isArray(movsRes?.data) ? movsRes.data : []);
  }

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
      await refreshDashboard();
    } catch (e) {
      setAbrirError(e?.message || "No se pudo abrir caja");
    } finally {
      setIsOpening(false);
    }
  }

  const ventasTotal = useMemo(() => sumByKey(resumen?.ventas_desglose, "total_ventas"), [resumen]);
  const gastosTotal = useMemo(() => sumByKey(resumen?.gastos_desglose, "total_gastos"), [resumen]);
  const ultimosMovimientos = useMemo(() => {
    const list = Array.isArray(movimientos) ? movimientos : [];
    return list.slice(-8).reverse();
  }, [movimientos]);

  return (
    <div className="dash">
      {flash ? (
        <div className="notice" role="status">
          {flash}
        </div>
      ) : null}
      {error && <div className="error">{error}</div>}
      {isLoading && !error && <div className="notice">Cargando dashboard…</div>}

      <div className="dashGrid">
        {/* Estado de caja */}
        <section className="card col4">
          <div className="cardHead">
            <strong>Estado de caja</strong>
            <span className="badge">
              <span className="dot" aria-hidden="true" />
              {estado || "-"}
            </span>
          </div>

          <div className="cardBody">
            {estado === "CERRADA" ? (
              <>
                <div className="meta">
                  <div className="metaLine">
                    <strong>Caja cerrada</strong> — abre caja para iniciar el día.
                  </div>
                </div>

                <div className="actions" style={{ marginTop: 12 }}>
                  <button type="button" className="secondaryButton" onClick={() => navigate("/caja")}
                  >
                    Ir a Caja
                  </button>

                  <div className="openBox">
                    <label className="inputLabel">
                      Monto inicial
                      <input
                        className="input"
                        inputMode="decimal"
                        value={montoInicial}
                        onChange={(e) => setMontoInicial(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={handleAbrirCaja}
                      disabled={isOpening}
                    >
                      {isOpening ? "Abriendo…" : "Abrir caja"}
                    </button>
                  </div>

                  {abrirError ? <div className="smallError">{abrirError}</div> : null}
                </div>
              </>
            ) : (
              <>
                <div className="kpiRow">
                  <div className="kpi">
                    <div className="kpiLabel">Monto inicial</div>
                    <div className="kpiValue">{fmtMoney(cajaData?.MontoInicial)}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpiLabel">Monto actual</div>
                    <div className="kpiValue">{fmtMoney(cajaData?.MontoActual)}</div>
                  </div>
                </div>

                <div className="meta">
                  <div className="metaLine">
                    <strong>Apertura:</strong> {fmtDateTime(cajaData?.HoraApertura ?? cajaData?.FechaApertura)}
                  </div>
                  <div className="metaLine">
                    <strong>ID Caja:</strong> {cajaData?.IdCaja ?? "-"}
                  </div>
                </div>

                <div className="actions" style={{ marginTop: 12 }}>
                  <button type="button" className="secondaryButton" onClick={() => navigate("/caja")}
                  >
                    Ir a Caja
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Resumen del día */}
        <section className="card col8">
          <div className="cardHead">
            <strong>Resumen del día</strong>
            <span className="badge">
              <span className="dot" aria-hidden="true" />
              Hoy
            </span>
          </div>

          <div className="cardBody">
            <div className="kpiRow">
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

            <div className="meta" style={{ marginTop: 12 }}>
              <div className="metaLine">
                <strong>Tip:</strong> si algo no cuadra, revisa movimientos de efectivo.
              </div>
            </div>
          </div>
        </section>

        {/* Últimos movimientos */}
        <section className="card col12">
          <div className="cardHead">
            <strong>Últimos movimientos</strong>
            <div className="movHeadRight">
              <div className="headActions" aria-label="Acciones rápidas">
                <button type="button" className="headButton" onClick={() => navigate("/caja")}>
                  Ver Caja
                </button>
                <button type="button" className="headButton" onClick={() => navigate("/pos")}
                >
                  Ir a POS
                </button>
              </div>
              <span className="badge" title="Movimientos mostrados">
                <span className="dot" aria-hidden="true" />
                {ultimosMovimientos.length}
              </span>
            </div>
          </div>

          <div className="cardBody">
            {ultimosMovimientos.length === 0 ? (
              <div className="meta">
                <div className="metaLine">No hay movimientos registrados hoy.</div>
              </div>
            ) : (
              <div>
                {ultimosMovimientos.map((m) => {
                  const isEntrada = m?.tipo === "ENTRADA";
                  return (
                    <div key={`${m?.tipo}-${m?.id}-${m?.fechaHora}`} className="movementRow">
                      <span className={isEntrada ? "chip chipIn" : "chip chipOut"}>
                        {isEntrada ? "ENTRADA" : "SALIDA"}
                      </span>
                      <div className="movementMain">
                        <div className="movementTitle">{m?.concepto || (isEntrada ? "Venta" : "Salida")}</div>
                        <div className="movementSub">
                          {fmtDateTime(m?.fechaHora)} · {m?.metodoPago || "-"} · {m?.usuario || "-"}
                        </div>
                      </div>
                      <div className="movementAmount">{fmtMoney(m?.monto)}</div>
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
