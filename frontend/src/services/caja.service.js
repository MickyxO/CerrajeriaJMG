import { apiRequest } from "./api";

export const cajaService = {
  /** Backend: GET /getcajaestado */
  getEstado() {
    return apiRequest("/getcajaestado");
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

  /** Backend: GET /getmovimientoscaja */
  getMovimientos() {
    return apiRequest("/getmovimientoscaja");
  },

  /** Backend: GET /getresumencaja */
  getResumen() {
    return apiRequest("/getresumencaja");
  },
};
