import { apiRequest } from "./api";

export const usuariosService = {
  /** Backend: GET /getusuarios */
  getUsuarios({ incluyeInactivos } = {}) {
    return apiRequest("/getusuarios", { params: { incluyeInactivos } });
  },

  /** Backend: GET /getusuario/:id */
  getUsuario(id, { incluyeInactivos } = {}) {
    return apiRequest(`/getusuario/${id}`, { params: { incluyeInactivos } });
  },

  /** Backend: POST /postusuario */
  crearUsuario(payload) {
    return apiRequest("/postusuario", { method: "POST", body: payload });
  },

  /** Backend: PUT /putusuario/:id */
  actualizarUsuario(id, payload) {
    return apiRequest(`/putusuario/${id}`, { method: "PUT", body: payload });
  },

  /** Backend: DELETE /deleteusuario/:id */
  eliminarUsuario(id) {
    return apiRequest(`/deleteusuario/${id}`, { method: "DELETE" });
  },
};
