import { useEffect, useMemo, useRef, useState } from "react";
import { itemsService } from "../../services/items.service";
import { categoriaService } from "../../services/categoria.service";
import { API_URL } from "../../services/api";

import "./ItemsPage.css";

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0.00";
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function toImageUrl(imagenUrl) {
  if (!imagenUrl) return null;
  try {
    return new URL(imagenUrl, API_URL).toString();
  } catch {
    return null;
  }
}

function normalizeCategoria(row) {
  return {
    IdCategoria: row?.IdCategoria ?? row?.id_categoria ?? null,
    NombreCategoria: row?.NombreCategoria ?? row?.nombre ?? row?.Nombre ?? "",
    Clasificacion: row?.Clasificacion ?? row?.clasificacion ?? "",
  };
}

function emptyForm() {
  return {
    IdItem: null,
    Nombre: "",
    Descripcion: "",
    IdCategoria: "",
    PrecioVenta: "",
    CostoReferencia: "",
    EsServicio: false,
    StockActual: "",
    StockMinimo: "",
    CompatibilidadMarca: "",
    TipoChip: "",
    Frecuencia: "",
    Activo: true,
    ImagenUrl: null,
  };
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function pickComparableForm(form) {
  return {
    Nombre: form?.Nombre ?? "",
    Descripcion: form?.Descripcion ?? "",
    IdCategoria: String(form?.IdCategoria ?? ""),
    PrecioVenta: String(form?.PrecioVenta ?? ""),
    CostoReferencia: String(form?.CostoReferencia ?? ""),
    EsServicio: Boolean(form?.EsServicio),
    StockActual: String(form?.StockActual ?? ""),
    StockMinimo: String(form?.StockMinimo ?? ""),
    CompatibilidadMarca: form?.CompatibilidadMarca ?? "",
    TipoChip: form?.TipoChip ?? "",
    Frecuencia: form?.Frecuencia ?? "",
    Activo: Boolean(form?.Activo),
    ImagenUrl: form?.ImagenUrl ?? null,
  };
}

export default function ItemsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [q, setQ] = useState("");
  const [searchMode, setSearchMode] = useState("NOMBRE"); // NOMBRE | MARCA | CLASIFICACION
  const [categoriaId, setCategoriaId] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("ACTIVOS"); // ACTIVOS | TODOS | INACTIVOS

  const [sortKey, setSortKey] = useState("NOMBRE"); // NOMBRE | PRECIO | STOCK
  const [sortDir, setSortDir] = useState("ASC"); // ASC | DESC

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [form, setForm] = useState(() => emptyForm());
  const initialFormRef = useRef(pickComparableForm(emptyForm()));
  const [formError, setFormError] = useState(null);
  const [formStatus, setFormStatus] = useState({ type: "idle", message: "" });

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ type: "idle", message: "" });
  const [autoUploadOnCreate, setAutoUploadOnCreate] = useState(true);
  const [zoomSrc, setZoomSrc] = useState(null);

  const isEditing = Boolean(form?.IdItem);
  const incluyeInactivos = estadoFiltro !== "ACTIVOS";

  const isDirty = useMemo(() => {
    const current = pickComparableForm(form);
    const baseline = initialFormRef.current;
    return JSON.stringify(current) !== JSON.stringify(baseline);
  }, [form]);

  function confirmDiscardIfDirty() {
    if (!isDirty) return true;
    return window.confirm("Tienes cambios sin guardar. ¿Deseas descartarlos?");
  }

  function clearFilters() {
    setQ("");
    setSearchMode("NOMBRE");
    setCategoriaId("");
    setEstadoFiltro("ACTIVOS");
    setSortKey("NOMBRE");
    setSortDir("ASC");
    setPage(1);
  }

  function applyEstadoFilter(list) {
    const rows = Array.isArray(list) ? list : [];
    if (estadoFiltro === "INACTIVOS") return rows.filter((i) => i?.Activo === false);
    if (estadoFiltro === "TODOS") return rows;
    return rows.filter((i) => i?.Activo !== false);
  }

  async function loadInitial({ forceIncluyeInactivos } = {}) {
    setIsLoading(true);
    setError(null);
    try {
      const inc = forceIncluyeInactivos ?? incluyeInactivos;
      const [cats, its] = await Promise.all([
        categoriaService.getCategorias(),
        itemsService.getItems({ incluyeInactivos: inc }),
      ]);
      setCategorias((Array.isArray(cats) ? cats : []).map(normalizeCategoria));
      setItems(applyEstadoFilter(Array.isArray(its) ? its : []));
      setPage(1);
    } catch (e) {
      setError(e?.message || "Error cargando items");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Si hay categoría seleccionada, usamos ese endpoint (rápido y simple)
    // Caso contrario: según searchMode aplicamos búsqueda.
    let cancelled = false;

    async function run() {
      setError(null);

      const query = q.trim();
      if (categoriaId) {
        try {
          const its = await itemsService.getItemsPorCategoria(categoriaId, { incluyeInactivos });
          if (cancelled) return;
          const list = applyEstadoFilter(Array.isArray(its) ? its : []);
          if (query.length >= 2) {
            setItems(list.filter((i) => (i?.Nombre || "").toLowerCase().includes(query.toLowerCase())));
          } else {
            setItems(list);
          }
          setPage(1);
        } catch (e) {
          if (cancelled) return;
          setError(e?.message || "Error cargando items por categoría");
        }
        return;
      }

      if (query.length < 2) {
        // En vacío: usamos listado completo
        try {
          const its = await itemsService.getItems({ incluyeInactivos });
          if (cancelled) return;
          setItems(applyEstadoFilter(Array.isArray(its) ? its : []));
          setPage(1);
        } catch (e) {
          if (cancelled) return;
          setError(e?.message || "Error cargando items");
        }
        return;
      }

      try {
        let res;
        if (searchMode === "MARCA") {
          res = await itemsService.getItemsPorMarca(query, { incluyeInactivos });
        } else if (searchMode === "CLASIFICACION") {
          res = await itemsService.getItemsPorClasificacion(query, { incluyeInactivos });
        } else {
          res = await itemsService.buscarItems(query, { incluyeInactivos });
        }
        if (cancelled) return;
        setItems(applyEstadoFilter(Array.isArray(res) ? res : []));
        setPage(1);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Error buscando items");
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, searchMode, categoriaId, incluyeInactivos, estadoFiltro]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((i) => i?.IdItem === selectedId) || null;
  }, [items, selectedId]);

  const activeSelection = selectedItem || selectedSnapshot;

  useEffect(() => {
    if (!selectedItem) return;
    setSelectedSnapshot(selectedItem);
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
    setUploadStatus({ type: "idle", message: "" });

    const nextForm = {
      ...emptyForm(),
      ...selectedItem,
      // Asegura inputs controlados (evita que se “quede” el valor previo si viene undefined/null)
      Descripcion: selectedItem?.Descripcion ?? "",
      CompatibilidadMarca: selectedItem?.CompatibilidadMarca ?? "",
      TipoChip: selectedItem?.TipoChip ?? "",
      Frecuencia: selectedItem?.Frecuencia ?? "",
      IdCategoria: selectedItem?.IdCategoria ?? "",
      PrecioVenta: selectedItem?.PrecioVenta ?? "",
      CostoReferencia: selectedItem?.CostoReferencia ?? "",
      StockActual: selectedItem?.StockActual ?? "",
      StockMinimo: selectedItem?.StockMinimo ?? "",
      Activo: selectedItem?.Activo ?? true,
    };
    setForm(nextForm);
    initialFormRef.current = pickComparableForm(nextForm);
  }, [selectedItem]);

  function startCreate() {
    if (!confirmDiscardIfDirty()) return;
    setSelectedId(null);
    setSelectedSnapshot(null);
    setForm(emptyForm());
    initialFormRef.current = pickComparableForm(emptyForm());
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
    setUploadStatus({ type: "idle", message: "" });
    setUploadFile(null);
  }

  async function submitForm(e) {
    e?.preventDefault?.();
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });

    const payload = {
      Nombre: form.Nombre?.trim(),
      Descripcion: form.Descripcion?.trim() || null,
      IdCategoria: toNumber(form.IdCategoria, null),
      PrecioVenta: toNumber(form.PrecioVenta, null),
      CostoReferencia: toNumber(form.CostoReferencia, 0),
      EsServicio: Boolean(form.EsServicio),
      StockActual: toNumber(form.StockActual, 0),
      StockMinimo: toNumber(form.StockMinimo, 2),
      CompatibilidadMarca: form.CompatibilidadMarca?.trim() || null,
      TipoChip: form.TipoChip?.trim() || null,
      Frecuencia: form.Frecuencia?.trim() || null,
      Activo: Boolean(form.Activo),
    };

    if (!payload.Nombre || !payload.IdCategoria || payload.PrecioVenta == null) {
      setFormError("Nombre, Categoría y Precio de venta son obligatorios.");
      return;
    }

    try {
      setFormStatus({ type: "loading", message: isEditing ? "Guardando cambios…" : "Creando item…" });
      if (isEditing) {
        await itemsService.actualizarItem(form.IdItem, payload);
        setFormStatus({ type: "success", message: "Item actualizado." });
        initialFormRef.current = pickComparableForm({ ...form, ...payload });
      } else {
        const res = await itemsService.crearItem(payload);
        const newId = res?.insertId;
        setFormStatus({ type: "success", message: `Item creado${newId ? ` (#${newId})` : ""}.` });

        if (newId) {
          const nextForm = { ...form, ...payload, IdItem: newId, ImagenUrl: null, Activo: true };
          setForm(nextForm);
          initialFormRef.current = pickComparableForm(nextForm);
          setSelectedId(newId);
          setSelectedSnapshot({ ...nextForm, NombreCategoria: null });
          setUploadStatus({ type: "idle", message: "" });

          if (uploadFile && autoUploadOnCreate) {
            setUploadStatus({ type: "loading", message: "Subiendo imagen…" });
            try {
              const up = await itemsService.subirImagen(newId, uploadFile);
              const newImagenUrl = up?.result?.ImagenUrl || null;
              if (newImagenUrl) {
                setForm((s) => ({ ...s, ImagenUrl: newImagenUrl }));
                setSelectedSnapshot((s) => (s ? { ...s, ImagenUrl: newImagenUrl } : s));
              }
              setUploadStatus({ type: "success", message: "Imagen subida." });
              setUploadFile(null);
            } catch (uploadErr) {
              setUploadStatus({ type: "error", message: uploadErr?.message || "No se pudo subir imagen." });
            }
          }
        }
      }

      await loadInitial();
    } catch (err) {
      setFormStatus({ type: "error", message: err?.message || "No se pudo guardar." });
    }
  }

  async function handleDisable() {
    if (!form?.IdItem) return;
    const ok = window.confirm("¿Desactivar este item? (borrado lógico)");
    if (!ok) return;
    try {
      setFormStatus({ type: "loading", message: "Desactivando…" });
      await itemsService.eliminarItem(form.IdItem);
      setFormStatus({ type: "success", message: "Item desactivado." });
      setSelectedId(null);
      setForm(emptyForm());
      await loadInitial();
    } catch (e) {
      setFormStatus({ type: "error", message: e?.message || "No se pudo desactivar." });
    }
  }

  async function handleReactivate() {
    if (!form?.IdItem) return;
    const ok = window.confirm("¿Reactivar este item?");
    if (!ok) return;
    try {
      setFormStatus({ type: "loading", message: "Reactivando…" });
      await itemsService.actualizarItem(form.IdItem, { Activo: true });
      setFormStatus({ type: "success", message: "Item reactivado." });
      await loadInitial({ forceIncluyeInactivos: true });
    } catch (e) {
      setFormStatus({ type: "error", message: e?.message || "No se pudo reactivar." });
    }
  }

  async function handleDuplicate() {
    if (!form?.IdItem) return;
    const ok = window.confirm("¿Duplicar este item? (crea uno nuevo)");
    if (!ok) return;

    const payload = {
      Nombre: `${form.Nombre || "Item"} (copia)`,
      Descripcion: form.Descripcion?.trim() || null,
      IdCategoria: toNumber(form.IdCategoria, null),
      PrecioVenta: toNumber(form.PrecioVenta, null),
      CostoReferencia: toNumber(form.CostoReferencia, 0),
      EsServicio: Boolean(form.EsServicio),
      StockActual: toNumber(form.StockActual, 0),
      StockMinimo: toNumber(form.StockMinimo, 2),
      CompatibilidadMarca: form.CompatibilidadMarca?.trim() || null,
      TipoChip: form.TipoChip?.trim() || null,
      Frecuencia: form.Frecuencia?.trim() || null,
      Activo: true,
    };

    if (!payload.IdCategoria || payload.PrecioVenta == null) {
      setFormStatus({ type: "error", message: "Para duplicar, completa Categoría y Precio." });
      return;
    }

    try {
      setFormStatus({ type: "loading", message: "Duplicando…" });
      const res = await itemsService.crearItem(payload);
      const newId = res?.insertId;
      setFormStatus({ type: "success", message: `Item duplicado${newId ? ` (#${newId})` : ""}.` });
      await loadInitial({ forceIncluyeInactivos: incluyeInactivos });
      if (newId) setSelectedId(newId);
    } catch (e) {
      setFormStatus({ type: "error", message: e?.message || "No se pudo duplicar." });
    }
  }

  async function handleUploadImagen() {
    setUploadStatus({ type: "idle", message: "" });
    if (!form?.IdItem) {
      setUploadStatus({ type: "error", message: "Primero guarda el item para poder subir imagen." });
      return;
    }
    if (!uploadFile) {
      setUploadStatus({ type: "error", message: "Selecciona un archivo." });
      return;
    }
    try {
      setUploadStatus({ type: "loading", message: "Subiendo imagen…" });
      const res = await itemsService.subirImagen(form.IdItem, uploadFile);
      const newImagenUrl = res?.result?.ImagenUrl || null;
      if (newImagenUrl) {
        setForm((s) => ({ ...s, ImagenUrl: newImagenUrl }));
      }
      setUploadStatus({ type: "success", message: "Imagen subida." });
      setUploadFile(null);
      await loadInitial();
    } catch (e) {
      setUploadStatus({ type: "error", message: e?.message || "No se pudo subir imagen." });
    }
  }

  const sortedItems = useMemo(() => {
    const list = Array.isArray(items) ? [...items] : [];
    const dir = sortDir === "DESC" ? -1 : 1;
    list.sort((a, b) => {
      if (sortKey === "PRECIO") {
        return (Number(a?.PrecioVenta ?? 0) - Number(b?.PrecioVenta ?? 0)) * dir;
      }
      if (sortKey === "STOCK") {
        return (Number(a?.StockActual ?? 0) - Number(b?.StockActual ?? 0)) * dir;
      }
      const an = String(a?.Nombre ?? "").toLowerCase();
      const bn = String(b?.Nombre ?? "").toLowerCase();
      return an.localeCompare(bn) * dir;
    });
    return list;
  }, [items, sortKey, sortDir]);

  const pageInfo = useMemo(() => {
    const total = sortedItems.length;
    const size = Math.max(5, Math.min(100, Number(pageSize) || 15));
    const totalPages = Math.max(1, Math.ceil(total / size));
    const safePage = Math.max(1, Math.min(totalPages, page));
    const start = (safePage - 1) * size;
    const end = Math.min(total, start + size);
    return { total, size, totalPages, page: safePage, start, end };
  }, [sortedItems.length, pageSize, page]);

  const pagedItems = useMemo(() => sortedItems.slice(pageInfo.start, pageInfo.end), [sortedItems, pageInfo]);

  return (
    <div className="itemsPage">
      <div className="itemsTop">
        <div>
          <h1 className="itemsTitle">Items</h1>
          <div className="itemsSubtitle">Catálogo, filtros y subida de imágenes.</div>
        </div>
        <div className="itemsTopActions">
          <button type="button" className="ghost" onClick={clearFilters}>
            Limpiar filtros
          </button>
          <button type="button" className="ghost" onClick={loadInitial}>
            Refrescar
          </button>
          <button type="button" className="primary" onClick={startCreate}>
            + Nuevo item
          </button>
        </div>
      </div>

      {error ? <div className="status statusError">{error}</div> : null}
      {isLoading && !error ? <div className="status">Cargando…</div> : null}

      <div className="itemsGrid">
        <section className="panel">
          <div className="panelHead">
            <strong>Buscar / Filtrar</strong>
            <span className="pill" title="Mostrando / Total">{pageInfo.total}</span>
          </div>
          <div className="panelBody">
            <div className="segRow" aria-label="Estado">
              <button
                type="button"
                className={estadoFiltro === "ACTIVOS" ? "segButton segActive" : "segButton"}
                onClick={() => {
                  if (!confirmDiscardIfDirty()) return;
                  setEstadoFiltro("ACTIVOS");
                }}
              >
                Activos
              </button>
              <button
                type="button"
                className={estadoFiltro === "TODOS" ? "segButton segActive" : "segButton"}
                onClick={() => {
                  if (!confirmDiscardIfDirty()) return;
                  setEstadoFiltro("TODOS");
                }}
              >
                Todos
              </button>
              <button
                type="button"
                className={estadoFiltro === "INACTIVOS" ? "segButton segActive" : "segButton"}
                onClick={() => {
                  if (!confirmDiscardIfDirty()) return;
                  setEstadoFiltro("INACTIVOS");
                }}
              >
                Inactivos
              </button>
            </div>

            <div className="filters">
              <label className="field">
                <span>Modo</span>
                <select className="textInput" value={searchMode} onChange={(e) => setSearchMode(e.target.value)}>
                  <option value="NOMBRE">Nombre</option>
                  <option value="MARCA">Marca</option>
                  <option value="CLASIFICACION">Clasificación</option>
                </select>
              </label>

              <label className="field">
                <span>Búsqueda (mín. 2)</span>
                <input
                  className="textInput"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ej. chip, llave, Toyota…"
                />
              </label>

              <label className="field">
                <span>Categoría</span>
                <select className="textInput" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                  <option value="">Todas</option>
                  {categorias.map((c) => (
                    <option key={c.IdCategoria} value={c.IdCategoria}>
                      {c.NombreCategoria || "(sin nombre)"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Orden</span>
                <select
                  className="textInput"
                  value={`${sortKey}:${sortDir}`}
                  onChange={(e) => {
                    const [k, d] = String(e.target.value).split(":");
                    setSortKey(k);
                    setSortDir(d);
                    setPage(1);
                  }}
                >
                  <option value="NOMBRE:ASC">Nombre (A→Z)</option>
                  <option value="NOMBRE:DESC">Nombre (Z→A)</option>
                  <option value="PRECIO:ASC">Precio (menor→mayor)</option>
                  <option value="PRECIO:DESC">Precio (mayor→menor)</option>
                  <option value="STOCK:ASC">Stock (menor→mayor)</option>
                  <option value="STOCK:DESC">Stock (mayor→menor)</option>
                </select>
              </label>

              <label className="field">
                <span>Página</span>
                <select
                  className="textInput"
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </label>
            </div>

            <div className="hint">
              Mostrando {pageInfo.start + 1}-{pageInfo.end} de {pageInfo.total}.
              {isDirty ? " (cambios sin guardar)" : ""}
            </div>

            <div className="list">
              {pagedItems.length === 0 ? (
                <div className="hint">Sin resultados.</div>
              ) : (
                pagedItems.map((it) => {
                  const active = it?.IdItem === selectedId;
                  const img = toImageUrl(it?.ImagenUrl);
                  return (
                    <button
                      key={it.IdItem}
                      type="button"
                      className={active ? "row rowActive" : "row"}
                      onClick={() => {
                        if (!confirmDiscardIfDirty()) return;
                        setSelectedSnapshot(it);
                        setSelectedId(it.IdItem);
                      }}
                      title="Editar"
                    >
                      <div className="rowLeft">
                        <div className="thumb" aria-hidden="true">
                          {img ? <img src={img} alt="" /> : <span>IMG</span>}
                        </div>
                        <div className="rowMain">
                          <div className="rowTitle">{it.Nombre}</div>
                          <div className="rowSub">
                            {it.NombreCategoria ? `${it.NombreCategoria} · ` : ""}
                            {it.EsServicio ? "Servicio" : "Inventario"}
                            {!it.EsServicio ? ` · Stock: ${it.StockActual ?? "-"}` : ""}
                            {it.Activo === false ? " · Inactivo" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="rowRight">
                        <div className="rowPrice">{formatMoney(it.PrecioVenta)}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="pager">
              <button
                type="button"
                className="ghost"
                disabled={pageInfo.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ◀ Anterior
              </button>
              <div className="pagerInfo">
                Página {pageInfo.page} / {pageInfo.totalPages}
              </div>
              <button
                type="button"
                className="ghost"
                disabled={pageInfo.page >= pageInfo.totalPages}
                onClick={() => setPage((p) => Math.min(pageInfo.totalPages, p + 1))}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panelHead">
            <strong>{isEditing ? `Editar (#${form.IdItem})` : "Nuevo item"}</strong>
            <span className="pill">{isEditing ? "Edición" : "Alta"}</span>
          </div>
          <div className="panelBody">
            <form onSubmit={submitForm} className="form">
              <div className="formCols">
                <label className="field">
                  <span>Nombre *</span>
                  <input
                    className="textInput"
                    value={form.Nombre}
                    onChange={(e) => setForm((s) => ({ ...s, Nombre: e.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>Categoría *</span>
                  <select
                    className="textInput"
                    value={form.IdCategoria}
                    onChange={(e) => setForm((s) => ({ ...s, IdCategoria: e.target.value }))}
                  >
                    <option value="">Selecciona…</option>
                    {categorias.map((c) => (
                      <option key={c.IdCategoria} value={c.IdCategoria}>
                        {c.NombreCategoria || "(sin nombre)"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Precio venta *</span>
                  <input
                    className="textInput"
                    inputMode="decimal"
                    value={form.PrecioVenta}
                    onChange={(e) => setForm((s) => ({ ...s, PrecioVenta: e.target.value }))}
                    placeholder="0.00"
                  />
                </label>

                <label className="field">
                  <span>Costo ref.</span>
                  <input
                    className="textInput"
                    inputMode="decimal"
                    value={form.CostoReferencia}
                    onChange={(e) => setForm((s) => ({ ...s, CostoReferencia: e.target.value }))}
                    placeholder="0.00"
                  />
                </label>

                <label className="check fieldFull">
                  <input
                    type="checkbox"
                    checked={Boolean(form.EsServicio)}
                    onChange={(e) => setForm((s) => ({ ...s, EsServicio: e.target.checked }))}
                  />
                  <span>Es servicio (no descuenta stock)</span>
                </label>

                {!form.EsServicio ? (
                  <>
                    <label className="field">
                      <span>Stock actual</span>
                      <input
                        className="textInput"
                        inputMode="numeric"
                        value={form.StockActual}
                        onChange={(e) => setForm((s) => ({ ...s, StockActual: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Stock mínimo</span>
                      <input
                        className="textInput"
                        inputMode="numeric"
                        value={form.StockMinimo}
                        onChange={(e) => setForm((s) => ({ ...s, StockMinimo: e.target.value }))}
                      />
                    </label>
                  </>
                ) : null}

                <label className="field fieldFull">
                  <span>Descripción</span>
                  <input
                    className="textInput"
                    value={form.Descripcion}
                    onChange={(e) => setForm((s) => ({ ...s, Descripcion: e.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>Marca (compatibilidad)</span>
                  <input
                    className="textInput"
                    value={form.CompatibilidadMarca}
                    onChange={(e) => setForm((s) => ({ ...s, CompatibilidadMarca: e.target.value }))}
                    placeholder="Ej. Toyota, VW…"
                  />
                </label>

                <label className="field">
                  <span>Tipo chip</span>
                  <input
                    className="textInput"
                    value={form.TipoChip}
                    onChange={(e) => setForm((s) => ({ ...s, TipoChip: e.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>Frecuencia</span>
                  <input
                    className="textInput"
                    value={form.Frecuencia}
                    onChange={(e) => setForm((s) => ({ ...s, Frecuencia: e.target.value }))}
                    placeholder="Ej. 315MHz"
                  />
                </label>

                {isEditing ? (
                  <label className="check fieldFull">
                    <input
                      type="checkbox"
                      checked={Boolean(form.Activo)}
                      onChange={(e) => setForm((s) => ({ ...s, Activo: e.target.checked }))}
                    />
                    <span>Activo</span>
                  </label>
                ) : null}
              </div>

              {formError ? <div className="status statusError">{formError}</div> : null}
              {formStatus.type !== "idle" ? (
                <div
                  className={
                    formStatus.type === "error"
                      ? "status statusError"
                      : formStatus.type === "success"
                        ? "status statusSuccess"
                        : "status"
                  }
                >
                  {formStatus.message}
                </div>
              ) : null}

              <div className="actions">
                {isEditing ? (
                  <>
                    {form?.Activo === false ? (
                      <button type="button" className="primary" onClick={handleReactivate}>
                        Reactivar
                      </button>
                    ) : (
                      <button type="button" className="danger" onClick={handleDisable}>
                        Desactivar
                      </button>
                    )}
                    <button type="button" className="ghost" onClick={handleDuplicate}>
                      Duplicar
                    </button>
                  </>
                ) : null}
                <button type="submit" className="primary" disabled={formStatus.type === "loading"}>
                  {isEditing ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>

            <div className="divider" />

            <div className="upload">
              <div className="uploadHead">
                <strong>Imagen</strong>
                <span className="hint">Usa esto para probar la subida.</span>
              </div>

              <div className="uploadBody">
                <button
                  type="button"
                  className="preview"
                  onClick={() => {
                    const src = form?.ImagenUrl ? toImageUrl(form.ImagenUrl) : null;
                    if (src) setZoomSrc(src);
                  }}
                  disabled={!form?.ImagenUrl}
                  title={form?.ImagenUrl ? "Click para ampliar" : "Sin imagen"}
                >
                  {form?.ImagenUrl ? (
                    <img src={toImageUrl(form.ImagenUrl)} alt="Imagen del item" />
                  ) : (
                    <div className="previewEmpty">Sin imagen</div>
                  )}
                </button>

                <div className="uploadControls">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setUploadFile(e.target.files?.[0] || null);
                      setUploadStatus({ type: "idle", message: "" });
                    }}
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={handleUploadImagen}
                    disabled={uploadStatus.type === "loading"}
                  >
                    Subir imagen
                  </button>
                </div>

                {uploadFile ? (
                  <div className="hint">
                    Archivo: <strong>{uploadFile.name}</strong> {uploadFile.size ? `(${formatBytes(uploadFile.size)})` : ""}
                  </div>
                ) : null}

                {!isEditing ? (
                  <label className="check" style={{ marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(autoUploadOnCreate)}
                      onChange={(e) => setAutoUploadOnCreate(e.target.checked)}
                    />
                    <span>Auto-subir imagen al crear</span>
                  </label>
                ) : null}

                {uploadStatus.type !== "idle" ? (
                  <div
                    className={
                      uploadStatus.type === "error"
                        ? "status statusError"
                        : uploadStatus.type === "success"
                          ? "status statusSuccess"
                          : "status"
                    }
                  >
                    {uploadStatus.message}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      {zoomSrc ? (
        <div
          className="imgModal"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomSrc(null)}
        >
          <div className="imgModalInner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="imgModalClose"
              onClick={() => setZoomSrc(null)}
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>
            <img className="imgModalImg" src={zoomSrc} alt="Imagen del item" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
