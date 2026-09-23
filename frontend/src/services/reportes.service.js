import { apiRequest } from "./api";

export const reportesService = {
  getResumenGeneral({ range = "7d" } = {}) {
    return apiRequest("/reportes/resumen-general", { params: { range } });
  },

  getBestSellers({ range = "7d", limit = 10 } = {}) {
    return apiRequest("/reportes/best-sellers", { params: { range, limit } });
  },

  getWorstSellers({ range = "7d", limit = 10, incluyeInactivos = false } = {}) {
    return apiRequest("/reportes/worst-sellers", { params: { range, limit, incluyeInactivos } });
  },

  getReporteItem(idItem, { range = "7d" } = {}) {
    return apiRequest(`/reportes/item/${idItem}`, { params: { range } });
  },
};
