import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { itemsService } from "../../services/items.service";
import { categoriaService } from "../../services/categoria.service";
import { inventarioService } from "../../services/inventario.service";
import { API_URL } from "../../services/api";
import { resolveImageUrl } from "../../utils/image";
import { useAuth } from "../../hooks/useAuth";
import { useConfirmModal } from "../../hooks/useConfirmModal";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

function fmtMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return money.format(n);
}

function fmtDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function emptyItemForm() {
  return {
    IdItem: null,
    Nombre: "",
    Descripcion: "",
    IdCategoria: "",
    PrecioVenta: "",
    CostoReferencia: "",
    EsServicio: false,
    StockActual: "0",
    StockMinimo: "5",
    CompatibilidadMarca: "",
    TipoChip: "",
    Frecuencia: "",
    Activo: true,
    ImagenUrl: null,
    CodigoUbicacion: "",
    AlertaStock: true,
  };
}

function emptyCategoriaForm() {
  return {
    IdCategoria: null,
    NombreCategoria: "",
    Clasificacion: "Automotriz",
    ImagenUrl: null,
  };
}

export default function ItemsPage() {
  const { user } = useAuth();
  const userId = user?.IdUsuario ?? user?.id_usuario ?? 1;
  const { confirm, modal: confirmModal } = useConfirmModal();

  // Tabs: ITEMS | CATEGORIAS | KARDEX
  const [activeTab, setActiveTab] = useState("ITEMS");

  // Estado general
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Datos principales
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [movsLoading, setMovsLoading] = useState(false);

  // Filtros de Items
  const [q, setQ] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("TODAS");
  const [filtroStock, setFiltroStock] = useState("TODOS"); // TODOS | BAJO_STOCK | AGOTADOS | EN_STOCK
  const [filtroMacro, setFiltroMacro] = useState("TODAS"); // TODAS | Residencial | Automotriz | Accesorios | Servicios
  const [filtroEstado, setFiltroEstado] = useState("ACTIVOS"); // ACTIVOS | INACTIVOS | TODOS

  // Modal: Picker de Categorías (Cuadrícula con Buscador)
  const [showCatPickerModal, setShowCatPickerModal] = useState(false);
  const [catPickerSearch, setCatPickerSearch] = useState("");
  const [catPickerMacro, setCatPickerMacro] = useState("TODAS");

  // Modal: Edición / Creación de Item
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItemForm());
  const [itemFormError, setItemFormError] = useState(null);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState("");

  // Modal: Conteo Físico Rápido y Específico
  const [countModalItem, setCountModalItem] = useState(null);
  const [conteoFisico, setConteoFisico] = useState("");
  const [conteoMotivo, setConteoMotivo] = useState("Auditoría / Conteo Físico");
  const [conteoComentario, setConteoComentario] = useState("");
  const [isSavingCount, setIsSavingCount] = useState(false);
  const [countError, setCountError] = useState(null);

  // Modal: Categoría
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState(emptyCategoriaForm());
  const [catFormError, setCatFormError] = useState(null);
  const [isSavingCat, setIsSavingCat] = useState(false);

  // Zoom de Imagen
  const [zoomSrc, setZoomSrc] = useState(null);

  // Carga de datos
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        itemsService.getItems({ incluyeInactivos: true }),
        categoriaService.getCategorias(),
      ]);
      setItems(Array.isArray(itemsRes) ? itemsRes : []);
      setCategorias(Array.isArray(catsRes) ? catsRes : []);
    } catch (e) {
      setError(e?.message || "Error al cargar catálogo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMovimientos = useCallback(async () => {
    setMovsLoading(true);
    try {
      const res = await inventarioService.getMovimientos({ limit: 100 });
      setMovimientos(Array.isArray(res) ? res : []);
    } catch {
      setMovimientos([]);
    } finally {
      setMovsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (activeTab === "KARDEX") {
      loadMovimientos();
    }
  }, [activeTab, loadMovimientos]);

  // Normalizar clasificación
  function normalizeClasif(clasif) {
    if (!clasif) return "";
    const s = String(clasif).trim().toLowerCase();
    if (s.startsWith("auto")) return "Automotriz";
    if (s.startsWith("resid")) return "Residencial";
    if (s.startsWith("acce")) return "Accesorios";
    if (s.startsWith("serv")) return "Servicios";
    return String(clasif).trim();
  }

  // Mapa de categorías para acceso rápido (ID -> Nombre)
  const catMap = useMemo(() => {
    const map = new Map();
    categorias.forEach((c) => {
      const id = c.IdCategoria ?? c.id_categoria;
      map.set(String(id), c.NombreCategoria ?? c.nombre ?? "");
    });
    return map;
  }, [categorias]);

  // Mapa de categorías para clasificación (ID -> Clasificación)
  const catClasificacionMap = useMemo(() => {
    const map = new Map();
    categorias.forEach((c) => {
      const id = c.IdCategoria ?? c.id_categoria;
      map.set(String(id), normalizeClasif(c.Clasificacion ?? c.clasificacion));
    });
    return map;
  }, [categorias]);

  // Pre-calcular conteos por categoría, macro y estado
  const { countPorCategoria, countPorMacro, countPorEstado } = useMemo(() => {
    const catCounts = new Map();
    const macroCounts = {
      TODAS: 0,
      Residencial: 0,
      Automotriz: 0,
      Accesorios: 0,
      Servicios: 0,
    };
    const estadoCounts = {
      ACTIVOS: 0,
      INACTIVOS: 0,
      TODOS: 0,
    };

    items.forEach((it) => {
      const isActivo = Boolean(it.Activo);
      estadoCounts.TODOS++;
      if (isActivo) estadoCounts.ACTIVOS++;
      else estadoCounts.INACTIVOS++;

      // Conteo por categoría
      const catId = String(it.IdCategoria ?? "");
      catCounts.set(catId, (catCounts.get(catId) || 0) + 1);

      // Conteo por macro
      macroCounts.TODAS++;
      if (it.EsServicio) {
        macroCounts.Servicios++;
      } else {
        const catClasif = it.ClasificacionCategoria || catClasificacionMap.get(catId);
        const clasif = normalizeClasif(catClasif);
        if (clasif === "Residencial") macroCounts.Residencial++;
        else if (clasif === "Automotriz") macroCounts.Automotriz++;
        else if (clasif === "Accesorios") macroCounts.Accesorios++;
        else if (clasif === "Servicios") macroCounts.Servicios++;
      }
    });

    return {
      countPorCategoria: catCounts,
      countPorMacro: macroCounts,
      countPorEstado: estadoCounts,
    };
  }, [items, catClasificacionMap]);

  // Categorías filtradas para el modal picker
  const categoriasParaPicker = useMemo(() => {
    return categorias.filter((c) => {
      const name = (c.NombreCategoria ?? c.nombre ?? "").toLowerCase();
      const clasif = normalizeClasif(c.Clasificacion ?? c.clasificacion);
      const search = catPickerSearch.trim().toLowerCase();

      if (search) {
        const matchName = name.includes(search);
        const matchClasif = clasif.toLowerCase().includes(search);
        if (!matchName && !matchClasif) return false;
      }

      if (catPickerMacro !== "TODAS") {
        if (catPickerMacro === "Servicios" && clasif !== "Servicios") return false;
        if (catPickerMacro !== "Servicios" && clasif !== catPickerMacro) return false;
      }

      return true;
    });
  }, [categorias, catPickerSearch, catPickerMacro]);

  function handleSelectMacro(macro) {
    setFiltroMacro(macro);
    if (selectedCategoria !== "TODAS" && macro !== "TODAS") {
      const catClasif = catClasificacionMap.get(String(selectedCategoria));
      if (catClasif !== macro) {
        setSelectedCategoria("TODAS");
      }
    }
  }

  // Items filtrados
  const itemsFiltrados = useMemo(() => {
    return items.filter((it) => {
      // Estado: Activo / Inactivo / Todos
      if (filtroEstado === "ACTIVOS" && !it.Activo) return false;
      if (filtroEstado === "INACTIVOS" && it.Activo) return false;

      // Filtro Macro: TODAS | Residencial | Automotriz | Accesorios | Servicios
      if (filtroMacro !== "TODAS") {
        if (filtroMacro === "Servicios") {
          const catClasif = it.ClasificacionCategoria || catClasificacionMap.get(String(it.IdCategoria));
          const clasif = normalizeClasif(catClasif);
          if (!it.EsServicio && clasif !== "Servicios") return false;
        } else {
          if (it.EsServicio) return false;
          const catClasif = it.ClasificacionCategoria || catClasificacionMap.get(String(it.IdCategoria));
          const clasif = normalizeClasif(catClasif);
          if (clasif !== filtroMacro) return false;
        }
      }

      // Categoría
      if (selectedCategoria !== "TODAS" && String(it.IdCategoria) !== String(selectedCategoria)) {
        return false;
      }

      // Stock
      if (!it.EsServicio) {
        const actual = Number(it.StockActual ?? 0);
        const minimo = Number(it.StockMinimo ?? 0);
        const cuentaStock = Boolean(it.AlertaStock);
        if (filtroStock === "AGOTADOS" && (!cuentaStock || actual > 0)) return false;
        if (filtroStock === "BAJO_STOCK" && (!cuentaStock || actual > minimo || actual === 0)) return false;
        if (filtroStock === "EN_STOCK" && (!cuentaStock || actual <= minimo)) return false;
      }

      // Búsqueda por texto (nombre, marca, ubicación, id)
      if (q.trim()) {
        const term = q.trim().toLowerCase();
        const nombre = (it.Nombre ?? "").toLowerCase();
        const marca = (it.CompatibilidadMarca ?? "").toLowerCase();
        const ubi = (it.CodigoUbicacion ?? "").toLowerCase();
        const chip = (it.TipoChip ?? "").toLowerCase();
        const idStr = String(it.IdItem ?? "");
        return (
          nombre.includes(term) ||
          marca.includes(term) ||
          ubi.includes(term) ||
          chip.includes(term) ||
          idStr === term
        );
      }

      return true;
    });
  }, [items, filtroEstado, filtroMacro, catClasificacionMap, selectedCategoria, filtroStock, q]);

  // Métricas del catálogo
  const metricas = useMemo(() => {
    const totalItems = items.length;
    let piezasFisicas = 0;
    let agotados = 0;
    let alertasStock = 0;
    let servicios = 0;

    items.forEach((it) => {
      if (it.EsServicio) {
        servicios++;
      } else {
        const stock = Number(it.StockActual ?? 0);
        const min = Number(it.StockMinimo ?? 0);
        if (stock < 9000) {
          piezasFisicas += stock;
        }
        if (Boolean(it.AlertaStock)) {
          if (stock === 0) {
            agotados++;
          } else if (stock <= min) {
            alertasStock++;
          }
        }
      }
    });

    return { totalItems, piezasFisicas, agotados, alertasStock, servicios, totalCategorias: categorias.length };
  }, [items, categorias]);

  // -------------------------------------------------------------
  // ACCIONES DE CONTEO FÍSICO RÁPIDO Y ESPECÍFICO
  // -------------------------------------------------------------
  function openCountModal(item) {
    setCountModalItem(item);
    setConteoFisico(String(item.StockActual ?? 0));
    setConteoMotivo("Auditoría / Conteo Físico");
    setConteoComentario("");
    setCountError(null);
  }

  async function handleGuardarConteo() {
    if (!countModalItem) return;
    const n = Number(conteoFisico);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      setCountError("Ingresa un número entero válido (≥ 0).");
      return;
    }

    setIsSavingCount(true);
    setCountError(null);
    try {
      const stockAnterior = Number(countModalItem.StockActual ?? 0);
      const delta = n - stockAnterior;
      const motivoFinal = `${conteoMotivo}${conteoComentario.trim() ? ` · ${conteoComentario.trim()}` : ""}`;

      await inventarioService.ajustarStock({
        idItem: countModalItem.IdItem,
        nuevoStockActual: n,
        idUsuario: userId,
        comentario: motivoFinal,
      });

      // Actualizar localmente de inmediato para feedback instantáneo
      setItems((prev) =>
        prev.map((it) => (it.IdItem === countModalItem.IdItem ? { ...it, StockActual: n } : it))
      );

      setCountModalItem(null);
    } catch (e) {
      setCountError(e?.message || "Error al actualizar stock.");
    } finally {
      setIsSavingCount(false);
    }
  }

  // -------------------------------------------------------------
  // ACCIONES DE ITEM (CREAR / EDITAR)
  // -------------------------------------------------------------
  function openNewItemModal() {
    setItemForm(emptyItemForm());
    setItemFormError(null);
    setUploadFile(null);
    setRemoteImageUrl("");
    setShowItemModal(true);
  }

  function openEditItemModal(item) {
    setItemForm({
      IdItem: item.IdItem,
      Nombre: item.Nombre || "",
      Descripcion: item.Descripcion || "",
      IdCategoria: item.IdCategoria ? String(item.IdCategoria) : "",
      PrecioVenta: item.PrecioVenta != null ? String(item.PrecioVenta) : "",
      CostoReferencia: item.CostoReferencia != null ? String(item.CostoReferencia) : "",
      EsServicio: Boolean(item.EsServicio),
      StockActual: item.StockActual != null ? String(item.StockActual) : "0",
      StockMinimo: item.StockMinimo != null ? String(item.StockMinimo) : "5",
      CompatibilidadMarca: item.CompatibilidadMarca || "",
      TipoChip: item.TipoChip || "",
      Frecuencia: item.Frecuencia || "",
      Activo: item.Activo !== false,
      ImagenUrl: item.ImagenUrl || null,
      CodigoUbicacion: item.CodigoUbicacion || "",
      AlertaStock: Boolean(item.AlertaStock),
    });
    setItemFormError(null);
    setUploadFile(null);
    setRemoteImageUrl("");
    setShowItemModal(true);
  }

  async function handleSaveItem(e) {
    e.preventDefault();
    setItemFormError(null);

    if (!itemForm.Nombre.trim()) {
      setItemFormError("El nombre del producto o servicio es obligatorio.");
      return;
    }
    if (!itemForm.IdCategoria) {
      setItemFormError("Selecciona una categoría.");
      return;
    }
    const precio = Number(itemForm.PrecioVenta);
    if (!Number.isFinite(precio) || precio < 0) {
      setItemFormError("Ingresa un precio de venta válido.");
      return;
    }

    setIsSavingItem(true);
    try {
      const payload = {
        Nombre: itemForm.Nombre.trim(),
        Descripcion: itemForm.Descripcion.trim() || null,
        IdCategoria: Number(itemForm.IdCategoria),
        PrecioVenta: precio,
        CostoReferencia: itemForm.CostoReferencia ? Number(itemForm.CostoReferencia) : 0,
        EsServicio: Boolean(itemForm.EsServicio),
        StockActual: itemForm.EsServicio ? 0 : Math.max(0, parseInt(itemForm.StockActual || 0, 10)),
        StockMinimo: itemForm.EsServicio ? 0 : Math.max(0, parseInt(itemForm.StockMinimo || 5, 10)),
        CompatibilidadMarca: itemForm.CompatibilidadMarca.trim() || null,
        TipoChip: itemForm.TipoChip.trim() || null,
        Frecuencia: itemForm.Frecuencia.trim() || null,
        Activo: Boolean(itemForm.Activo),
        CodigoUbicacion: itemForm.CodigoUbicacion.trim() || null,
        AlertaStock: Boolean(itemForm.AlertaStock),
      };

      let savedItem = null;
      if (itemForm.IdItem) {
        savedItem = await itemsService.actualizarItem(itemForm.IdItem, payload);
      } else {
        savedItem = await itemsService.crearItem(payload);
      }

      const itemId = savedItem?.IdItem ?? itemForm.IdItem;

      // Subir imagen si se seleccionó archivo o url remota
      if (itemId && uploadFile) {
        await itemsService.subirImagen(itemId, uploadFile);
      } else if (itemId && remoteImageUrl.trim()) {
        await itemsService.subirImagenDesdeUrl(itemId, remoteImageUrl.trim());
      }

      await loadAll();
      setShowItemModal(false);
    } catch (err) {
      setItemFormError(err?.message || "Error al guardar item.");
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleDeleteItem(item) {
    const ok = await confirm({
      title: "Desactivar Producto / Servicio",
      message: `¿Estás seguro de que deseas desactivar "${item.Nombre}"? Podrás consultarlo y reactivarlo en cualquier momento desde el filtro de Inactivos.`,
      confirmText: "Desactivar",
      cancelText: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await itemsService.eliminarItem(item.IdItem);
      setItems((prev) =>
        prev.map((it) => (it.IdItem === item.IdItem ? { ...it, Activo: false } : it))
      );
    } catch (err) {
      alert(err?.message || "No se pudo desactivar el item.");
    }
  }

  async function handleReactivarItem(item) {
    try {
      await itemsService.actualizarItem(item.IdItem, { Activo: true });
      setItems((prev) =>
        prev.map((it) => (it.IdItem === item.IdItem ? { ...it, Activo: true } : it))
      );
    } catch (err) {
      alert(err?.message || "No se pudo reactivar el item.");
    }
  }

  async function handleToggleAlertaStock(item) {
    const nuevoValor = !item.AlertaStock;
    try {
      await itemsService.actualizarItem(item.IdItem, { AlertaStock: nuevoValor });
      setItems((prev) =>
        prev.map((it) => (it.IdItem === item.IdItem ? { ...it, AlertaStock: nuevoValor } : it))
      );
    } catch (err) {
      alert(err?.message || "No se pudo actualizar el control de stock.");
    }
  }

  // -------------------------------------------------------------
  // ACCIONES DE CATEGORÍAS
  // -------------------------------------------------------------
  function openNewCatModal() {
    setCatForm(emptyCategoriaForm());
    setCatFormError(null);
    setShowCatModal(true);
  }

  function openEditCatModal(cat) {
    setCatForm({
      IdCategoria: cat.IdCategoria ?? cat.id_categoria,
      NombreCategoria: cat.NombreCategoria ?? cat.nombre ?? "",
      Clasificacion: cat.Clasificacion ?? cat.clasificacion ?? "Automotriz",
      ImagenUrl: cat.ImagenUrl ?? cat.imagen_url ?? null,
    });
    setCatFormError(null);
    setShowCatModal(true);
  }

  async function handleSaveCategoria(e) {
    e.preventDefault();
    setCatFormError(null);
    if (!catForm.NombreCategoria.trim()) {
      setCatFormError("El nombre de la categoría es requerido.");
      return;
    }

    setIsSavingCat(true);
    try {
      const payload = {
        NombreCategoria: catForm.NombreCategoria.trim(),
        Nombre: catForm.NombreCategoria.trim(),
        Clasificacion: catForm.Clasificacion.trim() || "Automotriz",
      };

      if (catForm.IdCategoria) {
        await categoriaService.actualizarCategoria(catForm.IdCategoria, payload);
      } else {
        await categoriaService.crearCategoria(payload);
      }

      await loadAll();
      setShowCatModal(false);
    } catch (err) {
      setCatFormError(err?.message || "Error al guardar categoría.");
    } finally {
      setIsSavingCat(false);
    }
  }

  async function handleDeleteCategoria(cat) {
    const id = cat.IdCategoria ?? cat.id_categoria;
    const name = cat.NombreCategoria ?? cat.nombre;
    const ok = await confirm({
      title: "Eliminar Categoría",
      message: `¿Estás seguro de que deseas eliminar la categoría "${name}"?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await categoriaService.eliminarCategoria(id);
      await loadAll();
    } catch (err) {
      alert(err?.message || "No se pudo eliminar la categoría.");
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-12">
      {confirmModal}
      {/* ======================================================== */}
      {/* 1. CABECERA & HERO DE CATÁLOGO & STOCK                   */}
      {/* ======================================================== */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-xs">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8 12 3 3 8l9 5 9-5Z" />
                <path d="M3 8v8l9 5 9-5V8" />
                <path d="M12 13v8" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-2xl">
              Catálogo & Stock
            </h1>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Administración unificada de productos, servicios, precios, coordenadas de rack y conteo de inventario.
          </p>
        </div>

        {/* BOTONES DE ACCIÓN RÁPIDA */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNewItemModal}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-blue-700 active:scale-95 cursor-pointer"
          >
            <span>+</span>
            <span>Nuevo Producto o Servicio</span>
          </button>
          <button
            type="button"
            onClick={openNewCatModal}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>Nueva Categoría</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. KPIS RÁPIDOS                                          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* TOTAL CATÁLOGO */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Catálogo</span>
          <div className="mt-2 text-2xl font-black text-slate-800 sm:text-3xl">
            {metricas.totalItems}
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {metricas.servicios} servicios · {metricas.totalItems - metricas.servicios} productos
          </span>
        </div>

        {/* ITEMS AGOTADOS (SIN EXISTENCIAS) */}
        <div
          onClick={() => {
            setActiveTab("ITEMS");
            setFiltroStock((prev) => (prev === "AGOTADOS" ? "TODOS" : "AGOTADOS"));
          }}
          className={`cursor-pointer rounded-3xl border p-4 shadow-xs transition-all ${
            filtroStock === "AGOTADOS"
              ? "border-rose-400 bg-rose-100/60 ring-2 ring-rose-400/40"
              : "border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Agotados</span>
            <svg className="h-4 w-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-800 sm:text-3xl">
            {metricas.agotados}
          </div>
          <span className="text-[11px] font-bold text-rose-700">Sin existencias (Click para filtrar)</span>
        </div>

        {/* ALERTAS DE STOCK BAJO */}
        <div
          onClick={() => {
            setActiveTab("ITEMS");
            setFiltroStock((prev) => (prev === "BAJO_STOCK" ? "TODOS" : "BAJO_STOCK"));
          }}
          className={`cursor-pointer rounded-3xl border p-4 shadow-xs transition-all ${
            filtroStock === "BAJO_STOCK"
              ? "border-amber-400 bg-amber-100/60 ring-2 ring-amber-400/40"
              : "border-amber-200/80 bg-amber-50/60 hover:bg-amber-100/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Bajo Stock</span>
            <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-800 sm:text-3xl">
            {metricas.alertasStock}
          </div>
          <span className="text-[11px] font-bold text-amber-700">Por agotarse (Click para filtrar)</span>
        </div>

        {/* CATEGORÍAS */}
        <div
          onClick={() => setActiveTab("CATEGORIAS")}
          className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 shadow-xs hover:bg-slate-50"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Categorías</span>
          <div className="mt-2 text-2xl font-black text-slate-800 sm:text-3xl">
            {metricas.totalCategorias}
          </div>
          <span className="text-[11px] font-medium text-slate-500">Familias de llaves y servicios</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TABS PRINCIPALES                                      */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("ITEMS")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-extrabold transition-colors cursor-pointer ${
            activeTab === "ITEMS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8 12 3 3 8l9 5 9-5Z" />
            <path d="M3 8v8l9 5 9-5V8" />
            <path d="M12 13v8" />
          </svg>
          <span>Productos & Stock</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CATEGORIAS")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-extrabold transition-colors cursor-pointer ${
            activeTab === "CATEGORIAS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <span>Categorías ({categorias.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("KARDEX")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-extrabold transition-colors cursor-pointer ${
            activeTab === "KARDEX"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" />
          </svg>
          <span>Historial de Movimientos (Kardex)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PRODUCTOS & STOCK                                 */}
      {/* ======================================================== */}
      {activeTab === "ITEMS" && (
        <section className="flex flex-col gap-4">
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs">
            {/* FILA 1: MACRO-CLASIFICACIÓN Y ESTADO (ACTIVOS / INACTIVOS) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              {/* Botones de Macro Clasificación */}
              <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
                {/* Todas */}
                <button
                  type="button"
                  onClick={() => handleSelectMacro("TODAS")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                    filtroMacro === "TODAS"
                      ? "bg-white text-slate-900 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  <span>Todos</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    filtroMacro === "TODAS" ? "bg-slate-100 text-slate-700" : "bg-slate-200/60 text-slate-500"
                  }`}>
                    {countPorMacro.TODAS}
                  </span>
                </button>

                {/* Residencial */}
                <button
                  type="button"
                  onClick={() => handleSelectMacro("Residencial")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                    filtroMacro === "Residencial"
                      ? "bg-emerald-600 text-white shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <svg className={`h-3.5 w-3.5 ${filtroMacro === "Residencial" ? "text-white" : "text-emerald-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Residencial</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    filtroMacro === "Residencial" ? "bg-emerald-700 text-white" : "bg-slate-200/60 text-slate-500"
                  }`}>
                    {countPorMacro.Residencial}
                  </span>
                </button>

                {/* Automotriz */}
                <button
                  type="button"
                  onClick={() => handleSelectMacro("Automotriz")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                    filtroMacro === "Automotriz"
                      ? "bg-indigo-600 text-white shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <svg className={`h-3.5 w-3.5 ${filtroMacro === "Automotriz" ? "text-white" : "text-indigo-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.2 1 12 1 13v3c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                  <span>Automotriz</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    filtroMacro === "Automotriz" ? "bg-indigo-700 text-white" : "bg-slate-200/60 text-slate-500"
                  }`}>
                    {countPorMacro.Automotriz}
                  </span>
                </button>

                {/* Accesorios */}
                <button
                  type="button"
                  onClick={() => handleSelectMacro("Accesorios")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                    filtroMacro === "Accesorios"
                      ? "bg-amber-600 text-white shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <svg className={`h-3.5 w-3.5 ${filtroMacro === "Accesorios" ? "text-white" : "text-amber-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21 2-2 2m-1.5 1.5L10 13l-4 4-2-2 4-4 7.5-7.5" />
                    <circle cx="7.5" cy="16.5" r="3.5" />
                  </svg>
                  <span>Accesorios</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    filtroMacro === "Accesorios" ? "bg-amber-700 text-white" : "bg-slate-200/60 text-slate-500"
                  }`}>
                    {countPorMacro.Accesorios}
                  </span>
                </button>

                {/* Servicios */}
                <button
                  type="button"
                  onClick={() => handleSelectMacro("Servicios")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                    filtroMacro === "Servicios"
                      ? "bg-purple-600 text-white shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <svg className={`h-3.5 w-3.5 ${filtroMacro === "Servicios" ? "text-white" : "text-purple-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  <span>Servicios</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    filtroMacro === "Servicios" ? "bg-purple-700 text-white" : "bg-slate-200/60 text-slate-500"
                  }`}>
                    {countPorMacro.Servicios}
                  </span>
                </button>
              </div>

              {/* Filtro de Estado: Activos / Inactivos / Todos */}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFiltroEstado("ACTIVOS")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                    filtroEstado === "ACTIVOS"
                      ? "bg-white text-emerald-700 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Activos</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    filtroEstado === "ACTIVOS" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/60 text-slate-500"
                  }`}>
                    {countPorEstado.ACTIVOS}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroEstado("INACTIVOS")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                    filtroEstado === "INACTIVOS"
                      ? "bg-rose-100 text-rose-800 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Inactivos</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    filtroEstado === "INACTIVOS" ? "bg-rose-200 text-rose-900" : "bg-slate-200/60 text-slate-500"
                  }`}>
                    {countPorEstado.INACTIVOS}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroEstado("TODOS")}
                  className={`rounded-xl px-2.5 py-1.5 transition-all cursor-pointer ${
                    filtroEstado === "TODOS"
                      ? "bg-white text-slate-800 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Todos ({countPorEstado.TODOS})
                </button>
              </div>
            </div>

            {/* FILA 2: BÚSQUEDA, SELECTOR MODAL DE CATEGORÍA, Y FILTRO DE STOCK */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              {/* Buscador */}
              <div className="relative min-w-[260px] flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, clave, coordenada o compatibilidad..."
                  className="w-full !pl-11 pr-8 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Botón Popup Selector de Categoría */}
              <button
                type="button"
                onClick={() => {
                  setCatPickerMacro(filtroMacro);
                  setCatPickerSearch("");
                  setShowCatPickerModal(true);
                }}
                className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  selectedCategoria !== "TODAS"
                    ? "border-blue-300 bg-blue-50/80 text-blue-800"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
                <span>
                  {selectedCategoria === "TODAS"
                    ? "Categoría: Todas las categorías"
                    : `Categoría: ${catMap.get(String(selectedCategoria)) || selectedCategoria}`}
                </span>
                {selectedCategoria !== "TODAS" ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategoria("TODAS");
                    }}
                    className="ml-1 rounded-full p-0.5 hover:bg-blue-200 text-blue-600 hover:text-blue-900"
                    title="Quitar filtro de categoría"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </span>
                ) : (
                  <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                )}
              </button>

              {/* Filtro de Stock */}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFiltroStock("TODOS")}
                  className={`rounded-xl px-2.5 py-1.5 transition-all cursor-pointer ${
                    filtroStock === "TODOS" ? "bg-white text-slate-800 shadow-2xs font-extrabold" : "text-slate-500"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStock("BAJO_STOCK")}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 transition-all cursor-pointer ${
                    filtroStock === "BAJO_STOCK" ? "bg-amber-100 text-amber-900 shadow-2xs font-extrabold" : "text-slate-500"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Bajo Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStock("AGOTADOS")}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 transition-all cursor-pointer ${
                    filtroStock === "AGOTADOS" ? "bg-rose-100 text-rose-900 shadow-2xs font-extrabold" : "text-slate-500"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>Agotados</span>
                </button>
              </div>
            </div>
          </div>

          {/* TABLA DE PRODUCTOS & STOCK */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 pl-6 pr-3">Producto / Servicio</th>
                    <th className="px-3 py-3.5">Categoría</th>
                    <th className="px-3 py-3.5">Ubicación (Rack / Cajón)</th>
                    <th className="px-3 py-3.5">Precio Venta</th>
                    <th className="px-3 py-3.5">Stock Físico</th>
                    <th className="py-3.5 pl-3 pr-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {itemsFiltrados.map((item) => {
                    const esServicio = Boolean(item.EsServicio);
                    const stock = Number(item.StockActual ?? 0);
                    const min = Number(item.StockMinimo ?? 0);
                    const isLow = !esServicio && stock <= min && stock > 0;
                    const isOut = !esServicio && stock === 0;

                    const catName = catMap.get(String(item.IdCategoria)) || item.NombreCategoria || "-";
                    const imgUrl = item.ImagenUrl ? resolveImageUrl(item.ImagenUrl, { apiBaseUrl: API_URL }) : null;

                    return (
                      <tr key={item.IdItem} className="hover:bg-slate-50/70 transition-colors">
                        {/* PRODUCTO CON FOTO */}
                        <td className="py-3.5 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={item.Nombre}
                                onClick={() => setZoomSrc(imgUrl)}
                                className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 object-cover p-0.5 cursor-zoom-in hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-400">
                                {esServicio ? (
                                  <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m21 2-2 2m-1.5 1.5L10 13l-4 4-2-2 4-4 7.5-7.5" />
                                    <circle cx="7.5" cy="16.5" r="3.5" />
                                  </svg>
                                )}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="font-extrabold text-slate-900 text-sm">{item.Nombre}</strong>
                                {esServicio && (
                                  <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-black text-purple-800">
                                    Servicio
                                  </span>
                                )}
                                {!item.Activo && (
                                  <span className="rounded-md bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-700">
                                    Inactivo
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-medium">
                                {item.CompatibilidadMarca && <span>Marca: {item.CompatibilidadMarca}</span>}
                                {item.TipoChip && <span>Chip: {item.TipoChip}</span>}
                                {item.Frecuencia && <span>Freq: {item.Frecuencia}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* CATEGORÍA */}
                        <td className="px-3 py-3.5">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            {catName}
                          </span>
                        </td>

                        {/* COORDENADA / UBICACIÓN */}
                        <td className="px-3 py-3.5">
                          {item.CodigoUbicacion ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900 shadow-2xs">
                              <svg className="h-3.5 w-3.5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{item.CodigoUbicacion}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400 italic">
                              Sin coordenada
                            </span>
                          )}
                        </td>

                        {/* PRECIO VENTA & COSTO */}
                        <td className="px-3 py-3.5">
                          <div>
                            <strong className="text-sm font-black text-slate-900">
                              {fmtMoney(item.PrecioVenta)}
                            </strong>
                            {Number(item.CostoReferencia) > 0 && (
                              <div className="text-[11px] font-semibold text-slate-400">
                                Costo: {fmtMoney(item.CostoReferencia)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* STOCK FÍSICO */}
                        <td className="px-3 py-3.5">
                          {esServicio ? (
                            <span className="text-[11px] font-bold text-slate-400">Servicio (N/A)</span>
                          ) : !item.AlertaStock ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 border border-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                Sin control stock
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleAlertaStock(item)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                title="Activar conteo y alertas de stock para este producto"
                              >
                                + Activar control
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center justify-center rounded-xl px-2.5 py-1 text-xs font-black ${
                                    isOut
                                      ? "bg-rose-100 text-rose-900 border border-rose-200"
                                      : isLow
                                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                                      : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                  }`}
                                >
                                  {stock} piezas
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-slate-400">
                                <span>Mínimo alerta: {min}</span>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAlertaStock(item)}
                                  className="text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
                                  title="Desactivar conteo y alertas de stock para este producto"
                                >
                                  Desactivar
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* ACCIONES */}
                        <td className="py-3.5 pl-3 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* BOTÓN CONTAR STOCK RÁPIDO */}
                            {!esServicio && item.Activo && item.AlertaStock && (
                              <button
                                type="button"
                                onClick={() => openCountModal(item)}
                                title="Contar o ajustar inventario físico"
                                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 shadow-2xs hover:bg-blue-100 active:scale-95 cursor-pointer"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="18" height="18" x="3" y="3" rx="2" />
                                  <line x1="8" y1="12" x2="16" y2="12" />
                                  <line x1="12" y1="8" x2="12" y2="16" />
                                </svg>
                                <span>Contar Stock</span>
                              </button>
                            )}

                            {/* BOTÓN EDITAR */}
                            <button
                              type="button"
                              onClick={() => openEditItemModal(item)}
                              title="Editar producto completo"
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95 cursor-pointer"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                              <span>Editar</span>
                            </button>

                            {/* BOTÓN ELIMINAR / REACTIVAR */}
                            {!item.Activo ? (
                              <button
                                type="button"
                                onClick={() => handleReactivarItem(item)}
                                title="Reactivar producto / servicio"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700 shadow-2xs hover:bg-emerald-100 active:scale-95 cursor-pointer"
                              >
                                <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                  <path d="M21 3v5h-5" />
                                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                  <path d="M8 16H3v5" />
                                </svg>
                                <span>Reactivar</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                title="Desactivar item"
                                className="rounded-xl border border-rose-200 bg-rose-50 p-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 cursor-pointer"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {itemsFiltrados.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-semibold text-slate-400">
                        No se encontraron productos o servicios con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CATEGORÍAS                                        */}
      {/* ======================================================== */}
      {activeTab === "CATEGORIAS" && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800">Familias de Productos y Servicios</h2>
            <button
              type="button"
              onClick={openNewCatModal}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
            >
              <span>+</span>
              <span>Nueva Categoría</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((c) => {
              const id = c.IdCategoria ?? c.id_categoria;
              const name = c.NombreCategoria ?? c.nombre;
              const clasif = c.Clasificacion ?? c.clasificacion ?? "General";
              const countItems = items.filter((it) => String(it.IdCategoria) === String(id)).length;

              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                    </div>
                    <div>
                      <strong className="text-sm font-black text-slate-900">{name}</strong>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">
                          {clasif}
                        </span>
                        <span>{countItems} items asociados</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditCatModal(c)}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="Editar categoría"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategoria(c)}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                      title="Eliminar categoría"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* TAB 3: HISTORIAL DE MOVIMIENTOS (KARDEX)                  */}
      {/* ======================================================== */}
      {activeTab === "KARDEX" && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800">Auditoría de Movimientos de Inventario</h2>
              <p className="text-xs text-slate-500 font-medium">
                Registro cronológico de entradas, salidas, ventas y ajustes manuales.
              </p>
            </div>
            <button
              type="button"
              onClick={loadMovimientos}
              disabled={movsLoading}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              <svg className={`h-3.5 w-3.5 text-slate-600 ${movsLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>{movsLoading ? "Actualizando..." : "Actualizar"}</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 pl-6 pr-3">Fecha</th>
                    <th className="px-3 py-3">Producto</th>
                    <th className="px-3 py-3">Tipo Movimiento</th>
                    <th className="px-3 py-3">Cantidad</th>
                    <th className="px-3 py-3">Usuario</th>
                    <th className="py-3 pl-3 pr-6">Motivo / Comentario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {movimientos.map((m) => {
                    const qty = Number(m.cantidad ?? 0);
                    const isPositive = qty > 0;
                    return (
                      <tr key={m.id_movimiento} className="hover:bg-slate-50/60">
                        <td className="py-3 pl-6 pr-3 text-slate-500 whitespace-nowrap">
                          {fmtDateTime(m.fecha)}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900">
                          {m.nombre_item || `Item #${m.id_item}`}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black ${
                              m.tipo_movimiento === "VENTA"
                                ? "bg-blue-100 text-blue-900"
                                : m.tipo_movimiento === "AJUSTE"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {m.tipo_movimiento}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-black">
                          <span className={isPositive ? "text-emerald-700" : "text-rose-700"}>
                            {isPositive ? `+${qty}` : qty}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-500">{m.usuario || "Sistema"}</td>
                        <td className="py-3 pl-3 pr-6 text-slate-600 font-normal">
                          {m.comentario || "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {movimientos.length === 0 && !movsLoading && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs font-semibold text-slate-400">
                        No hay movimientos de inventario registrados recientemente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONTEO FÍSICO RÁPIDO & ESPECÍFICO                  */}
      {/* ======================================================== */}
      {countModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-600">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="16" y1="14" x2="16" y2="18" />
                    <path d="M16 10h.01" />
                    <path d="M12 10h.01" />
                    <path d="M8 10h.01" />
                    <path d="M12 14h.01" />
                    <path d="M8 14h.01" />
                    <path d="M12 18h.01" />
                    <path d="M8 18h.01" />
                  </svg>
                  <span>Conteo Físico de Stock</span>
                </span>
                <h3 className="mt-1 text-base font-black text-slate-900">
                  {countModalItem.Nombre}
                </h3>
                {countModalItem.CodigoUbicacion && (
                  <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <svg className="h-3.5 w-3.5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Ubicación: {countModalItem.CodigoUbicacion}</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCountModalItem(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Contenido del Conteo */}
            <div className="my-4 flex flex-col gap-4">
              {/* COMPARATIVA SISTEMA VS FÍSICO */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">En Sistema</span>
                  <div className="text-xl font-black text-slate-700">
                    {countModalItem.StockActual ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400">piezas registradas</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-700">Diferencia</span>
                  {(() => {
                    const n = Number(conteoFisico);
                    if (!Number.isFinite(n)) return <div className="text-xl font-black text-slate-400">-</div>;
                    const diff = n - Number(countModalItem.StockActual ?? 0);
                    if (diff === 0) {
                      return <div className="text-xl font-black text-blue-600">0 (Exacto)</div>;
                    }
                    return (
                      <div className={`text-xl font-black ${diff > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {diff > 0 ? `+${diff}` : diff} piezas
                      </div>
                    );
                  })()}
                  <span className="text-[10px] text-slate-400">
                    {Number(conteoFisico) - Number(countModalItem.StockActual ?? 0) < 0
                      ? "Faltante / Merma"
                      : Number(conteoFisico) - Number(countModalItem.StockActual ?? 0) > 0
                      ? "Excedente / Entrada"
                      : "Sin variación"}
                  </span>
                </div>
              </div>

              {/* INPUT NUMÉRICO GRANDE */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-800">
                  ¿Cuántas piezas físicas contaste en el cajón / mostrador?
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    autoFocus
                    className="w-full rounded-2xl border-2 border-blue-500 bg-white px-4 py-3 text-center text-3xl font-black text-slate-900 focus:outline-none"
                    value={conteoFisico}
                    onChange={(e) => setConteoFisico(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGuardarConteo();
                    }}
                  />
                </div>

                {/* BOTONES DE AJUSTE RÁPIDO (+1, -1, +5, +10) */}
                <div className="mt-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConteoFisico((prev) => String(Math.max(0, Number(prev || 0) - 1)))}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setConteoFisico((prev) => String(Math.max(0, Number(prev || 0) + 1)))}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setConteoFisico((prev) => String(Math.max(0, Number(prev || 0) + 5)))}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => setConteoFisico((prev) => String(Math.max(0, Number(prev || 0) + 10)))}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* MOTIVO DEL CONTEO */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Motivo del ajuste:</label>
                <select
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={conteoMotivo}
                  onChange={(e) => setConteoMotivo(e.target.value)}
                >
                  <option>Auditoría / Conteo Físico</option>
                  <option>Entrada de mercancía / Compra</option>
                  <option>Merma / Llave rota o dañada</option>
                  <option>Corrección de error de captura</option>
                </select>
              </div>

              {/* COMENTARIO OPCIONAL */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Nota adicional (opcional):</label>
                <input
                  type="text"
                  placeholder="Ej. Se encontraron 3 llaves en otro cajón"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={conteoComentario}
                  onChange={(e) => setConteoComentario(e.target.value)}
                />
              </div>

              {countError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">
                  {countError}
                </div>
              )}
            </div>

            {/* Footer con Botones de Acción */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setCountModalItem(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarConteo}
                disabled={isSavingCount}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-xs"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{isSavingCount ? "Guardando..." : "Confirmar y Actualizar Stock"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREAR O EDITAR ITEM COMPLETO                      */}
      {/* ======================================================== */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="inline-flex items-center gap-2 text-base font-black text-slate-900">
                <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {itemForm.IdItem ? (
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  ) : (
                    <>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </>
                  )}
                </svg>
                <span>{itemForm.IdItem ? "Editar Producto o Servicio" : "Nuevo Producto o Servicio"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 flex flex-col gap-4 text-xs">
              {/* TIPO: PRODUCTO FÍSICO O SERVICIO */}
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Tipo de elemento:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="esServicio"
                    checked={!itemForm.EsServicio}
                    onChange={() => setItemForm((prev) => ({ ...prev, EsServicio: false }))}
                  />
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7.5" cy="15.5" r="5.5" />
                      <path d="m21 2-9.6 9.6" />
                      <path d="m15.5 7.5 3 3L22 7l-3-3" />
                    </svg>
                    Producto Físico (Llave, Carcasa, Candado)
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="esServicio"
                    checked={itemForm.EsServicio}
                    onChange={() => setItemForm((prev) => ({ ...prev, EsServicio: true }))}
                  />
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    Servicio (Copia, Apertura, Programación)
                  </span>
                </label>
              </div>

              {/* DATOS BÁSICOS */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Nombre del Producto / Servicio *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Llave con Chip Ford o Copia Llave Tetra"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    value={itemForm.Nombre}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, Nombre: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Categoría *</label>
                  <select
                    required
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    value={itemForm.IdCategoria}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, IdCategoria: e.target.value }))}
                  >
                    <option value="">-- Selecciona Categoría --</option>
                    {categorias.map((c) => {
                      const id = c.IdCategoria ?? c.id_categoria;
                      const name = c.NombreCategoria ?? c.nombre;
                      return (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* COORDENADA DE UBICACIÓN & PRECIOS */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="inline-flex items-center gap-1 font-bold text-slate-700">
                    <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Coordenada (Rack / Cajón)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Rack A - Cajón 3"
                    className="rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2 text-xs font-black text-amber-950 focus:border-blue-500 focus:bg-white focus:outline-none"
                    value={itemForm.CodigoUbicacion}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, CodigoUbicacion: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Precio de Venta ($) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    placeholder="0.00"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    value={itemForm.PrecioVenta}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, PrecioVenta: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Costo Referencia ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0.00"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
                    value={itemForm.CostoReferencia}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, CostoReferencia: e.target.value }))}
                  />
                </div>
              </div>

              {/* CONTROL DE INVENTARIO (SOLO SI ES FÍSICO) */}
              {!itemForm.EsServicio && (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={itemForm.AlertaStock}
                      onChange={(e) =>
                        setItemForm((prev) => ({ ...prev, AlertaStock: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800">
                        ¿Contar y controlar stock de este producto?
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Si está activado, el sistema contabilizará existencias y emitirá alertas de bajo stock. Si está desactivado, no se exigirá control de inventario de esta pieza.
                      </span>
                    </div>
                  </label>

                  {itemForm.AlertaStock && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-slate-200/80">
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700">Stock Inicial (Piezas)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 focus:outline-none"
                          value={itemForm.StockActual}
                          onChange={(e) => setItemForm((prev) => ({ ...prev, StockActual: e.target.value }))}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-slate-700">Stock Mínimo para Alerta</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                          value={itemForm.StockMinimo}
                          onChange={(e) => setItemForm((prev) => ({ ...prev, StockMinimo: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DETALLES DE CERRAJERÍA (COMPATIBILIDAD, CHIP, FRECUENCIA) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Marca / Compatibilidad</label>
                  <input
                    type="text"
                    placeholder="Ej. Nissan, Ford, Philips"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                    value={itemForm.CompatibilidadMarca}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, CompatibilidadMarca: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Tipo de Chip (Transponder)</label>
                  <input
                    type="text"
                    placeholder="Ej. ID46, 4D63, H"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                    value={itemForm.TipoChip}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, TipoChip: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-700">Frecuencia</label>
                  <input
                    type="text"
                    placeholder="Ej. 315 MHz, 433 MHz"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                    value={itemForm.Frecuencia}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, Frecuencia: e.target.value }))}
                  />
                </div>
              </div>

              {/* FOTOGRAFÍA */}
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="font-bold text-slate-700">Fotografía del Producto:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs text-slate-500 file:mr-2 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <span className="text-[11px] text-slate-400">o URL:</span>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    value={remoteImageUrl}
                    onChange={(e) => setRemoteImageUrl(e.target.value)}
                  />
                </div>
              </div>

              {itemFormError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">
                  {itemFormError}
                </div>
              )}

              {/* BOTONES MODAL */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-xs"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{isSavingItem ? "Guardando..." : "Guardar Elemento"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREAR O EDITAR CATEGORÍA                          */}
      {/* ======================================================== */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="inline-flex items-center gap-2 text-base font-black text-slate-900">
                <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {catForm.IdCategoria ? (
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  ) : (
                    <>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </>
                  )}
                </svg>
                <span>{catForm.IdCategoria ? "Editar Categoría" : "Nueva Categoría"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveCategoria} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Nombre de la Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Llaves Automotrices, Candados, Forjas"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  value={catForm.NombreCategoria}
                  onChange={(e) => setCatForm((prev) => ({ ...prev, NombreCategoria: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Clasificación / Grupo</label>
                <select
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                  value={catForm.Clasificacion}
                  onChange={(e) => setCatForm((prev) => ({ ...prev, Clasificacion: e.target.value }))}
                >
                  <option value="Automotriz">Automotriz</option>
                  <option value="Residencial">Residencial</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Accesorios">Accesorios y Herramientas</option>
                </select>
              </div>

              {catFormError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">
                  {catFormError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingCat}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-xs"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{isSavingCat ? "Guardando..." : "Guardar Categoría"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SELECCIONAR CATEGORÍA (CUADRÍCULA CON BUSCADOR)   */}
      {/* ======================================================== */}
      {showCatPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="flex flex-col w-full max-w-4xl max-h-[88vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div>
                <h3 className="text-base font-black text-slate-900">Seleccionar Categoría</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Explora y filtra los productos por su familia o categoría
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatPickerModal(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Controles de Búsqueda y Macro-filtro dentro del Modal */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white">
              {/* Buscador de categorías */}
              <div className="relative w-full sm:w-80">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  className="w-full !pl-11 pr-8 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                  value={catPickerSearch}
                  onChange={(e) => setCatPickerSearch(e.target.value)}
                  autoFocus
                />
                {catPickerSearch && (
                  <button
                    type="button"
                    onClick={() => setCatPickerSearch("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Macro tabs dentro del modal */}
              <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-[11px] font-bold">
                {["TODAS", "Residencial", "Automotriz", "Accesorios", "Servicios"].map((macro) => (
                  <button
                    key={macro}
                    type="button"
                    onClick={() => setCatPickerMacro(macro)}
                    className={`rounded-xl px-2.5 py-1.5 transition-all cursor-pointer ${
                      catPickerMacro === macro
                        ? "bg-blue-600 text-white shadow-2xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {macro === "TODAS" ? "Todas" : macro}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Categorías con scroll */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* Card: TODAS LAS CATEGORÍAS */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoria("TODAS");
                    setShowCatPickerModal(false);
                  }}
                  className={`group flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center relative ${
                    selectedCategoria === "TODAS"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border mb-2.5 transition-transform group-hover:scale-105 ${
                    selectedCategoria === "TODAS" ? "border-blue-200 bg-blue-100 text-blue-700" : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}>
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="7" height="7" x="3" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="14" rx="1" />
                      <rect width="7" height="7" x="3" y="14" rx="1" />
                    </svg>
                  </div>
                  <span className="text-xs font-black text-slate-800 line-clamp-1">Todas las categorías</span>
                  <span className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {items.length} productos
                  </span>
                  {selectedCategoria === "TODAS" && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>

                {/* Cards de cada categoría */}
                {categoriasParaPicker.map((cat) => {
                  const catId = cat.IdCategoria ?? cat.id_categoria;
                  const catIdStr = String(catId);
                  const isSelected = selectedCategoria === catIdStr;
                  const catName = cat.NombreCategoria ?? cat.nombre;
                  const catClasif = normalizeClasif(cat.Clasificacion ?? cat.clasificacion);
                  const count = countPorCategoria.get(catIdStr) || 0;
                  const imgUrl = cat.ImagenUrl ?? cat.imagen_url ? resolveImageUrl(cat.ImagenUrl ?? cat.imagen_url, { apiBaseUrl: API_URL }) : null;

                  return (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => {
                        setSelectedCategoria(catIdStr);
                        // Si el macro actual no coincide con la clasificación de la categoría, sincronizar
                        if (filtroMacro !== "TODAS" && filtroMacro !== catClasif) {
                          setFiltroMacro(catClasif);
                        }
                        setShowCatPickerModal(false);
                      }}
                      className={`group flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center relative ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={catName}
                          className="h-12 w-12 rounded-2xl border border-slate-200 object-cover p-0.5 mb-2.5 transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border mb-2.5 transition-transform group-hover:scale-105 ${
                          isSelected ? "border-blue-200 bg-blue-100 text-blue-700" : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}>
                          {catClasif === "Automotriz" ? (
                            <svg className="h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.2 1 12 1 13v3c0 .6.4 1 1 1h2" />
                              <circle cx="7" cy="17" r="2" />
                              <circle cx="17" cy="17" r="2" />
                            </svg>
                          ) : catClasif === "Residencial" ? (
                            <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          ) : catClasif === "Servicios" ? (
                            <svg className="h-6 w-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m21 2-2 2m-1.5 1.5L10 13l-4 4-2-2 4-4 7.5-7.5" />
                              <circle cx="7.5" cy="16.5" r="3.5" />
                            </svg>
                          )}
                        </div>
                      )}

                      <span className="text-xs font-black text-slate-800 line-clamp-1">{catName}</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${
                          catClasif === "Automotriz" ? "bg-indigo-50 text-indigo-700" :
                          catClasif === "Residencial" ? "bg-emerald-50 text-emerald-700" :
                          catClasif === "Servicios" ? "bg-purple-50 text-purple-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {catClasif}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {count} items
                        </span>
                      </div>

                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {categoriasParaPicker.length === 0 && (
                <div className="py-12 text-center text-xs font-semibold text-slate-400">
                  No se encontraron categorías con los filtros aplicados.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Mostrando {categoriasParaPicker.length} de {categorias.length} categorías
              </span>
              <button
                type="button"
                onClick={() => setShowCatPickerModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ZOOM DE IMAGEN                                           */}
      {/* ======================================================== */}
      {zoomSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs cursor-pointer"
          onClick={() => setZoomSrc(null)}
        >
          <img
            src={zoomSrc}
            alt="Vista ampliada"
            className="max-h-[85vh] max-w-[85vw] rounded-3xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
