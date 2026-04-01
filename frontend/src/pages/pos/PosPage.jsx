import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { itemsService } from "../../services/items.service";
import { combosService } from "../../services/combos.service";
import { ventasService } from "../../services/ventas.service";
import { cajaService } from "../../services/caja.service";
import { API_URL } from "../../services/api";
import { IMAGE_VARIANTS, resolveImageUrl } from "../../utils/image";
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

function resolveImagenUrl(value, variant) {
  return resolveImageUrl(value, { apiBaseUrl: API_URL, variant });
}

function iconTextFromName(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "--";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function bySort(a, b, sortBy) {
  if (sortBy === "precio_asc") return Number(a?.PrecioVenta || 0) - Number(b?.PrecioVenta || 0);
  if (sortBy === "precio_desc") return Number(b?.PrecioVenta || 0) - Number(a?.PrecioVenta || 0);
  if (sortBy === "stock_desc") return Number(b?.StockActual || 0) - Number(a?.StockActual || 0);
  return String(a?.Nombre || "").localeCompare(String(b?.Nombre || ""), "es");
}

export default function PosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lines, totals, addItem, addCombo, inc, dec, remove, clear, setQty } = useCart();

  const [mode, setMode] = useState("venta");

  const [q, setQ] = useState("");
  const [selectedCategoriaId, setSelectedCategoriaId] = useState("");
  const [incluyeItems, setIncluyeItems] = useState(true);
  const [incluyeServicios, setIncluyeServicios] = useState(true);
  const [soloConStock, setSoloConStock] = useState(true);
  const [sortBy, setSortBy] = useState("nombre");
  const [showCombos, setShowCombos] = useState(false);

  const [catalogo, setCatalogo] = useState({ categorias: [], articulos: [] });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  const [combosAll, setCombosAll] = useState([]);

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
    combosService
      .getCombos()
      .then((res) => {
        if (!mounted) return;
        setCombosAll(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (!mounted) return;
        setCombosAll([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setCatalogLoading(true);
      setCatalogError("");
      try {
        const res = await itemsService.getPosCatalogo({
          q,
          idCategoria: selectedCategoriaId || undefined,
          incluyeItems,
          incluyeServicios,
          soloConStock,
          limit: 320,
        });

        if (cancelled) return;
        setCatalogo({
          categorias: Array.isArray(res?.categorias) ? res.categorias : [],
          articulos: Array.isArray(res?.articulos) ? res.articulos : [],
        });
      } catch (e) {
        if (cancelled) return;
        setCatalogo({ categorias: [], articulos: [] });
        setCatalogError(e?.message || "No se pudo cargar el catalogo POS.");
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, selectedCategoriaId, incluyeItems, incluyeServicios, soloConStock]);

  const categorias = useMemo(() => {
    return Array.isArray(catalogo.categorias) ? catalogo.categorias : [];
  }, [catalogo.categorias]);

  const articulosOrdenados = useMemo(() => {
    const base = Array.isArray(catalogo.articulos) ? [...catalogo.articulos] : [];
    base.sort((a, b) => bySort(a, b, sortBy));
    return base;
  }, [catalogo.articulos, sortBy]);

  const combosFiltrados = useMemo(() => {
    const all = Array.isArray(combosAll) ? combosAll : [];
    const qClean = String(q || "").trim().toLowerCase();
    if (!qClean) return all.slice(0, 80);
    return all.filter((combo) => String(combo?.NombreCombo || "").toLowerCase().includes(qClean)).slice(0, 80);
  }, [combosAll, q]);

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
      setVentaStatus({ type: "error", message: "Carrito vacio." });
      return;
    }

    const total = effectiveTotal;
    if (!Number.isFinite(total) || total <= 0) {
      setVentaStatus({ type: "error", message: "Total invalido." });
      return;
    }

    try {
      setVentaStatus({ type: "loading", message: "Procesando venta..." });
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
      setGastoStatus({ type: "error", message: "Monto invalido." });
      return;
    }

    try {
      setGastoStatus({ type: "loading", message: "Registrando gasto..." });
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
          <button type="button" className="ghost" onClick={() => navigate("/caja")}>
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
            <div className="panelTitle">Menu POS</div>

            <div className="searchRow">
              <input
                className="textInput"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, marca, chip, frecuencia o ID..."
              />

              <div className="toggleRow">
                <label className="check">
                  <input type="checkbox" checked={incluyeItems} onChange={(e) => setIncluyeItems(e.target.checked)} />
                  <span>Items</span>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={incluyeServicios}
                    onChange={(e) => setIncluyeServicios(e.target.checked)}
                  />
                  <span>Servicios</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={soloConStock} onChange={(e) => setSoloConStock(e.target.checked)} />
                  <span>Solo con stock</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={showCombos} onChange={(e) => setShowCombos(e.target.checked)} />
                  <span>Mostrar combos</span>
                </label>
              </div>

              <div className="sortRow">
                <span>Orden:</span>
                <select className="textInput" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="nombre">Nombre</option>
                  <option value="precio_asc">Precio: menor a mayor</option>
                  <option value="precio_desc">Precio: mayor a menor</option>
                  <option value="stock_desc">Stock disponible</option>
                </select>
              </div>

              <div className="catsGrid" aria-label="Categorias">
                <button
                  type="button"
                  className={selectedCategoriaId === "" ? "catTile catTileActive" : "catTile"}
                  onClick={() => setSelectedCategoriaId("")}
                >
                  <div className="catIcon">TO</div>
                  <div className="catName">Todas</div>
                </button>

                {categorias.map((cat) => (
                  <button
                    type="button"
                    key={`cat-${cat.IdCategoria}`}
                    className={selectedCategoriaId === String(cat.IdCategoria) ? "catTile catTileActive" : "catTile"}
                    onClick={() => setSelectedCategoriaId(String(cat.IdCategoria))}
                    title={cat.Clasificacion || ""}
                  >
                    <div className="catIcon">{iconTextFromName(cat.NombreCategoria)}</div>
                    <div className="catName">{cat.NombreCategoria}</div>
                    <div className="catCount">{cat.TotalItems}</div>
                  </button>
                ))}
              </div>
            </div>

            {catalogLoading && <div className="hint">Cargando catalogo...</div>}
            {catalogError ? <div className="status statusError">{catalogError}</div> : null}

            <div className="itemsGrid">
              {articulosOrdenados.map((item) => {
                const src = resolveImagenUrl(item?.ImagenUrl, IMAGE_VARIANTS.THUMB);
                const lowStock = !item?.EsServicio && Number(item?.StockActual || 0) <= Number(item?.StockMinimo || 0);
                return (
                  <button
                    type="button"
                    key={`item-${item.IdItem}`}
                    className={item?.EsServicio ? "menuTile menuTileService" : "menuTile"}
                    onClick={() => addItem(item, 1)}
                    title="Agregar al carrito"
                  >
                    <div className="menuThumb" aria-hidden="true">
                      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <span>{iconTextFromName(item?.Nombre)}</span>}
                    </div>
                    <div className="menuBody">
                      <div className="menuName">{item.Nombre}</div>
                      <div className="menuMeta">{item.NombreCategoria}</div>
                      <div className="menuFoot">
                        <strong>{formatMoney(item.PrecioVenta)}</strong>
                        {item.EsServicio ? (
                          <span className="stockOk">Servicio</span>
                        ) : (
                          <span className={lowStock ? "stockWarn" : "stockOk"}>Stock: {item.StockActual}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!catalogLoading && articulosOrdenados.length === 0 && <div className="hint">No hay articulos con esos filtros.</div>}

            {showCombos && (
              <>
                <div className="resultsHeader">Combos</div>
                <div className="comboGrid">
                  {combosFiltrados.map((combo) => (
                    <button
                      type="button"
                      key={`combo-${combo.IdCombo}`}
                      className="comboTile"
                      onClick={() => addCombo(combo, 1)}
                    >
                      <div className="comboName">{combo.NombreCombo}</div>
                      <div className="comboMeta">{(combo.Items || []).length} items</div>
                      <div className="comboPrice">{formatMoney(combo.PrecioSugerido)}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="posPanel">
            <div className="panelTitle">Carrito</div>

            {lines.length === 0 ? (
              <div className="hint">Presiona articulos para agregarlos al carrito.</div>
            ) : (
              <div className="cart">
                {lines.map((l) => (
                  <div key={l.key} className="cartRow">
                    <div className="cartMain">
                      <div className="cartLeft">
                        {l.tipo === "ITEM" ? (
                          <div className="cartThumb" aria-hidden="true">
                            {l.imagenUrl ? (
                              <img
                                src={resolveImagenUrl(l.imagenUrl, IMAGE_VARIANTS.THUMB)}
                                alt=""
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <span>--</span>
                            )}
                          </div>
                        ) : null}

                        <div>
                          <div className="cartName">
                            {l.nombre}
                            <span className="chip">{l.tipo}</span>
                          </div>
                          <div className="cartMeta">{formatMoney(l.precio)} c/u</div>
                        </div>
                      </div>
                    </div>

                    <div className="qty">
                      <button type="button" className="qtyBtn" onClick={() => dec(l.key)} aria-label="Disminuir">
                        -
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
                <span>Metodo de pago</span>
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
                <span>Total manual (descuentos/ajustes)</span>
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

            <div className="hint">Si eliges Efectivo, debe haber caja abierta.</div>
          </section>
        </div>
      ) : (
        <div className="posGridSingle">
          <section className="posPanel">
            <div className="panelTitle">Registrar gasto</div>
            <form onSubmit={onRegistrarGasto} className="formGrid">
              <label className="field">
                <span>Metodo</span>
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
                  placeholder="Ej. Insumos / Gasolina / Refaccion..."
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
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
