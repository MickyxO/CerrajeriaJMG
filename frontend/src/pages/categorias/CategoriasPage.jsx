import { useEffect, useMemo, useRef, useState } from "react";
import { categoriaService } from "../../services/categoria.service";

import "./CategoriasPage.css";

function emptyForm() {
  return {
    IdCategoria: null,
    NombreCategoria: "",
    Clasificacion: "",
  };
}

function normalizeCategoria(row) {
  return {
    IdCategoria: row?.IdCategoria ?? row?.id_categoria ?? null,
    NombreCategoria: row?.NombreCategoria ?? row?.nombre ?? "",
    Clasificacion: row?.Clasificacion ?? row?.clasificacion ?? "",
  };
}

function pickComparable(form) {
  return {
    NombreCategoria: (form?.NombreCategoria ?? "").toString(),
    Clasificacion: (form?.Clasificacion ?? "").toString(),
  };
}

export default function CategoriasPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [allCategorias, setAllCategorias] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [q, setQ] = useState("");
  const [searchMode, setSearchMode] = useState("NOMBRE"); // NOMBRE | CLASIFICACION

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(() => emptyForm());
  const initialFormRef = useRef(pickComparable(emptyForm()));
  const [formStatus, setFormStatus] = useState({ type: "idle", message: "" });
  const [formError, setFormError] = useState(null);

  const isEditing = Boolean(form?.IdCategoria);

  const isDirty = useMemo(() => {
    const baseline = initialFormRef.current;
    const current = pickComparable(form);
    return JSON.stringify(current) !== JSON.stringify(baseline);
  }, [form]);

  function confirmDiscardIfDirty() {
    if (!isDirty) return true;
    return window.confirm("Tienes cambios sin guardar. ¿Deseas descartarlos?");
  }

  const clasificaciones = useMemo(() => {
    const set = new Set(
      (Array.isArray(allCategorias) ? allCategorias : [])
        .map((c) => (c?.Clasificacion ?? "").toString().trim())
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCategorias]);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await categoriaService.getCategorias();
      const list = (Array.isArray(res) ? res : []).map(normalizeCategoria);
      setAllCategorias(list);
      setCategorias(list);
    } catch (e) {
      setError(e?.message || "Error cargando categorías");
      setAllCategorias([]);
      setCategorias([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      const query = q.trim();

      if (query.length < 2) {
        setCategorias(allCategorias);
        return;
      }

      try {
        let res;
        if (searchMode === "CLASIFICACION") {
          res = await categoriaService.getCategoriasPorClasificacion(query);
        } else {
          res = await categoriaService.getCategoriaPorNombre(query);
        }

        if (cancelled) return;
        setCategorias((Array.isArray(res) ? res : []).map(normalizeCategoria));
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 404) {
          setCategorias([]);
          return;
        }
        setError(e?.message || "Error filtrando categorías");
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, searchMode, allCategorias]);

  const selectedCategoria = useMemo(() => {
    if (!selectedId) return null;
    return categorias.find((c) => c?.IdCategoria === selectedId) || allCategorias.find((c) => c?.IdCategoria === selectedId) || null;
  }, [selectedId, categorias, allCategorias]);

  useEffect(() => {
    if (!selectedCategoria) return;
    const nextForm = {
      IdCategoria: selectedCategoria.IdCategoria,
      NombreCategoria: selectedCategoria.NombreCategoria ?? "",
      Clasificacion: selectedCategoria.Clasificacion ?? "",
    };
    setForm(nextForm);
    initialFormRef.current = pickComparable(nextForm);
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
  }, [selectedCategoria]);

  function startCreate() {
    if (!confirmDiscardIfDirty()) return;
    setSelectedId(null);
    const fresh = emptyForm();
    setForm(fresh);
    initialFormRef.current = pickComparable(fresh);
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
  }

  function selectCategoria(cat) {
    if (!confirmDiscardIfDirty()) return;
    setSelectedId(cat?.IdCategoria ?? null);
  }

  async function onSubmit(e) {
    e?.preventDefault?.();
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });

    const nombre = (form?.NombreCategoria ?? "").toString().trim();
    const clasificacion = (form?.Clasificacion ?? "").toString().trim();

    if (!nombre) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    const payload = {
      NombreCategoria: nombre,
      ...(clasificacion ? { Clasificacion: clasificacion } : {}),
    };

    try {
      setFormStatus({ type: "loading", message: isEditing ? "Actualizando…" : "Creando…" });
      if (isEditing) {
        await categoriaService.actualizarCategoria(form.IdCategoria, payload);
      } else {
        await categoriaService.crearCategoria(payload);
      }
      await loadAll();
      setFormStatus({ type: "success", message: isEditing ? "Categoría actualizada." : "Categoría creada." });
      if (!isEditing) startCreate();
    } catch (e2) {
      setFormStatus({ type: "idle", message: "" });
      setFormError(e2?.message || "No se pudo guardar la categoría.");
    }
  }

  async function onDelete() {
    if (!isEditing) return;
    const ok = window.confirm("¿Eliminar esta categoría? Esta acción no se puede deshacer.");
    if (!ok) return;
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
    try {
      setFormStatus({ type: "loading", message: "Eliminando…" });
      await categoriaService.eliminarCategoria(form.IdCategoria);
      await loadAll();
      startCreate();
      setFormStatus({ type: "success", message: "Categoría eliminada." });
    } catch (e) {
      setFormStatus({ type: "idle", message: "" });
      setFormError(e?.message || "No se pudo eliminar la categoría.");
    }
  }

  return (
    <div className="catPage">
      <div className="catTop">
        <div>
          <h1 className="catTitle">Categorías</h1>
          <div className="catSubtitle">Organiza tu catálogo y facilita el POS.</div>
        </div>

        <div className="catTopActions">
          <button type="button" className="ghost" onClick={loadAll} disabled={isLoading}>
            Recargar
          </button>
          <button type="button" className="primary" onClick={startCreate}>
            Nueva
          </button>
        </div>
      </div>

      {error && <div className="status statusError">{error}</div>}

      <div className="catGrid">
        <section className="panel">
          <div className="panelHead">
            <strong>Listado</strong>
            <span className="pill">{categorias.length}</span>
          </div>

          <div className="panelBody">
            <div className="catFilterRow">
              <label className="field" style={{ margin: 0 }}>
                <span>Buscar</span>
                <input
                  className="textInput"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={searchMode === "CLASIFICACION" ? "Clasificación (mín 2 letras)…" : "Nombre (mín 2 letras)…"}
                />
              </label>

              <div>
                <div className="field" style={{ margin: 0 }}>
                  <span>Modo</span>
                  <div className="catMode">
                    <button
                      type="button"
                      className={searchMode === "NOMBRE" ? "catModeBtn catModeActive" : "catModeBtn"}
                      onClick={() => setSearchMode("NOMBRE")}
                    >
                      Nombre
                    </button>
                    <button
                      type="button"
                      className={searchMode === "CLASIFICACION" ? "catModeBtn catModeActive" : "catModeBtn"}
                      onClick={() => setSearchMode("CLASIFICACION")}
                    >
                      Clasificación
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="hint">Cargando…</div>
            ) : (
              <>
                <div className="catListMeta">
                  <div className="catCount">
                    {q.trim().length >= 2 ? "Resultados" : "Todas las categorías"}
                  </div>
                  <button type="button" className="ghost" onClick={() => setQ("")}
                  >
                    Limpiar
                  </button>
                </div>

                <div className="list">
                  {categorias.length === 0 ? (
                    <div className="hint">Sin resultados.</div>
                  ) : (
                    categorias.map((c) => (
                      <button
                        type="button"
                        key={c.IdCategoria}
                        className={selectedId === c.IdCategoria ? "row rowActive" : "row"}
                        onClick={() => selectCategoria(c)}
                      >
                        <div className="rowLeft">
                          <div className="rowMain">
                            <div className="rowTitle">{c.NombreCategoria}</div>
                            <div className="rowSub">{c.Clasificacion || "(sin clasificación)"}</div>
                          </div>
                        </div>
                        <div className="rowRight">
                          <div className="rowSub">#{c.IdCategoria}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHead">
            <strong>{isEditing ? "Editar" : "Nueva"}</strong>
            <span className="pill">Categoría</span>
          </div>

          <div className="panelBody">
            <form className="form" onSubmit={onSubmit}>
              <div className="formCols">
                <label className="field">
                  <span>Nombre</span>
                  <input
                    className="textInput"
                    value={form.NombreCategoria}
                    onChange={(e) => setForm((f) => ({ ...f, NombreCategoria: e.target.value }))}
                    placeholder="Ej. Llaves"
                  />
                </label>

                <label className="field">
                  <span>Clasificación</span>
                  <input
                    className="textInput"
                    list="cat-clasificaciones"
                    value={form.Clasificacion}
                    onChange={(e) => setForm((f) => ({ ...f, Clasificacion: e.target.value }))}
                    placeholder="Ej. Automotriz"
                  />
                  <datalist id="cat-clasificaciones">
                    {clasificaciones.map((cl) => (
                      <option key={cl} value={cl} />
                    ))}
                  </datalist>
                </label>
              </div>

              {formError && <div className="status statusError">{formError}</div>}
              {formStatus?.type === "success" && <div className="status statusSuccess">{formStatus.message}</div>}
              {formStatus?.type === "loading" && <div className="status">{formStatus.message}</div>}

              <div className="actions">
                {isEditing && (
                  <button type="button" className="ghost" onClick={startCreate}>
                    Cancelar
                  </button>
                )}
                {isEditing && (
                  <button type="button" className="danger" onClick={onDelete}>
                    Eliminar
                  </button>
                )}
                <button type="submit" className="primary" disabled={formStatus?.type === "loading"}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
