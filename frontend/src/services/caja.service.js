import { apiRequest } from "./api";

export const cajaService = {
  /** Backend: GET /getcajaestado */
  getEstado({ fecha } = {}) {
    return apiRequest("/getcajaestado", { params: { fecha } });
  },

  /** Backend: GET /getcajasfechas */
  getFechas({ limit } = {}) {
    return apiRequest("/getcajasfechas", { params: { limit } });
  },

  /** Backend: POST /postabrircaja */
  abrirCaja({ montoInicial, idUsuario }) {
    return apiRequest("/postabrircaja", {
      method: "POST",
      body: { montoInicial, idUsuario },
    });
  },

  /** Backend: POST /postcerrarcaja */
  cerrarCaja({ montoFinalFisico, idUsuario }) {
    return apiRequest("/postcerrarcaja", {
      method: "POST",
      body: { montoFinalFisico, idUsuario },
    });
  },

  /** Backend: POST /postgasto */
  registrarGasto(payload) {
    return apiRequest("/postgasto", { method: "POST", body: payload });
  },

  /** Backend: PUT /putgasto/:id */
  actualizarGasto(id, payload) {
    return apiRequest(`/putgasto/${id}`, { method: "PUT", body: payload });
  },

  /** Backend: POST /anulargasto/:id */
  anularGasto(id, payload) {
    return apiRequest(`/anulargasto/${id}`, { method: "POST", body: payload });
  },

  /** Backend: GET /getmovimientoscaja */
  getMovimientos({ fecha } = {}) {
    return apiRequest("/getmovimientoscaja", { params: { fecha } });
  },

  /** Backend: GET /getresumencaja */
  getResumen({ fecha } = {}) {
    return apiRequest("/getresumencaja", { params: { fecha } });
  },
};
