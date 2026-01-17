import { useEffect, useMemo, useRef, useState } from "react";
import { usuariosService } from "../../services/usuarios.service";
import { useAuth } from "../../hooks/useAuth";

import "./UsuariosPage.css";

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
  if (r === "admin" || r === "administrador") return "Admin";
  return "Empleado";
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();

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
  const canEditSelectedUser = !isEditing || (currentUserId !== null && form?.IdUsuario === currentUserId);

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

  function confirmDiscardIfDirty() {
    if (!isDirty) return true;
    return window.confirm("Tienes cambios sin guardar. ¿Deseas descartarlos?");
  }

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await usuariosService.getUsuarios({ incluyeInactivos: incluyeInactivos ? 1 : 0 });
      setUsuariosRaw(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Error cargando usuarios");
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

  function startNew() {
    if (!confirmDiscardIfDirty()) return;
    setSelectedId(null);
    const next = emptyForm();
    setForm(next);
    initialFormRef.current = pickComparable(next);
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });
  }

  function selectUsuario(u) {
    if (!confirmDiscardIfDirty()) return;
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
  }

  function validate() {
    const nombre = (form?.NombreCompleto ?? "").toString().trim();
    const username = (form?.Username ?? "").toString().trim();
    const rol = (form?.Rol ?? "").toString().trim();
    const pin = (form?.PinAcceso ?? "").toString();

    if (!nombre) return "Nombre completo es obligatorio.";
    if (!username) return "Username es obligatorio.";
    if (!rol) return "Rol es obligatorio.";

    if (!isEditing) {
      if (!pin) return "PIN/contraseña es obligatoria para crear.";
    }

    return null;
  }

  async function save() {
    setFormError(null);
    setFormStatus({ type: "idle", message: "" });

    if (!canEditSelectedUser) {
      setFormError("No es posible editar un usuario que no es el propio.");
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
        setFormStatus({ type: "ok", message: "Usuario actualizado." });
      } else {
        await usuariosService.crearUsuario({
          NombreCompleto: form.NombreCompleto,
          Username: form.Username,
          Rol: form.Rol,
          PinAcceso: form.PinAcceso,
        });
        setFormStatus({ type: "ok", message: "Usuario creado." });
      }

      await loadAll();

      // Mantener selección si está editando
      if (!isEditing) {
        startNew();
      } else {
        const next = { ...form, PinAcceso: "" };
        setForm(next);
        initialFormRef.current = pickComparable(next);
      }
    } catch (e) {
      setFormError(e?.message || "Error guardando usuario");
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateSelected() {
    if (!isEditing) return;

    if (!canEditSelectedUser) {
      setFormError("No es posible editar un usuario que no es el propio.");
      return;
    }

    if (form.IdUsuario === currentUserId) {
      setFormError("No puedes desactivar tu propio usuario mientras estás logueado.");
      return;
    }
    const ok = window.confirm("¿Desactivar este usuario? (No podrá iniciar sesión)");
    if (!ok) return;

    setIsSaving(true);
    setFormError(null);
    try {
      await usuariosService.eliminarUsuario(form.IdUsuario);
      setFormStatus({ type: "ok", message: "Usuario desactivado." });
      await loadAll();
      startNew();
    } catch (e) {
      setFormError(e?.message || "Error desactivando usuario");
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
    <div className="usrPage">
      <div className="usrTop">
        <div>
          <h1 className="usrTitle">Usuarios</h1>
          <div className="usrSubtitle">Alta, edición, roles y activación</div>
        </div>

        <div className="usrTopActions">
          <label className="usrToggle">
            <input
              type="checkbox"
              checked={incluyeInactivos}
              onChange={(e) => setIncluyeInactivos(e.target.checked)}
            />
            <span>Incluir inactivos</span>
          </label>
          <button type="button" className="usrBtn" onClick={loadAll} disabled={isLoading}>
            Recargar
          </button>
          <button type="button" className="usrBtnPrimary" onClick={startNew}>
            Nuevo
          </button>
        </div>
      </div>

      <div className="usrGrid">
        <div className="panel">
          <div className="panelHead">
            <strong>Lista</strong>
            <span className="pill">{usuarios.length}</span>
          </div>
          <div className="panelBody">
            <div className="usrFilters">
              <label className="usrField usrFieldFull">
                <span>Buscar (nombre o username)</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Juan, admin, ..." />
              </label>

              <label className="usrField">
                <span>Rol</span>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="TODOS">Todos</option>
                  <option value="empleado">Empleado</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <div className="usrCounts">
                <div>
                  <strong>{counts.total}</strong> total
                </div>
                <div>
                  <strong>{counts.activos}</strong> activos
                </div>
                <div>
                  <strong>{counts.inactivos}</strong> inactivos
                </div>
              </div>
            </div>

            {error ? <div className="usrError">{error}</div> : null}
            {isLoading ? <div className="usrLoading">Cargando...</div> : null}

            <div className="usrList">
              {usuarios.map((u) => {
                const isActive = Boolean(u.Activo);
                const selected = selectedId === u.IdUsuario;
                return (
                  <button
                    key={u.IdUsuario}
                    type="button"
                    className={selected ? "usrRow usrRowActive" : "usrRow"}
                    onClick={() => selectUsuario(u)}
                  >
                    <div className="usrRowMain">
                      <div className="usrRowName">{u.NombreCompleto || "(Sin nombre)"}</div>
                      <div className="usrRowMeta">
                        @{u.Username || "-"} · {roleLabel(u.Rol)}
                        {u.IdUsuario === currentUserId ? " · Tú" : ""}
                      </div>
                    </div>
                    <div className={isActive ? "usrBadge usrBadgeOk" : "usrBadge usrBadgeOff"}>
                      {isActive ? "Activo" : "Inactivo"}
                    </div>
                  </button>
                );
              })}
              {!isLoading && usuarios.length === 0 ? (
                <div className="usrEmpty">Sin usuarios para esos filtros.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">
            <strong>{isEditing ? "Editar" : "Crear"}</strong>
            <span className="pill">{isEditing ? `#${form.IdUsuario}` : "Nuevo"}</span>
          </div>
          <div className="panelBody">
            {isEditing && !canEditSelectedUser ? (
              <div className="usrWarn">No es posible editar un usuario que no es el propio.</div>
            ) : null}

            <div className="usrForm">
              <label className="usrField usrFieldFull">
                <span>Nombre completo *</span>
                <input
                  value={form.NombreCompleto}
                  onChange={(e) => setForm((s) => ({ ...s, NombreCompleto: e.target.value }))}
                  placeholder="Juan Pérez"
                  disabled={!canEditSelectedUser}
                />
              </label>

              <label className="usrField usrFieldFull">
                <span>Username * (para login)</span>
                <input
                  value={form.Username}
                  onChange={(e) => setForm((s) => ({ ...s, Username: e.target.value }))}
                  placeholder="juan"
                  disabled={!canEditSelectedUser}
                />
              </label>

              <label className="usrField">
                <span>Rol *</span>
                <select
                  value={form.Rol}
                  onChange={(e) => setForm((s) => ({ ...s, Rol: e.target.value }))}
                  disabled={!canEditSelectedUser}
                >
                  <option value="empleado">Empleado</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="usrToggle usrToggleInline">
                <input
                  type="checkbox"
                  checked={Boolean(form.Activo)}
                  onChange={(e) => setForm((s) => ({ ...s, Activo: e.target.checked }))}
                  disabled={!canEditSelectedUser}
                />
                <span>Activo</span>
              </label>

              <label className="usrField usrFieldFull">
                <span>{isEditing ? "Cambiar PIN (opcional)" : "PIN/contraseña *"}</span>
                <input
                  value={form.PinAcceso}
                  onChange={(e) => setForm((s) => ({ ...s, PinAcceso: e.target.value }))}
                  placeholder={isEditing ? "Deja vacío para mantener" : "Ej: pass123,"}
                  disabled={!canEditSelectedUser}
                />
                <div className="usrHint">Regla: mínimo 6 caracteres, incluye número y símbolo (.,-).</div>
              </label>
            </div>

            {formError ? <div className="usrError">{formError}</div> : null}
            {formStatus?.type === "ok" ? <div className="usrOk">{formStatus.message}</div> : null}

            <div className="usrActions">
              <button
                type="button"
                className="usrBtnPrimary"
                onClick={save}
                disabled={isSaving || !canEditSelectedUser}
                title={!canEditSelectedUser ? "Solo puedes editar tu propio usuario" : ""}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className="usrBtnDanger"
                  onClick={deactivateSelected}
                  disabled={isSaving || !canEditSelectedUser}
                  title={!canEditSelectedUser ? "Solo puedes editar tu propio usuario" : ""}
                >
                  Desactivar
                </button>
              ) : null}
              <button type="button" className="usrBtn" onClick={startNew} disabled={isSaving}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
