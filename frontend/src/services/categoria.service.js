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

  /** Backend: PUT /putcategoriaimagen/:id */
  subirImagen(id, file) {
    const formData = new FormData();
    formData.append("imagen", file);
    return apiRequest(`/putcategoriaimagen/${id}`, {
      method: "PUT",
      body: formData,
    });
  },

  /** Backend: PUT /putcategoriaimagenurl/:id */
  subirImagenDesdeUrl(id, url) {
    return apiRequest(`/putcategoriaimagenurl/${id}`, {
      method: "PUT",
      body: { url },
    });
  },

  /** Backend: DELETE /deletecategoriaimagen/:id */
  eliminarImagen(id) {
    return apiRequest(`/deletecategoriaimagen/${id}`, { method: "DELETE" });
  },

  /** Backend: DELETE /deletecategoria/:id */
  eliminarCategoria(id) {
    return apiRequest(`/deletecategoria/${id}`, { method: "DELETE" });
  },
};
