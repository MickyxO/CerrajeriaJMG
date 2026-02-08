import { apiRequest } from "./api";

export const itemsService = {
  /** Backend: GET /getitems */
  getItems({ incluyeInactivos } = {}) {
    return apiRequest("/getitems", { params: { incluyeInactivos: incluyeInactivos ? 1 : undefined } });
  },

  /** Backend: GET /getitem/:id */
  getItemPorId(id, { incluyeInactivos } = {}) {
    return apiRequest(`/getitem/${id}`, { params: { incluyeInactivos: incluyeInactivos ? 1 : undefined } });
  },

  /** Backend: GET /getitems/categoria/:idCategoria */
  getItemsPorCategoria(idCategoria, { incluyeInactivos } = {}) {
    return apiRequest(`/getitems/categoria/${idCategoria}`, {
      params: { incluyeInactivos: incluyeInactivos ? 1 : undefined },
    });
  },

  /** Backend: GET /getitems/marca/:marca */
  getItemsPorMarca(marca, { incluyeInactivos } = {}) {
    return apiRequest(`/getitems/marca/${encodeURIComponent(marca)}`, {
      params: { incluyeInactivos: incluyeInactivos ? 1 : undefined },
    });
  },

  /** Backend: GET /getitems/clasificacion/:clasificacion */
  getItemsPorClasificacion(clasificacion, { incluyeInactivos } = {}) {
    return apiRequest(
      `/getitems/clasificacion/${encodeURIComponent(clasificacion)}`,
      { params: { incluyeInactivos: incluyeInactivos ? 1 : undefined } }
    );
  },

  /** Backend: GET /buscaritems?q=... */
  buscarItems(q, { incluyeInactivos } = {}) {
    return apiRequest("/buscaritems", {
      params: { q, incluyeInactivos: incluyeInactivos ? 1 : undefined },
    });
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

  /** Backend: PUT /putitemimagen/:id (multipart/form-data) */
  subirImagen(id, file) {
    const form = new FormData();
    form.append("imagen", file);
    return apiRequest(`/putitemimagen/${id}`, { method: "PUT", body: form });
  },

  /** Backend: PUT /putitemimagenurl/:id (application/json) */
  subirImagenDesdeUrl(id, url) {
    return apiRequest(`/putitemimagenurl/${id}`, { method: "PUT", body: { url } });
  },

  /** Backend: DELETE /deleteitemimagen/:id */
  eliminarImagen(id) {
    return apiRequest(`/deleteitemimagen/${id}`, { method: "DELETE" });
  },
};
