import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { categoriaService } from "../../services/categoria.service";
import { itemsService } from "../../services/items.service";
import { inventarioService } from "../../services/inventario.service";
import { API_URL } from "../../services/api";
import { IMAGE_VARIANTS, resolveImageUrl } from "../../utils/image";
import { useAuth } from "../../hooks/useAuth";

function normalizeCategoria(row) {
  return {
    IdCategoria: row?.IdCategoria ?? row?.id_categoria ?? null,
    NombreCategoria: row?.NombreCategoria ?? row?.nombre ?? "",
    Clasificacion: row?.Clasificacion ?? row?.clasificacion ?? "",
  };
}

function normalizeItem(row) {
  return {
    IdItem: row?.IdItem ?? row?.id_item ?? null,
    Nombre: row?.Nombre ?? row?.nombre ?? "",
    Descripcion: row?.Descripcion ?? row?.descripcion ?? "",
    CompatibilidadMarca: row?.CompatibilidadMarca ?? row?.compatibilidad_marca ?? row?.Marca ?? row?.marca ?? "",
    IdCategoria: row?.IdCategoria ?? row?.id_categoria ?? null,
    NombreCategoria: row?.NombreCategoria ?? row?.nombre_categoria ?? "",
    EsServicio: row?.EsServicio ?? row?.es_servicio ?? false,
    StockActual: row?.StockActual ?? row?.stock_actual ?? 0,
    StockMinimo: row?.StockMinimo ?? row?.stock_minimo ?? 0,
    ImagenUrl: row?.ImagenUrl ?? row?.imagen_url ?? null,
    Activo: row?.Activo ?? row?.activo ?? true,
  };
}

function resolveImagenUrl(value, variant) {
  return resolveImageUrl(value, { apiBaseUrl: API_URL, variant });
}

