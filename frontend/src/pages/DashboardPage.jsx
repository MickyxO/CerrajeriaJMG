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
  const [estadoMessage, setEstadoMessage] = useState(null);
  const [estadoAlertType, setEstadoAlertType] = useState(null);
  const [autoCloseNotice, setAutoCloseNotice] = useState(null);
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
    setEstadoMessage(estadoRes?.message || null);
    setEstadoAlertType(estadoRes?.alertType || null);
    setAutoCloseNotice(estadoRes?.autoCloseNotice || null);
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

  const sectionClass = "jmg-card overflow-hidden";
  const sectionHeadClass =
    "jmg-card-head flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3";
  const sectionBodyClass = "space-y-3 px-4 py-4";

  return (
    <div className="grid gap-4">
      {flash ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
          {flash}
        </div>
      ) : null}
      {estadoAlertType === "OPEN_OTHER_DAY" && estadoMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="status">
          {estadoMessage}
        </div>
      ) : null}
      {autoCloseNotice?.message ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800" role="status">
          {autoCloseNotice.message}
          {autoCloseNotice?.horaCierre ? ` Ultimo cierre automatico: ${fmtDateTime(autoCloseNotice.horaCierre)}.` : ""}
        </div>
      ) : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
      {isLoading && !error ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">Cargando dashboard...</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Estado de caja */}
        <section className={`${sectionClass} xl:col-span-4`}>
          <div className={sectionHeadClass}>
            <strong className="font-display text-lg font-semibold text-slate-800">Estado de caja</strong>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              {estado || "-"}
            </span>
          </div>

          <div className={sectionBodyClass}>
            {estado === "CERRADA" ? (
              <>
                <div className="text-sm text-slate-500">
                  <div>
                    <strong>Caja cerrada</strong> — abre caja para iniciar el día.
                  </div>
                </div>

                <div className="grid gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => navigate("/caja")}
                  >
                    Ir a Caja
                  </button>

                  <div className="grid gap-2">
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Monto inicial
                      <input
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
                        inputMode="decimal"
                        value={montoInicial}
                        onChange={(e) => setMontoInicial(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <button
                      type="button"
                      className="rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[linear-gradient(145deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.95)_100%)] px-3 py-2 text-sm font-semibold text-slate-50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
                      onClick={handleAbrirCaja}
                      disabled={isOpening}
                    >
                      {isOpening ? "Abriendo…" : "Abrir caja"}
                    </button>
                  </div>

                  {abrirError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{abrirError}</div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                {estadoAlertType === "OPEN_OTHER_DAY" && estadoMessage ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    {estadoMessage}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Monto inicial</div>
                    <div className="mt-1 text-base font-semibold text-slate-800">{fmtMoney(cajaData?.MontoInicial)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Efectivo en caja</div>
                    <div className="mt-1 text-base font-semibold text-slate-800">{fmtMoney(cajaData?.MontoActual)}</div>
                  </div>
                </div>

                <div className="grid gap-1 text-sm text-slate-500">
                  <div>
                    <strong>Apertura:</strong> {fmtDateTime(cajaData?.HoraApertura ?? cajaData?.FechaApertura)}
                  </div>
                  <div>
                    <strong>ID Caja:</strong> {cajaData?.IdCaja ?? "-"}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => navigate("/caja")}
                  >
                    Ir a Caja
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Resumen del día */}
        <section className={`${sectionClass} xl:col-span-8`}>
          <div className={sectionHeadClass}>
            <strong className="font-display text-lg font-semibold text-slate-800">Resumen del día</strong>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
              Hoy
            </span>
          </div>

          <div className={sectionBodyClass}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Monto inicial</div>
                <div className="mt-1 text-base font-semibold text-slate-800">{fmtMoney(resumen?.monto_inicial)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Ventas</div>
                <div className="mt-1 text-base font-semibold text-slate-800">{fmtMoney(ventasTotal)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Gastos</div>
                <div className="mt-1 text-base font-semibold text-slate-800">{fmtMoney(gastosTotal)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Balance (según caja)</div>
                <div className="mt-1 text-base font-semibold text-slate-800">{fmtMoney(resumen?.ganancia_dia)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              <div>
                <strong>Tip:</strong> si algo no cuadra, revisa movimientos de efectivo.
              </div>
            </div>
          </div>
        </section>

        {/* Últimos movimientos */}
        <section className={`${sectionClass} xl:col-span-12`}>
          <div className={sectionHeadClass}>
            <strong className="font-display text-lg font-semibold text-slate-800">Últimos movimientos</strong>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex flex-wrap items-center gap-2" aria-label="Acciones rápidas">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => navigate("/caja")}
                >
                  Ver Caja
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => navigate("/pos")}
                >
                  Ir a POS
                </button>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600" title="Movimientos mostrados">
                <span className="h-2 w-2 rounded-full bg-slate-500" aria-hidden="true" />
                {ultimosMovimientos.length}
              </span>
            </div>
          </div>

          <div className={sectionBodyClass}>
            {ultimosMovimientos.length === 0 ? (
              <div className="text-sm text-slate-500">No hay movimientos registrados hoy.</div>
            ) : (
              <div className="grid gap-2">
                {ultimosMovimientos.map((m) => {
                  const isEntrada = m?.tipo === "ENTRADA";
                  return (
                    <div
                      key={`${m?.tipo}-${m?.id}-${m?.fechaHora}`}
                      className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 md:grid-cols-[auto_1fr_auto] md:items-start"
                    >
                      <span
                        className={
                          isEntrada
                            ? "inline-flex h-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
                            : "inline-flex h-7 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700"
                        }
                      >
                        {isEntrada ? "ENTRADA" : "SALIDA"}
                      </span>
                      <div className="grid gap-0.5">
                        <div className="text-sm font-semibold text-slate-800">{m?.concepto || (isEntrada ? "Venta" : "Salida")}</div>
                        <div className="text-xs text-slate-500">
                          {fmtDateTime(m?.fechaHora)} · {m?.metodoPago || "-"} · {m?.usuario || "-"}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 md:justify-self-end">{fmtMoney(m?.monto)}</div>
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
