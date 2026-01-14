import { apiRequest } from "./api";

export const itemsService = {
  /** Backend: GET /getitems */
  getItems() {
    return apiRequest("/getitems");
  },

  /** Backend: GET /getitems/categoria/:idCategoria */
  getItemsPorCategoria(idCategoria) {
    return apiRequest(`/getitems/categoria/${idCategoria}`);
  },

  /** Backend: GET /getitems/marca/:marca */
  getItemsPorMarca(marca) {
    return apiRequest(`/getitems/marca/${encodeURIComponent(marca)}`);
  },

  /** Backend: GET /getitems/clasificacion/:clasificacion */
  getItemsPorClasificacion(clasificacion) {
    return apiRequest(
      `/getitems/clasificacion/${encodeURIComponent(clasificacion)}`
    );
  },

  /** Backend: GET /buscaritems?q=... */
  buscarItems(q) {
    return apiRequest("/buscaritems", { params: { q } });
  },

  /** Backend: POST /postitem */
  crearItem(payload) {
    return apiRequest("/postitem", { method: "POST", body: payload });
  },

  /** Backend: PUT /putitem/:id */
  actualizarItem(id, payload) {
    return apiRequest(`/putitem/${id}`, { method: "PUT", body: payload });
  },

  /** Backend: DELETE /deleteitem/:id */
  eliminarItem(id) {
    return apiRequest(`/deleteitem/${id}`, { method: "DELETE" });
  },
};