function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function InventarioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.IdUsuario ?? user?.id_usuario ?? null;

  const [imgErrors, setImgErrors] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [categorias, setCategorias] = useState([]);
  const [itemsRaw, setItemsRaw] = useState([]);

  const [menuMode, setMenuMode] = useState("CATEGORIA"); // CATEGORIA | CLASIFICACION
  const [selectedCategoriaId, setSelectedCategoriaId] = useState("TODAS");
  const [selectedClasificacion, setSelectedClasificacion] = useState("TODAS");
  const [menuQuery, setMenuQuery] = useState("");

  const [q, setQ] = useState("");
  const [searchMode, setSearchMode] = useState("NOMBRE"); // NOMBRE | MARCA | ID
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [incluyeInactivos, setIncluyeInactivos] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState(null);
  const [stockEdits, setStockEdits] = useState({});
  const [comentarioAjuste, setComentarioAjuste] = useState("");
  const [isSavingStock, setIsSavingStock] = useState(false);

  const [zoomSrc, setZoomSrc] = useState(null);

  const [movsLoading, setMovsLoading] = useState(false);
  const [movsError, setMovsError] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  const catById = useMemo(() => {
    const map = new Map();
    (Array.isArray(categorias) ? categorias : []).forEach((c) => map.set(String(c.IdCategoria), c));
    return map;
  }, [categorias]);

  const clasificaciones = useMemo(() => {
    const set = new Set(
      (Array.isArray(categorias) ? categorias : [])
        .map((c) => (c?.Clasificacion ?? "").toString().trim())
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categorias]);

  const items = useMemo(() => {
    const list = (Array.isArray(itemsRaw) ? itemsRaw : []).map(normalizeItem);
    const query = q.trim().toLowerCase();

    const enriched = list.map((it) => {
      const cat = it.IdCategoria != null ? catById.get(String(it.IdCategoria)) : null;
      return {
        ...it,
        Clasificacion: (cat?.Clasificacion ?? "").toString(),
        NombreCategoria: it.NombreCategoria || (cat?.NombreCategoria ?? ""),
      };
    });

    return enriched
      .filter((it) => (incluyeInactivos ? true : Boolean(it.Activo)))
      .filter((it) => {
        if (menuMode === "CATEGORIA") {
          if (selectedCategoriaId === "TODAS") return true;
          return String(it.IdCategoria) === String(selectedCategoriaId);
        }

        if (selectedClasificacion === "TODAS") return true;
        return (it.Clasificacion ?? "").toString() === selectedClasificacion;
      })
      .filter((it) => {
        if (!query) return true;
        if (searchMode === "MARCA") {
          const marca = (it?.CompatibilidadMarca ?? "").toString().toLowerCase();
          return marca.includes(query);
        }
        if (searchMode === "ID") {
          const qId = query.replace(/\D/g, "");
          if (!qId) return false;
          return String(it?.IdItem ?? "").includes(qId);
        }

        const name = (it?.Nombre ?? "").toString().toLowerCase();
        const desc = (it?.Descripcion ?? "").toString().toLowerCase();
        return name.includes(query) || desc.includes(query);
      })
      .filter((it) => {
        if (!soloAlertas) return true;
        if (it.EsServicio) return false;
        return toNumber(it.StockActual, 0) <= toNumber(it.StockMinimo, 0);
      });
  }, [itemsRaw, q, searchMode, menuMode, selectedCategoriaId, selectedClasificacion, soloAlertas, incluyeInactivos, catById]);

  const selectedItem = useMemo(
    () => items.find((it) => String(it.IdItem) === String(selectedItemId)) || null,
    [items, selectedItemId]
  );

  const counts = useMemo(() => {
    let alertas = 0;
    let servicios = 0;
    for (const it of items) {
      if (it.EsServicio) {
        servicios++;
        continue;
      }
      if (toNumber(it.StockActual, 0) <= toNumber(it.StockMinimo, 0)) alertas++;
    }
    return { total: items.length, alertas, servicios };
  }, [items]);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [cats, its] = await Promise.all([categoriaService.getCategorias(), itemsService.getItems({ incluyeInactivos: true })]);
      setCategorias((Array.isArray(cats) ? cats : []).map(normalizeCategoria));
      setItemsRaw(Array.isArray(its) ? its : []);
    } catch (e) {
      setError(e?.message || "Error cargando inventario");
      setCategorias([]);
      setItemsRaw([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMovimientosForItem(idItem) {
    if (!idItem) return;
    setMovsLoading(true);
    setMovsError(null);
    try {
      const res = await inventarioService.getMovimientos({ idItem, limit: 200 });
      setMovimientos(Array.isArray(res) ? res : []);
    } catch (e) {
      setMovsError(e?.message || "Error cargando movimientos");
      setMovimientos([]);
    } finally {
      setMovsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelectedCategoriaId("TODAS");
    setSelectedClasificacion("TODAS");
    setMenuQuery("");
  }, [menuMode]);

  const categoriasFiltradas = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    const list = Array.isArray(categorias) ? categorias : [];
    if (!query) return list;
    return list.filter((c) => {
      const name = (c?.NombreCategoria ?? "").toString().toLowerCase();
      const cl = (c?.Clasificacion ?? "").toString().toLowerCase();
      return name.includes(query) || cl.includes(query);
    });
  }, [categorias, menuQuery]);

  const clasificacionesFiltradas = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) return clasificaciones;
    return (Array.isArray(clasificaciones) ? clasificaciones : []).filter((cl) =>
      String(cl || "")
        .toLowerCase()
        .includes(query)
    );
  }, [clasificaciones, menuQuery]);

  useEffect(() => {
    if (selectedItemId) loadMovimientosForItem(selectedItemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);

  function openItem(it) {
    setSelectedItemId(it.IdItem);
    setStockEdits((s) => {
      if (s[String(it.IdItem)] !== undefined) return s;
      return { ...s, [String(it.IdItem)]: String(it.StockActual ?? 0) };
    });
    setComentarioAjuste("");
  }

  async function saveStockAbsolute(idItem, nuevoStockActual) {
    if (!currentUserId) {
      setError("No se encontró idUsuario en sesión.");
      return;
    }

    setIsSavingStock(true);
    setError(null);
    try {
      await inventarioService.ajustarStock({
        idItem,
        nuevoStockActual: Math.trunc(Number(nuevoStockActual)),
        idUsuario: currentUserId,
        comentario: comentarioAjuste,
      });

      await loadAll();
      await loadMovimientosForItem(idItem);
    } catch (e) {
      setError(e?.message || "Error ajustando stock");
    } finally {
      setIsSavingStock(false);
    }
  }

  async function quickDelta(idItem, delta) {
    const it = items.find((x) => String(x.IdItem) === String(idItem));
    if (!it) return;
    const next = Math.max(0, Math.trunc(toNumber(it.StockActual, 0) + delta));
    setStockEdits((s) => ({ ...s, [String(idItem)]: String(next) }));
    await saveStockAbsolute(idItem, next);
  }

  return (
    <div className="invPage grid gap-4">
      <div className="jmg-toolbar flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Inventario</h1>
          <div className="text-sm text-slate-500">Alertas por stock mínimo, ajustes y movimientos</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            onClick={loadAll}
            disabled={isLoading}
          >
            Recargar
          </button>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
            <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} />
            <span>Solo alertas</span>
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={incluyeInactivos}
              onChange={(e) => setIncluyeInactivos(e.target.checked)}
            />
            <span>Incluir inactivos</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <section className="jmg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-slate-800">Filtros</h2>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              {counts.alertas} alertas
            </span>
          </div>

          <div className="mb-3 inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white">
            <button
              type="button"
              className={
                menuMode === "CATEGORIA"
                  ? "border-r border-slate-300 bg-[color:var(--jmg-navy)] px-3 py-2 text-xs font-semibold text-blue-50"
                  : "border-r border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              }
              onClick={() => setMenuMode("CATEGORIA")}
            >
              Categorías
            </button>
            <button
              type="button"
              className={
                menuMode === "CLASIFICACION"
                  ? "bg-[color:var(--jmg-navy)] px-3 py-2 text-xs font-semibold text-blue-50"
                  : "bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              }
              onClick={() => setMenuMode("CLASIFICACION")}
            >
              Clasificación
            </button>
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchMode === "ID" ? "Buscar por ID" : "Buscar item"}
              inputMode={searchMode === "ID" ? "numeric" : "text"}
            />

            <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white">
              {[
                { key: "NOMBRE", label: "Nombre" },
                { key: "MARCA", label: "Marca" },
                { key: "ID", label: "ID" },
              ].map((modeOpt) => (
                <button
                  key={modeOpt.key}
                  type="button"
                  className={
                    searchMode === modeOpt.key
                      ? "border-r border-slate-300 bg-[color:var(--jmg-navy)] px-3 py-1.5 text-xs font-semibold text-blue-50 last:border-r-0"
                      : "border-r border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 last:border-r-0"
                  }
                  onClick={() => setSearchMode(modeOpt.key)}
                >
                  {modeOpt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder={menuMode === "CATEGORIA" ? "Buscar categoría" : "Buscar clasificación"}
            />

            <div className="max-h-[320px] space-y-1 overflow-auto pr-1">
              <button
                type="button"
                className={
                  (menuMode === "CATEGORIA" && selectedCategoriaId === "TODAS") ||
                  (menuMode === "CLASIFICACION" && selectedClasificacion === "TODAS")
                    ? "w-full rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[color:var(--jmg-navy)] px-3 py-2 text-left text-sm font-semibold text-blue-50"
                    : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                }
                onClick={() => {
                  if (menuMode === "CATEGORIA") setSelectedCategoriaId("TODAS");
                  else setSelectedClasificacion("TODAS");
                }}
              >
                Todas
              </button>

              {menuMode === "CATEGORIA"
                ? categoriasFiltradas
                    .slice()
                    .sort((a, b) => (a?.NombreCategoria ?? "").localeCompare(b?.NombreCategoria ?? ""))
                    .map((c) => {
                      const active = String(selectedCategoriaId) === String(c.IdCategoria);
                      return (
                        <button
                          key={c.IdCategoria}
                          type="button"
                          className={
                            active
                              ? "w-full rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[color:var(--jmg-navy)] px-3 py-2 text-left text-sm font-semibold text-blue-50"
                              : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          }
                          onClick={() => setSelectedCategoriaId(c.IdCategoria)}
                        >
                          <div>{c.NombreCategoria}</div>
                          {c?.Clasificacion ? (
                            <div className={active ? "text-xs text-slate-200" : "text-xs text-slate-500"}>{c.Clasificacion}</div>
                          ) : null}
                        </button>
                      );
                    })
                : clasificacionesFiltradas.map((cl) => {
                    const active = selectedClasificacion === cl;
                    return (
                      <button
                        key={cl}
                        type="button"
                        className={
                          active
                            ? "w-full rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[color:var(--jmg-navy)] px-3 py-2 text-left text-sm font-semibold text-blue-50"
                            : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        }
                        onClick={() => setSelectedClasificacion(cl)}
                      >
                        {cl}
                      </button>
                    );
                  })}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <div>
              <strong>{counts.total}</strong> items filtrados
            </div>
            <div>
              <strong>{counts.servicios}</strong> servicios
            </div>
          </div>

          {isLoading ? <div className="mt-2 text-sm text-slate-500">Cargando...</div> : null}
          {error ? <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        </section>

        <div className="grid gap-4">
          <section className="jmg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-slate-800">Items</h2>
              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{items.length}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {items.map((it) => {
                const stock = toNumber(it.StockActual, 0);
                const min = toNumber(it.StockMinimo, 0);
                const low = !it.EsServicio && stock <= min;
                const selected = String(it.IdItem) === String(selectedItemId);
                const imgSrc = resolveImagenUrl(it.ImagenUrl, IMAGE_VARIANTS.THUMB);
                const showImg = Boolean(imgSrc) && !imgErrors[String(it.IdItem)];

                return (
                  <button
                    key={it.IdItem}
                    type="button"
                    className={
                      selected
                        ? "group overflow-hidden rounded-2xl border border-[color:var(--jmg-navy)]/45 bg-[linear-gradient(145deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.95)_100%)] text-left shadow-md"
                        : low
                          ? "group overflow-hidden rounded-2xl border border-rose-300 bg-white text-left shadow-sm hover:-translate-y-0.5"
                          : "group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm hover:-translate-y-0.5"
                    }
                    onClick={() => openItem(it)}
                  >
                    <div className={selected ? "flex h-32 items-center justify-center border-b border-slate-500/40 bg-slate-600/40" : "flex h-32 items-center justify-center border-b border-slate-200 bg-slate-50"}>
                      {showImg ? (
                        <img
                          className="h-full w-full object-cover"
                          src={imgSrc}
                          alt={it.Nombre}
                          loading="lazy"
                          decoding="async"
                          onError={() => setImgErrors((s) => ({ ...s, [String(it.IdItem)]: true }))}
                        />
                      ) : (
                        <div className={selected ? "text-sm font-semibold text-slate-200" : "text-sm font-semibold text-slate-500"}>Sin imagen</div>
                      )}
                    </div>

                    <div className="grid gap-1 p-3">
                      <div className={selected ? "line-clamp-2 min-h-[2.6rem] text-sm font-semibold text-slate-50" : "line-clamp-2 min-h-[2.6rem] text-sm font-semibold text-slate-800"}>{it.Nombre}</div>
                      <div className={selected ? "text-xs text-slate-200" : "text-xs text-slate-500"}>
                        #{it.IdItem} · {it.NombreCategoria || "Sin categoría"}
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        {it.EsServicio ? (
                          <span className={selected ? "rounded-full border border-sky-300/60 bg-sky-400/20 px-2 py-0.5 text-[11px] font-semibold text-sky-100" : "rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700"}>Servicio</span>
                        ) : low ? (
                          <span className={selected ? "rounded-full border border-rose-300/60 bg-rose-400/20 px-2 py-0.5 text-[11px] font-semibold text-rose-100" : "rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700"}>Stock bajo</span>
                        ) : (
                          <span className={selected ? "rounded-full border border-emerald-300/60 bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-100" : "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"}>Stock OK</span>
                        )}

                        {!it.EsServicio ? (
                          <span className={selected ? "text-xs font-semibold text-slate-100" : "text-xs font-semibold text-slate-600"}>Stock {stock} · Min {min}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!isLoading && items.length === 0 ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">Sin items para estos filtros.</div>
            ) : null}
          </section>

          <section className="jmg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-slate-800">Ajuste y movimientos</h2>
              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                {selectedItem ? `#${selectedItem.IdItem}` : "Selecciona item"}
              </span>
            </div>

            {!selectedItem ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Selecciona un item para ver/ajustar stock y revisar movimientos.
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[190px_1fr]">
                  <button
                    type="button"
                    className="grid h-[190px] w-full place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white"
                    onClick={() => {
                      const src = resolveImagenUrl(selectedItem.ImagenUrl, IMAGE_VARIANTS.ZOOM);
                      if (src) setZoomSrc(src);
                    }}
                    disabled={!selectedItem.ImagenUrl || imgErrors[String(selectedItem.IdItem)]}
                    title={selectedItem.ImagenUrl ? "Click para ampliar" : "Sin imagen"}
                  >
                    {selectedItem.ImagenUrl && !imgErrors[String(selectedItem.IdItem)] ? (
                      <img
                        src={resolveImagenUrl(selectedItem.ImagenUrl, IMAGE_VARIANTS.PREVIEW)}
                        alt={selectedItem.Nombre}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                        onError={() => setImgErrors((s) => ({ ...s, [String(selectedItem.IdItem)]: true }))}
                      />
                    ) : (
                      <div className="text-sm font-semibold text-slate-500">Sin imagen</div>
                    )}
                  </button>

                  <div className="grid gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-slate-800">{selectedItem.Nombre}</h3>
                        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">#{selectedItem.IdItem}</span>
                      </div>
                      <div className="text-sm text-slate-500">
                        {selectedItem.NombreCategoria}
                        {selectedItem.Clasificacion ? ` · ${selectedItem.Clasificacion}` : ""}
                        {selectedItem.CompatibilidadMarca ? ` · ${selectedItem.CompatibilidadMarca}` : ""}
                      </div>
                      <button
                        type="button"
                        className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={() => navigate(`/reportes?itemId=${encodeURIComponent(String(selectedItem.IdItem))}&range=7d`)}
                        title="Ver reporte de ventas para este producto"
                      >
                        Ver reportes
                      </button>
                    </div>

                    {!selectedItem.EsServicio ? (
                      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Nuevo stock
                            <input
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                              value={stockEdits[String(selectedItem.IdItem)] ?? String(selectedItem.StockActual ?? 0)}
                              onChange={(e) => setStockEdits((s) => ({ ...s, [String(selectedItem.IdItem)]: e.target.value }))}
                              inputMode="numeric"
                            />
                          </label>

                          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Comentario
                            <input
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                              value={comentarioAjuste}
                              onChange={(e) => setComentarioAjuste(e.target.value)}
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => quickDelta(selectedItem.IdItem, -1)}
                            disabled={isSavingStock}
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => quickDelta(selectedItem.IdItem, +1)}
                            disabled={isSavingStock}
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-[color:var(--jmg-navy)]/40 bg-[linear-gradient(145deg,rgba(7,27,74,0.98)_0%,rgba(31,88,214,0.95)_100%)] px-3 py-2 text-sm font-semibold text-slate-50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
                            onClick={() =>
                              saveStockAbsolute(
                                selectedItem.IdItem,
                                toNumber(stockEdits[String(selectedItem.IdItem)], selectedItem.StockActual)
                              )
                            }
                            disabled={isSavingStock}
                          >
                            {isSavingStock ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">Es servicio: no maneja stock.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <strong className="text-sm text-slate-700">Movimientos</strong>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      onClick={() => loadMovimientosForItem(selectedItem.IdItem)}
                      disabled={movsLoading}
                    >
                      Recargar
                    </button>
                  </div>

                  {movsLoading ? <div className="text-sm text-slate-500">Cargando movimientos...</div> : null}
                  {movsError ? <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{movsError}</div> : null}

                  <div className="overflow-auto rounded-xl border border-slate-200">
                    <table className="min-w-[760px] w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-2 py-2 text-left font-semibold text-slate-600">Fecha</th>
                          <th className="px-2 py-2 text-left font-semibold text-slate-600">Tipo</th>
                          <th className="px-2 py-2 text-right font-semibold text-slate-600">Cant.</th>
                          <th className="px-2 py-2 text-left font-semibold text-slate-600">Usuario</th>
                          <th className="px-2 py-2 text-left font-semibold text-slate-600">Comentario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!movsLoading && movimientos.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-2 py-6 text-center text-sm text-slate-500">Sin movimientos.</td>
                          </tr>
                        ) : null}

                        {movimientos.map((m) => (
                          <tr key={m.id_movimiento} className="border-t border-slate-100">
                            <td className="px-2 py-2 text-slate-600">{formatDateTime(m.fecha)}</td>
                            <td className="px-2 py-2 text-slate-700">{m.tipo_movimiento}</td>
                            <td className="px-2 py-2 text-right font-semibold text-slate-700">{m.cantidad}</td>
                            <td className="px-2 py-2 text-slate-600">{m.usuario || "-"}</td>
                            <td className="px-2 py-2 text-slate-600">{m.comentario || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {zoomSrc ? (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" onClick={() => setZoomSrc(null)}>
          <div className="relative grid h-[78vh] w-[min(980px,96vw)] overflow-hidden rounded-2xl border border-white/20 bg-white" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute right-3 top-3 h-10 w-10 rounded-xl border border-slate-300 bg-white text-lg font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => setZoomSrc(null)}
              aria-label="Cerrar"
              title="Cerrar"
            >
              x
            </button>
            <img className="h-full w-full object-contain" src={zoomSrc} alt="Imagen del item" decoding="async" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
