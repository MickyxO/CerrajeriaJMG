import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { itemsService } from "../../services/items.service";
import { combosService } from "../../services/combos.service";
import { categoriaService } from "../../services/categoria.service";
import { ventasService } from "../../services/ventas.service";
import { cajaService } from "../../services/caja.service";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";

import "./PosPage.css";

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function formatMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0.00";
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function toSafeString(v) {
  return (v ?? "").toString();
}

export default function PosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lines, totals, addItem, addCombo, inc, dec, remove, clear, setQty } = useCart();

  const [mode, setMode] = useState("venta"); // 'venta' | 'gasto'

  const [q, setQ] = useState("");
  const [showItems, setShowItems] = useState(true);
  const [showCombos, setShowCombos] = useState(true);
  const [itemsResults, setItemsResults] = useState([]);
  const [combosAll, setCombosAll] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState("");

  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [nombreCliente, setNombreCliente] = useState("");
  const [notas, setNotas] = useState("");
  const [requiereFactura, setRequiereFactura] = useState(false);

  const [useManualTotal, setUseManualTotal] = useState(false);
  const [manualTotal, setManualTotal] = useState("");

  const [ventaStatus, setVentaStatus] = useState({ type: "idle", message: "" });

  const [gastoMonto, setGastoMonto] = useState("");
  const [gastoConcepto, setGastoConcepto] = useState("");
  const [gastoMetodoPago, setGastoMetodoPago] = useState("Efectivo");
  const [gastoStatus, setGastoStatus] = useState({ type: "idle", message: "" });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      combosService.getCombos().catch(() => []),
      categoriaService.getCategorias().catch(() => []),
    ]).then(([combosData, categoriasData]) => {
      if (!mounted) return;
      setCombosAll(Array.isArray(combosData) ? combosData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const query = q.trim();
    setVentaStatus({ type: "idle", message: "" });

    if (!showItems) {
      setItemsResults([]);
      setIsSearching(false);
      return;
    }

    if (!categoriaId && query.length < 2) {
      setItemsResults([]);
      setIsSearching(false);
      return;
    }

    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (categoriaId) {
          const res = await itemsService.getItemsPorCategoria(categoriaId);
          let list = Array.isArray(res) ? res : [];
          if (query.length >= 2) {
            const ql = query.toLowerCase();
            list = list.filter((it) => (it?.Nombre || "").toLowerCase().includes(ql));
          }
          setItemsResults(list);
        } else {
          const res = await itemsService.buscarItems(query);
          setItemsResults(Array.isArray(res) ? res : []);
        }
      } catch {
        setItemsResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [q, showItems, categoriaId]);

  const combosFiltered = useMemo(() => {
    if (!showCombos) return [];
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return combosAll.filter((c) => toSafeString(c?.NombreCombo).toLowerCase().includes(query));
  }, [q, combosAll, showCombos]);

  const carritoPayload = useMemo(
    () =>
      lines.map((l) => ({
        tipo: l.tipo,
        id: l.id,
        cantidad: l.cantidad,
        precio: l.precio,
      })),
    [lines]
  );

  const computedTotal = useMemo(() => round2(totals.total), [totals.total]);
  const effectiveTotal = useMemo(() => {
    if (!useManualTotal) return computedTotal;
    const n = Number(manualTotal);
    if (!Number.isFinite(n)) return NaN;
    return round2(n);
  }, [useManualTotal, manualTotal, computedTotal]);

  async function onCobrar() {
    setVentaStatus({ type: "idle", message: "" });
    if (!user?.IdUsuario) {
      setVentaStatus({ type: "error", message: "No hay usuario activo." });
      return;
    }
    if (lines.length === 0) {
      setVentaStatus({ type: "error", message: "Carrito vacío." });
      return;
    }

    const total = effectiveTotal;
    if (!Number.isFinite(total) || total <= 0) {
      setVentaStatus({ type: "error", message: "Total inválido." });
      return;
    }

    try {
      setVentaStatus({ type: "loading", message: "Procesando venta…" });
      const idVenta = await ventasService.crearVenta({
        datosVenta: {
          idUsuario: user.IdUsuario,
          metodoPago,
          nombreCliente: nombreCliente.trim() || "Mostrador",
          notas: notas.trim() || "",
          total,
          requiereFactura: Boolean(requiereFactura),
        },
        carrito: carritoPayload,
      });

      clear();
      setNombreCliente("");
      setNotas("");
      setRequiereFactura(false);
      setUseManualTotal(false);
      setManualTotal("");
      setVentaStatus({ type: "success", message: `Venta registrada (#${idVenta}).` });
      navigate("/dashboard", {
        replace: true,
        state: { flash: `Venta registrada (#${idVenta}).` },
      });
    } catch (e) {
      const msg = e?.message || "No se pudo registrar la venta.";
      setVentaStatus({ type: "error", message: msg });
    }
  }

  async function onRegistrarGasto(e) {
    e?.preventDefault?.();
    setGastoStatus({ type: "idle", message: "" });

    if (!user?.IdUsuario) {
      setGastoStatus({ type: "error", message: "No hay usuario activo." });
      return;
    }

    const monto = Number(gastoMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      setGastoStatus({ type: "error", message: "Monto inválido." });
      return;
    }

    try {
      setGastoStatus({ type: "loading", message: "Registrando gasto…" });
      const res = await cajaService.registrarGasto({
        Monto: round2(monto),
        Concepto: gastoConcepto?.trim() || "Gasto",
        IdUsuario: user.IdUsuario,
        MetodoPago: gastoMetodoPago,
      });
      const idMov = res?.id_movimiento ?? res?.idMovimiento;
      setGastoMonto("");
      setGastoConcepto("");
      setGastoMetodoPago("Efectivo");
      setGastoStatus({ type: "success", message: `Gasto registrado${idMov ? ` (#${idMov})` : ""}.` });
    } catch (e2) {
      const msg = e2?.message || "No se pudo registrar el gasto.";
      setGastoStatus({ type: "error", message: msg });
    }
  }

  return (
    <div className="posPage">
      <div className="posHeader">
        <div className="posMode">
          <button
            type="button"
            className={mode === "venta" ? "segButton segActive" : "segButton"}
            onClick={() => setMode("venta")}
          >
            Venta
          </button>
          <button
            type="button"
            className={mode === "gasto" ? "segButton segActive" : "segButton"}
            onClick={() => setMode("gasto")}
          >
            Gasto
          </button>
        </div>

        <div className="posHeaderRight">
          <button type="button" className="ghost" onClick={() => navigate("/caja")}
          >
            Ver Caja
          </button>
          <div className="posTotalPill">
            <span>Total</span>
            <strong>{formatMoney(Number.isFinite(effectiveTotal) ? effectiveTotal : computedTotal)}</strong>
          </div>
        </div>
      </div>

      {mode === "venta" ? (
        <div className="posGrid">
          <section className="posPanel">
            <div className="panelTitle">Buscar</div>

            <div className="searchRow">
              <input
                className="textInput"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar (mín 2 letras)…"
              />
              <div className="toggleRow">
                <label className="check">
                  <input type="checkbox" checked={showItems} onChange={(e) => setShowItems(e.target.checked)} />
                  <span>Items</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={showCombos} onChange={(e) => setShowCombos(e.target.checked)} />
                  <span>Combos</span>
                </label>
              </div>

              {showItems && categorias.length > 0 && (
                <div className="posCatRow" aria-label="Categorías">
                  <button
                    type="button"
                    className={categoriaId === "" ? "posCatChip posCatChipActive" : "posCatChip"}
                    onClick={() => setCategoriaId("")}
                    title="Mostrar todas las categorías"
                  >
                    Todas
                  </button>
                  {categorias.map((c) => (
                    <button
                      type="button"
                      key={`cat-${c?.IdCategoria}`}
                      className={categoriaId === String(c?.IdCategoria) ? "posCatChip posCatChipActive" : "posCatChip"}
                      onClick={() => setCategoriaId(String(c?.IdCategoria))}
                      title={c?.Clasificacion || ""}
                    >
                      {c?.NombreCategoria}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isSearching && <div className="hint">Buscando…</div>}

            <div className="results">
              {showItems && itemsResults.length > 0 && (
                <>
                  <div className="resultsHeader">Items</div>
                  {itemsResults.slice(0, 25).map((it) => (
                    <button
                      type="button"
                      key={`item-${it.IdItem}`}
                      className="resultRow"
                      onClick={() => addItem(it, 1)}
                      title="Agregar al carrito"
                    >
                      <div className="resultMain">
                        <div className="resultName">{it.Nombre}</div>
                        <div className="resultMeta">{it.NombreCategoria || ""}</div>
                      </div>
                      <div className="resultPrice">{formatMoney(it.PrecioVenta)}</div>
                    </button>
                  ))}
                </>
              )}

              {showCombos && combosFiltered.length > 0 && (
                <>
                  <div className="resultsHeader">Combos</div>
                  {combosFiltered.slice(0, 25).map((c) => (
                    <button
                      type="button"
                      key={`combo-${c.IdCombo}`}
                      className="resultRow"
                      onClick={() => addCombo(c, 1)}
                      title="Agregar al carrito"
                    >
                      <div className="resultMain">
                        <div className="resultName">{c.NombreCombo}</div>
                        <div className="resultMeta">{(c.Items || []).length} items</div>
                      </div>
                      <div className="resultPrice">{formatMoney(c.PrecioSugerido)}</div>
                    </button>
                  ))}
                </>
              )}

              {q.trim().length >= 2 && itemsResults.length === 0 && combosFiltered.length === 0 && (
                <div className="hint">Sin resultados.</div>
              )}
              {q.trim().length < 2 && <div className="hint">Tip: escribe al menos 2 letras.</div>}
            </div>
          </section>

          <section className="posPanel">
            <div className="panelTitle">Carrito</div>

            {lines.length === 0 ? (
              <div className="hint">Agrega productos para cobrar.</div>
            ) : (
              <div className="cart">
                {lines.map((l) => (
                  <div key={l.key} className="cartRow">
                    <div className="cartMain">
                      <div className="cartName">
                        {l.nombre}
                        <span className="chip">{l.tipo}</span>
                      </div>
                      <div className="cartMeta">{formatMoney(l.precio)} c/u</div>
                    </div>

                    <div className="qty">
                      <button type="button" className="qtyBtn" onClick={() => dec(l.key)} aria-label="Disminuir">
                        −
                      </button>
                      <input
                        className="qtyInput"
                        value={l.cantidad}
                        inputMode="numeric"
                        onChange={(e) => setQty(l.key, e.target.value)}
                      />
                      <button type="button" className="qtyBtn" onClick={() => inc(l.key)} aria-label="Aumentar">
                        +
                      </button>
                    </div>

                    <div className="cartRight">
                      <div className="cartSubtotal">{formatMoney(l.cantidad * l.precio)}</div>
                      <button type="button" className="linkDanger" onClick={() => remove(l.key)}>
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}

                <div className="cartFooter">
                  <button type="button" className="ghost" onClick={clear}>
                    Vaciar
                  </button>
                  <div className="cartTotal">
                    <span>Total</span>
                    <strong>{formatMoney(totals.total)}</strong>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="posPanel">
            <div className="panelTitle">Cobro</div>

            <div className="formGrid">
              <div className="field fieldFull">
                <div className="posTotalsRow">
                  <div className="posTotalsMeta">
                    <span className="posTotalsLabel">Total calculado</span>
                    <strong className="posTotalsValue">{formatMoney(computedTotal)}</strong>
                  </div>
                  <div className="posTotalsMeta">
                    <span className="posTotalsLabel">Total a cobrar</span>
                    <strong className="posTotalsValue">{formatMoney(Number.isFinite(effectiveTotal) ? effectiveTotal : computedTotal)}</strong>
                  </div>
                </div>
              </div>

              <label className="field">
                <span>Método de pago</span>
                <select className="textInput" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>

              <label className="field">
                <span>Cliente (opcional)</span>
                <input className="textInput" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
              </label>

              <label className="field fieldFull">
                <span>Notas (opcional)</span>
                <input className="textInput" value={notas} onChange={(e) => setNotas(e.target.value)} />
              </label>

              <label className="check fieldFull">
                <input
                  type="checkbox"
                  checked={requiereFactura}
                  onChange={(e) => setRequiereFactura(e.target.checked)}
                />
                <span>Requiere factura (total incluye IVA)</span>
              </label>

              <label className="check fieldFull">
                <input
                  type="checkbox"
                  checked={useManualTotal}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setUseManualTotal(next);
                    if (next && !manualTotal) setManualTotal(String(computedTotal));
                  }}
                />
                <span>Total manual (para descuentos/ajustes)</span>
              </label>

              {useManualTotal && (
                <div className="field fieldFull">
                  <div className="posManualTotalRow">
                    <label className="field" style={{ margin: 0 }}>
                      <span>Total a cobrar</span>
                      <input
                        className="textInput"
                        inputMode="decimal"
                        value={manualTotal}
                        onChange={(e) => setManualTotal(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <button type="button" className="ghost" onClick={() => setManualTotal(String(computedTotal))}>
                      Igualar al calculado
                    </button>
                  </div>
                  {Number.isFinite(effectiveTotal) && Number.isFinite(computedTotal) && (
                    <div className="hint">
                      Diferencia vs calculado: {formatMoney(round2(effectiveTotal - computedTotal))}
                    </div>
                  )}
                  {!Number.isFinite(effectiveTotal) && <div className="hint">Escribe un número válido.</div>}
                </div>
              )}
            </div>

            {ventaStatus.type !== "idle" && (
              <div
                className={
                  ventaStatus.type === "error"
                    ? "status statusError"
                    : ventaStatus.type === "success"
                      ? "status statusSuccess"
                      : "status"
                }
              >
                {ventaStatus.message}
              </div>
            )}

            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={onCobrar}
                disabled={ventaStatus.type === "loading"}
              >
                Cobrar {formatMoney(Number.isFinite(effectiveTotal) ? effectiveTotal : computedTotal)}
              </button>
            </div>

            <div className="hint">
              Si eliges <strong>Efectivo</strong>, debe haber caja abierta.
            </div>
          </section>
        </div>
      ) : (
        <div className="posGridSingle">
          <section className="posPanel">
            <div className="panelTitle">Registrar gasto</div>
            <form onSubmit={onRegistrarGasto} className="formGrid">
              <label className="field">
                <span>Método</span>
                <select
                  className="textInput"
                  value={gastoMetodoPago}
                  onChange={(e) => setGastoMetodoPago(e.target.value)}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>

              <label className="field">
                <span>Monto</span>
                <input
                  className="textInput"
                  inputMode="decimal"
                  value={gastoMonto}
                  onChange={(e) => setGastoMonto(e.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className="field fieldFull">
                <span>Concepto</span>
                <input
                  className="textInput"
                  value={gastoConcepto}
                  onChange={(e) => setGastoConcepto(e.target.value)}
                  placeholder="Ej. Insumos / Gasolina / Refacción…"
                />
              </label>

              {gastoStatus.type !== "idle" && (
                <div
                  className={
                    gastoStatus.type === "error"
                      ? "status statusError"
                      : gastoStatus.type === "success"
                        ? "status statusSuccess"
                        : "status"
                  }
                >
                  {gastoStatus.message}
                </div>
              )}

              <div className="actions fieldFull">
                <button type="submit" className="primary" disabled={gastoStatus.type === "loading"}>
                  Registrar gasto
                </button>
              </div>

              <div className="hint fieldFull">
                Nota: solo descuenta de caja si el método es <strong>Efectivo</strong>.
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
