
import { apiRequest } from "./api";

export const ventasService = {
	/** Backend: GET /getventas?fechaInicio&fechaFin */
	getVentas({ fechaInicio, fechaFin } = {}) {
		return apiRequest("/getventas", { params: { fechaInicio, fechaFin } });
	},

	/** Backend: GET /getventa/:id */
	getVenta(id) {
		return apiRequest(`/getventa/${id}`);
	},

	/** Backend: GET /getventasdetalladasdia */
	getVentasDetalladasDia() {
		return apiRequest("/getventasdetalladasdia");
	},

	/** Backend: GET /buscarventacliente?q=... */
	buscarPorCliente(q) {
		return apiRequest("/buscarventacliente", { params: { q } });
	},

	/** Backend: GET /buscarventafecha?fecha=YYYY-MM-DD */
	buscarPorFecha(fecha) {
		return apiRequest("/buscarventafecha", { params: { fecha } });
	},

	/** Backend: POST /postventa */
	crearVenta({ datosVenta, carrito }) {
		return apiRequest("/postventa", {
			method: "POST",
			body: { datosVenta, carrito },
		});
	},

	/** Backend: PUT /putventa/:id */
	actualizarVenta(id, { NombreCliente, Notas } = {}) {
		return apiRequest(`/putventa/${id}`, {
			method: "PUT",
			body: { NombreCliente, Notas },
		});
	},

	/** Backend: DELETE /deleteventa/:id */
	eliminarVenta(id) {
		return apiRequest(`/deleteventa/${id}`, { method: "DELETE" });
	},
};

