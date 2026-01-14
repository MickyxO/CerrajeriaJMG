import { apiRequest } from "./api";

export const usuariosService = {
  /** Backend: GET /getusuarios */
  getUsuarios() {
    return apiRequest("/getusuarios");
  },

  /** Backend: GET /getusuario/:id */
  getUsuario(id) {
    return apiRequest(`/getusuario/${id}`);
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
