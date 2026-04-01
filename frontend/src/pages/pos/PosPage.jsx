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

export default function PosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lines, totals, addItem, addCombo, inc, dec, remove, clear, setQty } = useCart();

  const [mode, setMode] = useState("venta"); // venta | gasto
  const [catalogView, setCatalogView] = useState("productos"); // productos | combos
  const [selectedCategoriaId, setSelectedCategoriaId] = useState("");
  const [tipoVista, setTipoVista] = useState("TODOS"); // TODOS | ITEMS | SERVICIOS
  const [quickSearch, setQuickSearch] = useState("");
  const [quickSearchMode, setQuickSearchMode] = useState("NOMBRE"); // NOMBRE | ID
  const [soloConStock, setSoloConStock] = useState(true);

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

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");
      try {
        const res = await itemsService.getPosCatalogo({
          incluyeItems: true,
          incluyeServicios: true,
          soloConStock: false,
          limit: 600,
        });

        if (cancelled) return;

        const categorias = Array.isArray(res?.categorias) ? res.categorias : [];
        const articulos = Array.isArray(res?.articulos) ? res.articulos : [];

        setCatalogo({ categorias, articulos });

        if (categorias.length > 0) {
          setSelectedCategoriaId(String(categorias[0]?.IdCategoria || ""));
        }
      } catch (e) {
        if (cancelled) return;
        setCatalogo({ categorias: [], articulos: [] });
        setCatalogError(e?.message || "No se pudo cargar el catalogo POS.");
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const categorias = useMemo(() => {
    return Array.isArray(catalogo.categorias) ? catalogo.categorias : [];
  }, [catalogo.categorias]);

  const categoriaActiva = useMemo(
    () => categorias.find((c) => String(c?.IdCategoria) === String(selectedCategoriaId)) || null,
    [categorias, selectedCategoriaId]
  );

  const articulosOrdenados = useMemo(() => {
    const base = Array.isArray(catalogo.articulos) ? [...catalogo.articulos] : [];
    const query = quickSearch.trim().toLowerCase();

    if (!selectedCategoriaId) return [];

    const filteredByCategory = base.filter((a) => String(a?.IdCategoria) === String(selectedCategoriaId));

    const filteredByType = filteredByCategory.filter((item) => {
      if (tipoVista === "ITEMS") return !item?.EsServicio;
      if (tipoVista === "SERVICIOS") return Boolean(item?.EsServicio);
      return true;
    });

    const filteredByStock = filteredByType.filter((item) => {
      if (!soloConStock) return true;
      if (item?.EsServicio) return true;
      return Number(item?.StockActual || 0) > 0;
    });

    const filteredByQuery = filteredByStock.filter((item) => {
      if (!query) return true;
      if (quickSearchMode === "ID") {
        const qId = query.replace(/\D/g, "");
        if (!qId) return false;
        return String(item?.IdItem ?? "").includes(qId);
      }

      const name = String(item?.Nombre ?? "").toLowerCase();
      const desc = String(item?.Descripcion ?? "").toLowerCase();
      const marca = String(item?.CompatibilidadMarca ?? "").toLowerCase();
      return name.includes(query) || desc.includes(query) || marca.includes(query);
    });

    filteredByQuery.sort((a, b) => String(a?.Nombre || "").localeCompare(String(b?.Nombre || ""), "es"));
    return filteredByQuery;
  }, [catalogo.articulos, selectedCategoriaId, tipoVista, soloConStock, quickSearch, quickSearchMode]);

  const combosFiltrados = useMemo(() => {
    const all = Array.isArray(combosAll) ? combosAll : [];
    return [...all]
      .sort((a, b) => String(a?.NombreCombo || "").localeCompare(String(b?.NombreCombo || ""), "es"))
      .slice(0, 120);
  }, [combosAll]);

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
      setVentaStatus({ type: "error", message: e?.message || "No se pudo registrar la venta." });
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
      setGastoStatus({ type: "error", message: e2?.message || "No se pudo registrar el gasto." });
    }
  }

  return (
    <div className="posPage grid gap-4">
      <div className="jmg-toolbar flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white">
          {[
            { key: "venta", label: "Venta" },
            { key: "gasto", label: "Gasto" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              className={
                mode === option.key
                  ? "border-r border-slate-300 bg-[color:var(--jmg-navy)] px-4 py-2 text-sm font-semibold text-blue-50 last:border-r-0"
                  : "border-r border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 last:border-r-0"
              }
              onClick={() => setMode(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            onClick={() => navigate("/caja")}
          >
            Ver Caja
          </button>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Total</span>
            <strong className="text-base font-semibold text-slate-800">
              {formatMoney(Number.isFinite(effectiveTotal) ? effectiveTotal : computedTotal)}
            </strong>
          </div>
        </div>
      </div>

      {mode === "venta" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <section className="jmg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold text-slate-800">Menu POS por categorias</h2>
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white">
                {[
                  { key: "productos", label: "Productos" },
                  { key: "combos", label: "Combos" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={
                      catalogView === option.key
                        ? "border-r border-slate-300 bg-[color:var(--jmg-navy)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-50 last:border-r-0"
                        : "border-r border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 hover:bg-slate-100 last:border-r-0"
                    }
                    onClick={() => setCatalogView(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {catalogView === "productos" ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white">
                    {["TODOS", "ITEMS", "SERVICIOS"].map((typeKey) => (
                      <button
                        key={typeKey}
                        type="button"
                        className={
                          tipoVista === typeKey
                            ? "border-r border-slate-300 bg-[color:var(--jmg-navy)] px-3 py-2 text-xs font-semibold text-blue-50 last:border-r-0"
                            : "border-r border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 last:border-r-0"
                        }
                        onClick={() => setTipoVista(typeKey)}
                      >
                        {typeKey === "TODOS" ? "Todo" : typeKey === "ITEMS" ? "Items" : "Servicios"}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={
                      soloConStock
                        ? "rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                        : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    }
                    onClick={() => setSoloConStock((v) => !v)}
                  >
                    {soloConStock ? "Solo con stock: ON" : "Solo con stock: OFF"}
                  </button>
                </div>

                <div className="mb-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white">
                    <button
                      type="button"
                      className={
                        quickSearchMode === "NOMBRE"
                          ? "border-r border-slate-300 bg-[color:var(--jmg-navy)] px-3 py-1.5 text-xs font-semibold text-blue-50"
                          : "border-r border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      }
                      onClick={() => setQuickSearchMode("NOMBRE")}
                    >
                      Nombre
                    </button>
                    <button
                      type="button"
                      className={
                        quickSearchMode === "ID"
                          ? "bg-[color:var(--jmg-navy)] px-3 py-1.5 text-xs font-semibold text-blue-50"
                          : "bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      }
                      onClick={() => setQuickSearchMode("ID")}
                    >
                      ID
                    </button>
                  </div>

                  <input
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder={quickSearchMode === "ID" ? "Buscar por ID (ej. 24)" : "Mini buscador por nombre, descripción o marca"}
                    inputMode={quickSearchMode === "ID" ? "numeric" : "text"}
                  />
                </div>

                {catalogLoading ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">Cargando catalogo...</div>
                ) : null}

                {catalogError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{catalogError}</div>
                ) : null}

                {!selectedCategoriaId ? (
                  <>
                    <div className="mb-3 text-sm text-slate-500">Selecciona una categoria para abrir sus productos.</div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                      {categorias.map((cat) => (
                        <button
                          type="button"
                          key={`cat-${cat.IdCategoria}`}
                          className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
                          onClick={() => setSelectedCategoriaId(String(cat.IdCategoria))}
                          title={cat.Clasificacion || ""}
                        >
                          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600">
                            {iconTextFromName(cat.NombreCategoria)}
                          </div>
                          <div className="line-clamp-2 text-sm font-semibold text-slate-800">{cat.NombreCategoria}</div>
                          <div className="mt-1 text-xs text-slate-500">{cat.TotalItems} productos</div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm text-slate-600">
                        Categoria activa: <strong className="text-slate-800">{categoriaActiva?.NombreCategoria || "-"}</strong>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={() => setSelectedCategoriaId("")}
                      >
                        Cambiar categoria
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                      {articulosOrdenados.map((item) => {
                        const src = resolveImagenUrl(item?.ImagenUrl, IMAGE_VARIANTS.THUMB);
                        const lowStock =
                          !item?.EsServicio && Number(item?.StockActual || 0) <= Number(item?.StockMinimo || 0);

                        return (
                          <button
                            type="button"
                            key={`item-${item.IdItem}`}
                            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
                            onClick={() => addItem(item, 1)}
                            title="Agregar al carrito"
                          >
                            <div className="flex h-28 w-full items-center justify-center overflow-hidden border-b border-slate-200 bg-slate-50">
                              {src ? (
                                <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-lg font-semibold text-slate-500">{iconTextFromName(item?.Nombre)}</span>
                              )}
                            </div>

                            <div className="grid gap-1 p-3">
                              <div className="line-clamp-2 min-h-[2.6rem] text-sm font-semibold text-slate-800">{item.Nombre}</div>
                              <div className="text-xs text-slate-500">{item.NombreCategoria}</div>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <strong className="text-sm text-slate-800">{formatMoney(item.PrecioVenta)}</strong>
                                {item.EsServicio ? (
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Servicio</span>
                                ) : (
                                  <span
                                    className={
                                      lowStock
                                        ? "rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                                        : "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                    }
                                  >
                                    Stock: {item.StockActual}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {!catalogLoading && articulosOrdenados.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        No hay productos disponibles para esta categoria.
                      </div>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 text-sm text-slate-500">Selecciona un combo para agregarlo al carrito por clic.</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {combosFiltrados.map((combo) => (
                    <button
                      type="button"
                      key={`combo-${combo.IdCombo}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
                      onClick={() => addCombo(combo, 1)}
                    >
                      <div className="line-clamp-2 min-h-[2.6rem] text-sm font-semibold text-slate-800">{combo.NombreCombo}</div>
                      <div className="mt-1 text-xs text-slate-500">{(combo.Items || []).length} productos</div>
                      <div className="mt-2 text-sm font-semibold text-slate-800">{formatMoney(combo.PrecioSugerido)}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          <div className="grid gap-4">
            <section className="jmg-card p-4">
              <h3 className="mb-3 font-display text-lg font-semibold text-slate-800">Carrito</h3>

              {lines.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Presiona cuadros de productos o combos para agregarlos al carrito.
                </div>
              ) : (
                <div className="grid gap-2">
                  {lines.map((l) => (
                    <div key={l.key} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-semibold text-slate-800">{l.nombre}</div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{l.tipo}</span>
                          </div>
                          <div className="text-xs text-slate-500">{formatMoney(l.precio)} c/u</div>
                        </div>

                        {l.tipo === "ITEM" ? (
                          <div className="h-11 w-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            {l.imagenUrl ? (
                              <img
                                src={resolveImagenUrl(l.imagenUrl, IMAGE_VARIANTS.THUMB)}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-1">
                          <button
                            type="button"
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => dec(l.key)}
                            aria-label="Disminuir"
                          >
                            -
                          </button>
                          <input
                            className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm"
                            value={l.cantidad}
                            inputMode="numeric"
                            onChange={(e) => setQty(l.key, e.target.value)}
                          />
                          <button
                            type="button"
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => inc(l.key)}
                            aria-label="Aumentar"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-800">{formatMoney(l.cantidad * l.precio)}</div>
                          <button
                            type="button"
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                            onClick={() => remove(l.key)}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      onClick={clear}
                    >
                      Vaciar
                    </button>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Total</div>
                      <div className="text-base font-semibold text-slate-800">{formatMoney(totals.total)}</div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="jmg-card p-4">
              <h3 className="mb-3 font-display text-lg font-semibold text-slate-800">Cobro</h3>

              <div className="grid gap-3">
                <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Total calculado</div>
                    <strong className="text-sm font-semibold text-slate-800">{formatMoney(computedTotal)}</strong>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Total a cobrar</div>
                    <strong className="text-sm font-semibold text-slate-800">
                      {formatMoney(Number.isFinite(effectiveTotal) ? effectiveTotal : computedTotal)}
                    </strong>
                  </div>
                </div>

                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Metodo de pago
                  <select
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Otro">Otro</option>
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Cliente (opcional)
                  <input
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Notas (opcional)
                  <input
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </label>

                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={requiereFactura}
                    onChange={(e) => setRequiereFactura(e.target.checked)}
                  />
                  <span>Requiere factura (total incluye IVA)</span>
                </label>

                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
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

                {useManualTotal ? (
                  <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Total a cobrar
                      <input
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                        inputMode="decimal"
                        value={manualTotal}
                        onChange={(e) => setManualTotal(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      onClick={() => setManualTotal(String(computedTotal))}
                    >
                      Igualar al calculado
                    </button>
                  </div>
                ) : null}

                {ventaStatus.type !== "idle" ? (
                  <div
                    className={
                      ventaStatus.type === "error"
                        ? "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                        : ventaStatus.type === "success"
                          ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                          : "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                    }
                  >
                    {ventaStatus.message}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[linear-gradient(145deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.95)_100%)] px-4 py-2.5 text-sm font-semibold text-slate-50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
                  onClick={onCobrar}
                  disabled={ventaStatus.type === "loading"}
                >
                  Cobrar {formatMoney(Number.isFinite(effectiveTotal) ? effectiveTotal : computedTotal)}
                </button>

                <div className="text-xs text-slate-500">Si eliges Efectivo, debe haber caja abierta.</div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <section className="jmg-card p-4">
            <h2 className="mb-3 font-display text-lg font-semibold text-slate-800">Registrar gasto</h2>
            <form onSubmit={onRegistrarGasto} className="grid gap-3">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Metodo
                <select
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  value={gastoMetodoPago}
                  onChange={(e) => setGastoMetodoPago(e.target.value)}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>

              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Monto
                <input
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  inputMode="decimal"
                  value={gastoMonto}
                  onChange={(e) => setGastoMonto(e.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Concepto
                <input
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  value={gastoConcepto}
                  onChange={(e) => setGastoConcepto(e.target.value)}
                  placeholder="Ej. Insumos / Gasolina / Refaccion..."
                />
              </label>

              {gastoStatus.type !== "idle" ? (
                <div
                  className={
                    gastoStatus.type === "error"
                      ? "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                      : gastoStatus.type === "success"
                        ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                        : "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                  }
                >
                  {gastoStatus.message}
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[linear-gradient(145deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.95)_100%)] px-4 py-2.5 text-sm font-semibold text-slate-50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
                disabled={gastoStatus.type === "loading"}
              >
                Registrar gasto
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
