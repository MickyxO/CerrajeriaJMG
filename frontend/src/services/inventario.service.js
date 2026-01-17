import { apiRequest } from "./api";

export const inventarioService = {
  /** Backend: GET /getmovimientosinventario?idItem&fechaInicio&fechaFin&limit */
  getMovimientos({ idItem, fechaInicio, fechaFin, limit } = {}) {
    return apiRequest("/getmovimientosinventario", {
      params: { idItem, fechaInicio, fechaFin, limit },
    });
  },

  /** Backend: POST /postajustestock */
  ajustarStock({ idItem, nuevoStockActual, idUsuario, comentario } = {}) {
    return apiRequest("/postajustestock", {
      method: "POST",
      body: { idItem, nuevoStockActual, idUsuario, comentario },
    });
  },
};
