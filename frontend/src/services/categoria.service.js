import { apiRequest } from "./api";

export const categoriaService = {
  /** Backend: GET /getcategorias */
  getCategorias() {
    return apiRequest("/getcategorias");
  },

  /** Backend: GET /getcategoria/:nombre */
  getCategoriaPorNombre(nombre) {
    return apiRequest(`/getcategoria/${encodeURIComponent(nombre)}`);
  },

  /** Backend: GET /getcategoriasclasificacion/:clasificacion */
  getCategoriasPorClasificacion(clasificacion) {
    return apiRequest(
      `/getcategoriasclasificacion/${encodeURIComponent(clasificacion)}`
    );
  },

  /** Backend: POST /postcategoria */
  crearCategoria(payload) {
    return apiRequest("/postcategoria", { method: "POST", body: payload });
  },

  /** Backend: PUT /putcategoria/:id */
  actualizarCategoria(id, payload) {
    return apiRequest(`/putcategoria/${id}`, { method: "PUT", body: payload });
  },

  /** Backend: DELETE /deletecategoria/:id */
  eliminarCategoria(id) {
    return apiRequest(`/deletecategoria/${id}`, { method: "DELETE" });
  },
};
