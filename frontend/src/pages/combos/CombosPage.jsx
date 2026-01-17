import { useEffect, useMemo, useRef, useState } from "react";
import { combosService } from "../../services/combos.service";
import { itemsService } from "../../services/items.service";

import "./CombosPage.css";

function emptyForm() {
  return {
    IdCombo: null,
    NombreCombo: "",
    PrecioSugerido: "",
    Items: [], // { IdItem, NombreItem, Cantidad }
  };
}

function normalizeCombo(row) {
  const items = row?.Items ?? row?.lista_items;
  return {
    IdCombo: row?.IdCombo ?? row?.id_combo ?? null,
    NombreCombo: row?.NombreCombo ?? row?.nombre_combo ?? "",
    PrecioSugerido: row?.PrecioSugerido ?? row?.precio_sugerido_combo ?? 0,
    Items: Array.isArray(items)
      ? items
          .filter(Boolean)
          .map((i) => ({
            IdItem: i?.IdItem ?? i?.id_item ?? null,
            NombreItem: i?.NombreItem ?? i?.nombre_item ?? "",
            Cantidad: i?.Cantidad ?? i?.cantidad_default ?? 1,
          }))
      : [],
  };
}

function pickComparable(form) {
  return {
    NombreCombo: (form?.NombreCombo ?? "").toString(),
    PrecioSugerido: (form?.PrecioSugerido ?? "").toString(),
    Items: (Array.isArray(form?.Items) ? form.Items : []).map((i) => ({
      IdItem: i?.IdItem ?? null,
      Cantidad: Number(i?.Cantidad ?? 1),
    })),
  };
}

function formatMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0.00";
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export default function CombosPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [combos, setCombos] = useState([]);
  const [q, setQ] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(() => emptyForm());
  const initialFormRef = useRef(pickComparable(emptyForm()));
  const [formStatus, setFormStatus] = useState({ type: "idle", message: "" });
  const [formError, setFormError] = useState(null);

  const [itemQ, setItemQ] = useState("");
  const [itemResults, setItemResults] = useState([]);
  const [isItemSearching, setIsItemSearching] = useState(false);

  const isEditing = Boolean(form?.IdCombo);

  const isDirty = useMemo(() => {
    const baseline = initialFormRef.current;
    const current = pickComparable(form);
    return JSON.stringify(current) !== JSON.stringify(baseline);
  }, [form]);

  function confirmDiscardIfDirty() {
    if (!isDirty) return true;
    return window.confirm("Tienes cambios sin guardar. ¿Deseas descartarlos?");
  }

  async function loadCombos({ keepSelected } = {}) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await combosService.getCombos();
      const list = (Array.isArray(res) ? res : []).map(normalizeCombo);
      setCombos(list);
      if (!keepSelected) setSelectedId(null);
    } catch (e) {
      setError(e?.message || "Error cargando combos");
      setCombos([]);
      if (!keepSelected) setSelectedId(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCombos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCombos = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return combos;
    return combos.filter((c) => (c?.NombreCombo || "").toLowerCase().includes(query));
  }, [q, combos]);

  const selectedCombo = useMemo(() => {
    if (!selectedId) return null;
    return combos.find((c) => c?.IdCombo === selectedId) || null;
  }, [selectedId, combos]);

  useEffect(() => {
    if (!selectedCombo) return;
    const nextForm = {
      IdCombo: selectedCombo.IdCombo,
      NombreCombo: selectedCombo.NombreCombo ?? "",
      PrecioSugerido: String(selectedCombo.PrecioSugerido ?? ""),
      Items: Array.isArray(selectedCombo.Items)
        ? selectedCombo.Items.map((i) => ({
            IdItem: i?.IdItem,
            NombreItem: i?.NombreItem ?? "",
            Cantidad: Number(i?.Cantidad ?? 1),
          }))
        : [],
    };
    setForm(nextForm);
    initialFormRef.current = pickComparable(nextForm);
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
    setItemQ("");
    setItemResults([]);
  }, [selectedCombo]);

  function startCreate() {
    if (!confirmDiscardIfDirty()) return;
    setSelectedId(null);
    const fresh = emptyForm();
    setForm(fresh);
    initialFormRef.current = pickComparable(fresh);
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
    setItemQ("");
    setItemResults([]);
  }

  function selectCombo(combo) {
    if (!confirmDiscardIfDirty()) return;
    setSelectedId(combo?.IdCombo ?? null);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const query = itemQ.trim();
      if (query.length < 2) {
        setItemResults([]);
        setIsItemSearching(false);
        return;
      }

      setIsItemSearching(true);
      try {
        const res = await itemsService.buscarItems(query);
        if (cancelled) return;
        setItemResults(Array.isArray(res) ? res : []);
      } catch {
        if (cancelled) return;
        setItemResults([]);
      } finally {
        if (!cancelled) setIsItemSearching(false);
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [itemQ]);

  function addItemToCombo(item) {
    const id = item?.IdItem;
    if (!id) return;
    setForm((prev) => {
      const current = Array.isArray(prev.Items) ? prev.Items : [];
      const idx = current.findIndex((i) => i?.IdItem === id);
      if (idx >= 0) {
        const next = current.slice();
        next[idx] = { ...next[idx], Cantidad: Number(next[idx]?.Cantidad ?? 1) + 1 };
        return { ...prev, Items: next };
      }
      return {
        ...prev,
        Items: [
          ...current,
          {
            IdItem: id,
            NombreItem: item?.Nombre ?? item?.NombreItem ?? "Item",
            Cantidad: 1,
          },
        ],
      };
    });
  }

  function setItemCantidad(idItem, cantidad) {
    setForm((prev) => {
      const current = Array.isArray(prev.Items) ? prev.Items : [];
      const next = current.map((i) => {
        if (i?.IdItem !== idItem) return i;
        return { ...i, Cantidad: cantidad };
      });
      return { ...prev, Items: next };
    });
  }

  function removeItemFromCombo(idItem) {
    setForm((prev) => {
      const current = Array.isArray(prev.Items) ? prev.Items : [];
      return { ...prev, Items: current.filter((i) => i?.IdItem !== idItem) };
    });
  }

  async function onSubmit(e) {
    e?.preventDefault?.();
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });

    const nombre = (form?.NombreCombo ?? "").toString().trim();
    const precio = Number(form?.PrecioSugerido);
    if (!nombre) {
      setFormError("El nombre del combo es obligatorio.");
      return;
    }
    if (!Number.isFinite(precio)) {
      setFormError("El precio sugerido debe ser numérico.");
      return;
    }

    const itemsPayload = (Array.isArray(form?.Items) ? form.Items : [])
      .filter((i) => i?.IdItem)
      .map((i) => ({
        IdItem: i.IdItem,
        Cantidad: Number(i?.Cantidad ?? 1) || 1,
      }));

    try {
      setFormStatus({ type: "loading", message: isEditing ? "Actualizando…" : "Creando…" });
      if (isEditing) {
        await combosService.actualizarCombo(form.IdCombo, {
          NombreCombo: nombre,
          PrecioSugerido: precio,
          Items: itemsPayload,
        });
        await loadCombos({ keepSelected: true });
        setFormStatus({ type: "success", message: "Combo actualizado." });
      } else {
        const res = await combosService.crearCombo({
          NombreCombo: nombre,
          PrecioSugerido: precio,
          Items: itemsPayload,
        });
        const newId = res?.insertId;
        await loadCombos({ keepSelected: true });
        if (newId) setSelectedId(newId);
        setFormStatus({ type: "success", message: "Combo creado." });
      }
    } catch (e2) {
      setFormStatus({ type: "idle", message: "" });
      setFormError(e2?.message || "No se pudo guardar el combo.");
    }
  }

  async function onDelete() {
    if (!isEditing) return;
    const ok = window.confirm("¿Eliminar este combo? Esta acción no se puede deshacer.");
    if (!ok) return;

    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
    try {
      setFormStatus({ type: "loading", message: "Eliminando…" });
      await combosService.eliminarCombo(form.IdCombo);
      await loadCombos();
      startCreate();
      setFormStatus({ type: "success", message: "Combo eliminado." });
    } catch (e) {
      setFormStatus({ type: "idle", message: "" });
      setFormError(e?.message || "No se pudo eliminar el combo.");
    }
  }

  return (
    <div className="comboPage">
      <div className="comboTop">
        <div>
          <h1 className="comboTitle">Combos</h1>
          <div className="comboSubtitle">Crea paquetes con varios items para vender más rápido.</div>
        </div>

        <div className="comboTopActions">
          <button type="button" className="ghost" onClick={() => loadCombos()} disabled={isLoading}>
            Recargar
          </button>
          <button type="button" className="primary" onClick={startCreate}>
            Nuevo
          </button>
        </div>
      </div>

      {error && <div className="status statusError">{error}</div>}

      <div className="comboGrid">
        <section className="panel">
          <div className="panelHead">
            <strong>Listado</strong>
            <span className="pill">{filteredCombos.length}</span>
          </div>

          <div className="panelBody">
            <div className="comboFilterRow">
              <label className="field" style={{ margin: 0 }}>
                <span>Buscar</span>
                <input
                  className="textInput"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nombre del combo (mín 2 letras)…"
                />
              </label>
            </div>

            {isLoading ? (
              <div className="hint">Cargando…</div>
            ) : (
              <div className="list">
                {filteredCombos.length === 0 ? (
                  <div className="hint">Sin resultados.</div>
                ) : (
                  filteredCombos.map((c) => (
                    <button
                      type="button"
                      key={c.IdCombo}
                      className={selectedId === c.IdCombo ? "row rowActive" : "row"}
                      onClick={() => selectCombo(c)}
                    >
                      <div className="rowLeft">
                        <div className="rowMain">
                          <div className="rowTitle">{c.NombreCombo}</div>
                          <div className="rowSub">
                            {formatMoney(c.PrecioSugerido)} · {(c.Items?.length || 0)} items
                          </div>
                        </div>
                      </div>
                      <div className="rowRight">
                        <div className="rowSub">#{c.IdCombo}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHead">
            <strong>{isEditing ? "Editar" : "Nuevo"}</strong>
            <span className="pill">Combo</span>
          </div>

          <div className="panelBody">
            <form className="form" onSubmit={onSubmit}>
              <div className="formCols">
                <label className="field">
                  <span>Nombre</span>
                  <input
                    className="textInput"
                    value={form.NombreCombo}
                    onChange={(e) => setForm((f) => ({ ...f, NombreCombo: e.target.value }))}
                    placeholder="Ej. Paquete Llaves"
                  />
                </label>

                <label className="field">
                  <span>Precio sugerido</span>
                  <input
                    className="textInput"
                    value={form.PrecioSugerido}
                    onChange={(e) => setForm((f) => ({ ...f, PrecioSugerido: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <div className="comboBuilder">
                <div className="field" style={{ margin: 0 }}>
                  <span>Agregar items</span>
                  <input
                    className="textInput"
                    value={itemQ}
                    onChange={(e) => setItemQ(e.target.value)}
                    placeholder="Buscar item (mín 2 letras)…"
                  />
                </div>

                {isItemSearching && <div className="hint">Buscando items…</div>}

                {itemResults.length > 0 && (
                  <div className="comboSearchResults">
                    {itemResults.slice(0, 15).map((it) => (
                      <button
                        type="button"
                        key={`pick-${it.IdItem}`}
                        className="row"
                        onClick={() => addItemToCombo(it)}
                        title="Agregar al combo"
                      >
                        <div className="rowLeft">
                          <div className="rowMain">
                            <div className="rowTitle">{it.Nombre}</div>
                            <div className="rowSub">{it.NombreCategoria || ""}</div>
                          </div>
                        </div>
                        <div className="rowRight">
                          <div className="rowPrice">{formatMoney(it.PrecioVenta)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="divider" />

                <div className="field" style={{ margin: 0 }}>
                  <span>Items del combo</span>
                </div>

                <div className="comboItemsList">
                  {(form.Items?.length || 0) === 0 ? (
                    <div className="hint">Aún no agregas items.</div>
                  ) : (
                    form.Items.map((i) => (
                      <div key={`ci-${i.IdItem}`} className="comboItemRow">
                        <div>
                          <div className="comboItemTitle">{i.NombreItem || `Item #${i.IdItem}`}</div>
                          <div className="rowSub">IdItem: {i.IdItem}</div>
                        </div>
                        <input
                          className="comboQtyInput"
                          type="number"
                          min={1}
                          step={1}
                          value={Number(i.Cantidad ?? 1)}
                          onChange={(e) => setItemCantidad(i.IdItem, Math.max(1, Number(e.target.value) || 1))}
                        />
                        <button
                          type="button"
                          className="danger comboMini"
                          onClick={() => removeItemFromCombo(i.IdItem)}
                          title="Quitar"
                        >
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
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
