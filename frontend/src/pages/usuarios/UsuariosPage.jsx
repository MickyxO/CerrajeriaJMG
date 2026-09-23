import { useEffect, useMemo, useRef, useState } from "react";
import { usuariosService } from "../../services/usuarios.service";
import { useAuth } from "../../hooks/useAuth";
import { useConfirmModal } from "../../hooks/useConfirmModal";

function emptyForm() {
  return {
    IdUsuario: null,
    NombreCompleto: "",
    Username: "",
    Rol: "empleado",
    Activo: true,
    PinAcceso: "",
  };
}

function normalizeUsuario(row) {
  return {
    IdUsuario: row?.IdUsuario ?? row?.id_usuario ?? null,
    NombreCompleto: row?.NombreCompleto ?? row?.nombre_completo ?? "",
    Username: row?.Username ?? row?.username ?? "",
    Rol: row?.Rol ?? row?.rol ?? "empleado",
    Activo: row?.Activo ?? row?.activo ?? true,
  };
}

function pickComparable(form) {
  return {
    NombreCompleto: (form?.NombreCompleto ?? "").toString(),
    Username: (form?.Username ?? "").toString(),
    Rol: (form?.Rol ?? "").toString(),
    Activo: Boolean(form?.Activo),
    PinAcceso: (form?.PinAcceso ?? "").toString(),
  };
}

