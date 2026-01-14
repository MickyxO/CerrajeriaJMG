import { apiRequest } from "./api";

export const combosService = {
  /** Backend: GET /getcombos */
  getCombos() {
    return apiRequest("/getcombos");
  },

  /** Backend: GET /getcombo/:id */
  getCombo(id) {
    return apiRequest(`/getcombo/${id}`);
  },

  /** Backend: POST /postcombo */
  crearCombo(payload) {
    return apiRequest("/postcombo", { method: "POST", body: payload });
  },

  /** Backend: PUT /putcombo/:id */
  actualizarCombo(id, payload) {
    return apiRequest(`/putcombo/${id}`, { method: "PUT", body: payload });
  },

  /** Backend: DELETE /deletecombo/:id */
  eliminarCombo(id) {
    return apiRequest(`/deletecombo/${id}`, { method: "DELETE" });
  },
};
