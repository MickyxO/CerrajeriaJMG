import { useEffect, useMemo, useState } from "react";

import { categoriaService } from "../../services/categoria.service";
import { itemsService } from "../../services/items.service";
import { inventarioService } from "../../services/inventario.service";
import { API_URL } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

import "./InventarioPage.css";

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

function resolveImagenUrl(value) {
  const raw = (value ?? "").toString().trim();
  if (!raw) return null;

  // Absolute URLs are used as-is.
  if (/^https?:\/\//i.test(raw)) return raw;

  // Backend saves paths like /uploads/items/<file>
  const normalized = raw.replace(/\\/g, "/");
  if (normalized.startsWith("/")) return `${API_URL}${normalized}`;
  return `${API_URL}/${normalized}`;
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

  const [q, setQ] = useState("");
  const [searchMode, setSearchMode] = useState("NOMBRE"); // NOMBRE | MARCA
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
    // Reset selections when switching menu modes
    setSelectedCategoriaId("TODAS");
    setSelectedClasificacion("TODAS");
  }, [menuMode]);

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
    <div className="invPage">
      <div className="invTop">
        <div>
          <h1 className="invTitle">Inventario</h1>
          <div className="invSubtitle">Alertas por stock mínimo, ajustes y movimientos</div>
        </div>

        <div className="invTopActions">
          <button type="button" className="invBtn" onClick={loadAll} disabled={isLoading}>
            Recargar
          </button>
          <label className="invToggle">
            <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} />
            <span>Solo alertas</span>
          </label>
          <label className="invToggle">
            <input
              type="checkbox"
              checked={incluyeInactivos}
              onChange={(e) => setIncluyeInactivos(e.target.checked)}
            />
            <span>Incluir inactivos</span>
          </label>
        </div>
      </div>

      <div className="invGrid">
        <div className="panel">
          <div className="panelHead">
            <strong>Filtros</strong>
            <span className="pill">{counts.alertas} alertas</span>
          </div>
          <div className="panelBody">
            <div className="invMode">
              <button
                type="button"
                className={menuMode === "CATEGORIA" ? "invModeBtn invModeActive" : "invModeBtn"}
                onClick={() => setMenuMode("CATEGORIA")}
              >
                Categorías
              </button>
              <button
                type="button"
                className={menuMode === "CLASIFICACION" ? "invModeBtn invModeActive" : "invModeBtn"}
                onClick={() => setMenuMode("CLASIFICACION")}
              >
                Clasificación
              </button>
            </div>

            <div className="invSearchRow">
              <label className="invField invFieldFull">
                <span>Buscar item</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, descripción o marca..." />
              </label>
            </div>

            <div className="invSearchMode" aria-label="Modo de búsqueda">
              <button
                type="button"
                className={searchMode === "NOMBRE" ? "invModeBtn invModeActive" : "invModeBtn"}
                onClick={() => setSearchMode("NOMBRE")}
                title="Buscar por nombre o descripción"
              >
                Nombre/Desc.
              </button>
              <button
                type="button"
                className={searchMode === "MARCA" ? "invModeBtn invModeActive" : "invModeBtn"}
                onClick={() => setSearchMode("MARCA")}
                title="Buscar por marca"
              >
                Marca
              </button>
            </div>

            {menuMode === "CATEGORIA" ? (
              <div className="invChips">
                <button
                  type="button"
                  className={selectedCategoriaId === "TODAS" ? "invChip invChipActive" : "invChip"}
                  onClick={() => setSelectedCategoriaId("TODAS")}
                >
                  Todas
                </button>
                {(Array.isArray(categorias) ? categorias : []).map((c) => (
                  <button
                    key={c.IdCategoria}
                    type="button"
                    className={
                      String(selectedCategoriaId) === String(c.IdCategoria) ? "invChip invChipActive" : "invChip"
                    }
                    onClick={() => setSelectedCategoriaId(c.IdCategoria)}
                  >
                    {c.NombreCategoria}
                  </button>
                ))}
              </div>
            ) : (
              <div className="invChips">
                <button
                  type="button"
                  className={selectedClasificacion === "TODAS" ? "invChip invChipActive" : "invChip"}
                  onClick={() => setSelectedClasificacion("TODAS")}
                >
                  Todas
                </button>
                {clasificaciones.map((cl) => (
                  <button
                    key={cl}
                    type="button"
                    className={selectedClasificacion === cl ? "invChip invChipActive" : "invChip"}
                    onClick={() => setSelectedClasificacion(cl)}
                  >
                    {cl}
                  </button>
                ))}
              </div>
            )}

            <div className="invMeta">
              <div>
                <strong>{counts.total}</strong> items (filtro)
              </div>
              <div>
                <strong>{counts.servicios}</strong> servicios
              </div>
            </div>

            {isLoading ? <div className="invLoading">Cargando...</div> : null}
            {error ? <div className="invError">{error}</div> : null}
          </div>
        </div>

        <div className="panel panelFull">
          <div className="panelHead">
            <strong>Items</strong>
            <span className="pill">{items.length}</span>
          </div>
          <div className="panelBody">
            <div className="invList">
              {items.map((it) => {
                const stock = toNumber(it.StockActual, 0);
                const min = toNumber(it.StockMinimo, 0);
                const low = !it.EsServicio && stock <= min;
                const selected = String(it.IdItem) === String(selectedItemId);
                const imgSrc = resolveImagenUrl(it.ImagenUrl);
                const showImg = Boolean(imgSrc) && !imgErrors[String(it.IdItem)];
                return (
                  <button
                    key={it.IdItem}
                    type="button"
                    className={
                      selected
                        ? low
                          ? "invRow invRowActive invRowLow"
                          : "invRow invRowActive"
                        : low
                          ? "invRow invRowLow"
                          : "invRow"
                    }
                    onClick={() => openItem(it)}
                  >
                    <div className="invImgWrap">
                      {showImg ? (
                        <img
                          className="invImg"
                          src={imgSrc}
                          alt={it.Nombre}
                          loading="lazy"
                          onError={() =>
                            setImgErrors((s) => ({ ...s, [String(it.IdItem)]: true }))
                          }
                        />
                      ) : (
                        <div className="invImg invImgPlaceholder">Sin imagen</div>
                      )}
                    </div>
                    <div className="invRowMain">
                      <div className="invRowName">{it.Nombre}</div>
                      <div className="invRowMeta">
                        {it.NombreCategoria ? `${it.NombreCategoria}` : ""}
                        {it.Clasificacion ? ` · ${it.Clasificacion}` : ""}
                        {!it.Activo ? " · Inactivo" : ""}
                      </div>
                    </div>
                    <div className="invRowRight">
                      {it.EsServicio ? (
                        <span className="invBadge invBadgeSvc">Servicio</span>
                      ) : low ? (
                        <span className="invBadge invBadgeLow">Bajo</span>
                      ) : (
                        <span className="invBadge invBadgeOk">OK</span>
                      )}
                      {!it.EsServicio ? (
                        <div className="invStock">
                          <strong>{stock}</strong>
                          <span>min {min}</span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
              {!isLoading && items.length === 0 ? <div className="invEmpty">Sin items.</div> : null}
            </div>
          </div>
        </div>

        <div className="panel panelFull">
          <div className="panelHead">
            <strong>Ajuste y movimientos</strong>
            <span className="pill">{selectedItem ? `#${selectedItem.IdItem}` : "Selecciona"}</span>
          </div>
          <div className="panelBody">
            {!selectedItem ? (
              <div className="invHint">Selecciona un item para ver/ajustar stock y ver movimientos.</div>
            ) : (
              <div className="invDetail">
                <div className="invDetailTop">
                  <div className="invDetailLeft">
                    <button
                      type="button"
                      className="invPreview"
                      onClick={() => {
                        const src = resolveImagenUrl(selectedItem.ImagenUrl);
                        if (src) setZoomSrc(src);
                      }}
                      disabled={!selectedItem.ImagenUrl || imgErrors[String(selectedItem.IdItem)]}
                      title={selectedItem.ImagenUrl ? "Click para ampliar" : "Sin imagen"}
                    >
                      {selectedItem.ImagenUrl && !imgErrors[String(selectedItem.IdItem)] ? (
                        <img
                          src={resolveImagenUrl(selectedItem.ImagenUrl)}
                          alt={selectedItem.Nombre}
                          loading="lazy"
                          onError={() =>
                            setImgErrors((s) => ({ ...s, [String(selectedItem.IdItem)]: true }))
                          }
                        />
                      ) : (
                        <div className="invPreviewEmpty">Sin imagen</div>
                      )}
                    </button>

                    <div>
                      <div className="invDetailName">{selectedItem.Nombre}</div>
                      <div className="invDetailMeta">
                        {selectedItem.NombreCategoria}
                        {selectedItem.Clasificacion ? ` · ${selectedItem.Clasificacion}` : ""}
                        {selectedItem.CompatibilidadMarca ? ` · ${selectedItem.CompatibilidadMarca}` : ""}
                      </div>
                    </div>
                  </div>

                  {!selectedItem.EsServicio ? (
                    <div className="invAdjust">
                      <label className="invField">
                        <span>Nuevo stock</span>
                        <input
                          value={stockEdits[String(selectedItem.IdItem)] ?? String(selectedItem.StockActual ?? 0)}
                          onChange={(e) =>
                            setStockEdits((s) => ({ ...s, [String(selectedItem.IdItem)]: e.target.value }))
                          }
                          inputMode="numeric"
                        />
                      </label>

                      <label className="invField invFieldWide">
                        <span>Comentario (opcional)</span>
                        <input value={comentarioAjuste} onChange={(e) => setComentarioAjuste(e.target.value)} />
                      </label>

                      <div className="invAdjustActions">
                        <button
                          type="button"
                          className="invBtn"
                          onClick={() => quickDelta(selectedItem.IdItem, -1)}
                          disabled={isSavingStock}
                          title="-1"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          className="invBtn"
                          onClick={() => quickDelta(selectedItem.IdItem, +1)}
                          disabled={isSavingStock}
                          title="+1"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          className="invBtnPrimary"
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
                    <div className="invHint">Es servicio: no maneja stock.</div>
                  )}
                </div>

                <div className="invMovs">
                  <div className="invMovsHead">
                    <strong>Movimientos</strong>
                    <button
                      type="button"
                      className="invBtn"
                      onClick={() => loadMovimientosForItem(selectedItem.IdItem)}
                      disabled={movsLoading}
                    >
                      Recargar
                    </button>
                  </div>

                  {movsLoading ? <div className="invLoading">Cargando movimientos...</div> : null}
                  {movsError ? <div className="invError">{movsError}</div> : null}

                  <div className="invTableWrap">
                    <table className="invTable">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th className="invRight">Cant.</th>
                          <th>Usuario</th>
                          <th>Comentario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!movsLoading && movimientos.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="invEmpty">Sin movimientos.</td>
                          </tr>
                        ) : null}
                        {movimientos.map((m) => (
                          <tr key={m.id_movimiento}>
                            <td>{formatDateTime(m.fecha)}</td>
                            <td>{m.tipo_movimiento}</td>
                            <td className="invRight">{m.cantidad}</td>
                            <td>{m.usuario || "-"}</td>
                            <td>{m.comentario || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {zoomSrc ? (
        <div className="invModal" role="dialog" aria-modal="true" onClick={() => setZoomSrc(null)}>
          <div className="invModalInner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="invModalClose"
              onClick={() => setZoomSrc(null)}
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>
            <img className="invModalImg" src={zoomSrc} alt="Imagen del item" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