function roleLabel(rol) {
  const r = (rol ?? "").toString().toLowerCase();
  if (r === "admin" || r === "administrador") return "Administrador";
  return "Empleado";
}

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const { confirm, modal } = useConfirmModal();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [incluyeInactivos, setIncluyeInactivos] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("TODOS");

  const [usuariosRaw, setUsuariosRaw] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState(() => emptyForm());
  const initialFormRef = useRef(pickComparable(emptyForm()));
  const [formStatus, setFormStatus] = useState({ type: "idle", message: "" });
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(form?.IdUsuario);
  const currentUserId = currentUser?.IdUsuario ?? currentUser?.id_usuario ?? null;
  const currentUserRole = (currentUser?.Rol ?? currentUser?.rol ?? "").toString().toLowerCase();
  const isAdmin = currentUserRole === "admin" || currentUserRole === "administrador";
  // Un administrador puede editar a cualquier usuario; un empleado solo a sí mismo
  const canEditSelectedUser = !isEditing || isAdmin || (currentUserId !== null && form?.IdUsuario === currentUserId);

  const usuarios = useMemo(() => {
    const list = (Array.isArray(usuariosRaw) ? usuariosRaw : []).map(normalizeUsuario);
    const query = q.trim().toLowerCase();
    const rf = roleFilter;

    return list
      .filter((u) => {
        if (rf === "TODOS") return true;
        return (u?.Rol ?? "").toString().toLowerCase() === rf.toLowerCase();
      })
      .filter((u) => {
        if (!query) return true;
        const name = (u?.NombreCompleto ?? "").toString().toLowerCase();
        const username = (u?.Username ?? "").toString().toLowerCase();
        return name.includes(query) || username.includes(query);
      });
  }, [usuariosRaw, q, roleFilter]);

  const isDirty = useMemo(() => {
    const baseline = initialFormRef.current;
    const current = pickComparable(form);
    return JSON.stringify(current) !== JSON.stringify(baseline);
  }, [form]);

  async function confirmDiscardIfDirty() {
    if (!isDirty) return true;
    return await confirm({
      title: "Descartar cambios",
      message: "Tienes modificaciones sin guardar en este usuario. ¿Deseas descartarlas?",
      confirmText: "Descartar",
      cancelText: "Seguir editando",
      tone: "danger",
    });
  }

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await usuariosService.getUsuarios({ incluyeInactivos: incluyeInactivos ? 1 : 0 });
      setUsuariosRaw(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Error al cargar el catálogo de usuarios");
      setUsuariosRaw([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incluyeInactivos]);

  async function startNew({ confirm: shouldConfirm = true } = {}) {
    if (shouldConfirm && !(await confirmDiscardIfDirty())) return;
    setSelectedId(null);
    const next = emptyForm();
    setForm(next);
    initialFormRef.current = pickComparable(next);
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
  }

  function selectUsuario(u) {
    (async () => {
      if (!(await confirmDiscardIfDirty())) return;
      setSelectedId(u.IdUsuario);
      const next = {
        IdUsuario: u.IdUsuario,
        NombreCompleto: u.NombreCompleto ?? "",
        Username: u.Username ?? "",
        Rol: (u.Rol ?? "empleado").toString(),
        Activo: Boolean(u.Activo),
        PinAcceso: "",
      };
      setForm(next);
      initialFormRef.current = pickComparable(next);
      setFormError(null);
      setFormStatus({ type: "idle", message: "" });
    })();
  }

  function validate() {
    const nombre = (form?.NombreCompleto ?? "").toString().trim();
    const username = (form?.Username ?? "").toString().trim();
    const rol = (form?.Rol ?? "").toString().trim();
    const pin = (form?.PinAcceso ?? "").toString();

    if (!nombre) return "El nombre completo es obligatorio.";
    if (!username) return "El nombre de usuario (username) es obligatorio.";
    if (!rol) return "El rol es obligatorio.";

    if (!isEditing) {
      if (!pin) return "La contraseña o PIN de acceso es obligatorio para crear un usuario.";
    }

    return null;
  }

  async function save() {
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });

    if (!canEditSelectedUser) {
      setFormError("No es posible editar los datos de un usuario ajeno.");
      return;
    }

    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        const payload = {
          NombreCompleto: form.NombreCompleto,
          Username: form.Username,
          Rol: form.Rol,
          Activo: Boolean(form.Activo),
        };
        if ((form?.PinAcceso ?? "").toString().trim()) {
          payload.PinAcceso = form.PinAcceso;
        }
        await usuariosService.actualizarUsuario(form.IdUsuario, payload);
        setFormStatus({ type: "ok", message: "Usuario actualizado correctamente." });

        if (form.IdUsuario === currentUserId) {
          const stored = localStorage.getItem("softsmith.user");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              const updated = {
                ...parsed,
                NombreCompleto: form.NombreCompleto,
                Username: form.Username,
                Rol: form.Rol,
              };
              localStorage.setItem("softsmith.user", JSON.stringify(updated));
            } catch {}
          }
        }
      } else {
        await usuariosService.crearUsuario({
          NombreCompleto: form.NombreCompleto,
          Username: form.Username,
          Rol: form.Rol,
          PinAcceso: form.PinAcceso,
        });
        setFormStatus({ type: "ok", message: "Usuario creado exitosamente." });
      }

      await loadAll();

      if (!isEditing) {
        await startNew({ confirm: false });
      } else {
        const next = { ...form, PinAcceso: "" };
        setForm(next);
        initialFormRef.current = pickComparable(next);
      }
    } catch (e) {
      setFormError(e?.message || "Error al guardar usuario");
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateSelected() {
    if (!isEditing) return;

    if (!canEditSelectedUser) {
      setFormError("No es posible editar los datos de un usuario ajeno.");
      return;
    }

    if (form.IdUsuario === currentUserId) {
      setFormError("No puedes desactivar tu propia cuenta mientras estás en sesión.");
      return;
    }
    const ok = await confirm({
      title: "Desactivar usuario",
      message: `¿Estás seguro de desactivar a "${form.NombreCompleto}"? El usuario no podrá iniciar sesión en el sistema.`,
      confirmText: "Desactivar",
      cancelText: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;

    setIsSaving(true);
    setFormError(null);
    try {
      await usuariosService.eliminarUsuario(form.IdUsuario);
      setFormStatus({ type: "ok", message: "Usuario desactivado correctamente." });
      await loadAll();
      await startNew({ confirm: false });
    } catch (e) {
      setFormError(e?.message || "Error al desactivar usuario");
    } finally {
      setIsSaving(false);
    }
  }

  const counts = useMemo(() => {
    const list = (Array.isArray(usuariosRaw) ? usuariosRaw : []).map(normalizeUsuario);
    const activos = list.filter((u) => Boolean(u.Activo)).length;
    const inactivos = list.length - activos;
    return { total: list.length, activos, inactivos };
  }, [usuariosRaw]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {modal}

      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Usuarios</h1>
            <p className="text-sm text-slate-500 font-medium">
              Control de personal, asignación de roles y credenciales de acceso
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-2xl cursor-pointer text-xs font-bold text-slate-700 transition-colors border border-slate-200">
            <input
              type="checkbox"
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              checked={incluyeInactivos}
              onChange={(e) => setIncluyeInactivos(e.target.checked)}
            />
            <span>Incluir inactivos</span>
          </label>

          <button
            type="button"
            onClick={loadAll}
            disabled={isLoading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition-all border border-slate-200 shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <svg className={`h-4 w-4 text-slate-600 ${isLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{isLoading ? "Cargando..." : "Recargar"}</span>
          </button>

          <button
            type="button"
            onClick={() => void startNew()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Lista + Formulario */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Directorio de Usuarios (7 columnas) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900">Personal Registrado</span>
              <span className="text-xs font-black px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {usuarios.length}
              </span>
            </div>
            {/* Contadores */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {counts.activos} activos
              </span>
              {counts.inactivos > 0 && (
                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  {counts.inactivos} inactivos
                </span>
              )}
            </div>
          </div>

          {/* Filtros de Búsqueda y Rol */}
          <div className="p-5 bg-slate-50/70 border-b border-slate-100 space-y-3">
            <div className="relative">
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
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre o username..."
                className="w-full !pl-11 pr-9 py-2.5 bg-white rounded-2xl border border-slate-300 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">Filtrar rol:</span>
              {[
                { key: "TODOS", label: "Todos" },
                { key: "admin", label: "Administradores" },
                { key: "empleado", label: "Empleados" },
              ].map((rf) => {
                const active = roleFilter === rf.key;
                return (
                  <button
                    key={rf.key}
                    type="button"
                    onClick={() => setRoleFilter(rf.key)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {rf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Usuarios */}
          <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {error && (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-200">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-400 font-medium">Cargando personal...</div>
            ) : usuarios.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
                No se encontraron usuarios que coincidan con la búsqueda.
              </div>
            ) : (
              usuarios.map((u) => {
                const isActive = Boolean(u.Activo);
                const isSelected = selectedId === u.IdUsuario;
                const isSelf = u.IdUsuario === currentUserId;
                const isAdmin = (u.Rol ?? "").toString().toLowerCase() === "admin";

                return (
                  <button
                    key={u.IdUsuario}
                    type="button"
                    onClick={() => selectUsuario(u)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-50/75 border-indigo-300 shadow-sm scale-[1.005]"
                        : "bg-white hover:bg-slate-50/80 border-slate-200/90"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                          isAdmin
                            ? "bg-indigo-600 text-white shadow-indigo-100"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {getInitials(u.NombreCompleto)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm truncate">
                            {u.NombreCompleto || "(Sin nombre)"}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                              TÚ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <span>@{u.Username}</span>
                          <span>•</span>
                          <span
                            className={`font-bold ${
                              isAdmin ? "text-indigo-600" : "text-slate-600"
                            }`}
                          >
                            {roleLabel(u.Rol)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Edición / Creación (5 columnas) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                {isEditing ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </div>
              <span className="font-black text-slate-900">
                {isEditing ? "Modificar Usuario" : "Crear Nuevo Usuario"}
              </span>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
              {isEditing ? `#${form.IdUsuario}` : "Nuevo"}
            </span>
          </div>

          <div className="p-6 space-y-4">
            {isEditing && !canEditSelectedUser && (
              <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-semibold">
                <svg className="h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Solo el propio usuario o el administrador autorizado puede editar estos datos.</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={form.NombreCompleto}
                  onChange={(e) => setForm((s) => ({ ...s, NombreCompleto: e.target.value }))}
                  placeholder="Ej: Juan Pérez"
                  disabled={!canEditSelectedUser}
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Nombre de Usuario (Login) *
                </label>
                <input
                  type="text"
                  value={form.Username}
                  onChange={(e) => setForm((s) => ({ ...s, Username: e.target.value }))}
                  placeholder="Ej: jperez"
                  disabled={!canEditSelectedUser}
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
                />
              </div>

              {/* Rol y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                    Rol en Sistema *
                  </label>
                  <select
                    value={form.Rol}
                    onChange={(e) => setForm((s) => ({ ...s, Rol: e.target.value }))}
                    disabled={!canEditSelectedUser}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
                  >
                    <option value="empleado">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                    Estado de la Cuenta
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.Activo)}
                      onChange={(e) => setForm((s) => ({ ...s, Activo: e.target.checked }))}
                      disabled={!canEditSelectedUser}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {form.Activo ? "Usuario Activo" : "Usuario Inactivo"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Contraseña / PIN */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  {isEditing ? "Cambiar Contraseña / PIN (Opcional)" : "Contraseña / PIN de Acceso *"}
                </label>
                <input
                  type="password"
                  value={form.PinAcceso}
                  onChange={(e) => setForm((s) => ({ ...s, PinAcceso: e.target.value }))}
                  placeholder={isEditing ? "Dejar en blanco para mantener actual" : "Ej: pass123."}
                  disabled={!canEditSelectedUser}
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
                />
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Regla de seguridad: Mínimo 6 caracteres, incluir al menos 1 número y 1 símbolo (.,-).
                </p>
              </div>
            </div>

            {/* Mensajes de Estado y Error */}
            {formError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                {formError}
              </div>
            )}

            {formStatus?.type === "ok" && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold">
                {formStatus.message}
              </div>
            )}

            {/* Botones de Acción */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={isSaving || !canEditSelectedUser}
                className="w-full sm:flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Usuario"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => void deactivateSelected()}
                  disabled={isSaving || !canEditSelectedUser}
                  className="w-full sm:w-auto px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-black text-sm transition-all border border-rose-200 disabled:opacity-50"
                >
                  Desactivar
                </button>
              )}

              <button
                type="button"
                onClick={() => void startNew()}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all border border-slate-200"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
