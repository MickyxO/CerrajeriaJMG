const VentaService = require("../../services/venta/venta.service");

class VentaController {

	// GET: Obtener lista de ventas (por defecto: hoy). Opcional: rango de fechas.
	async getAll(req, res) {
		try {
			const { fechaInicio, fechaFin } = req.query;
			const ventas = await VentaService.getVentas(fechaInicio, fechaFin);
			res.status(200).json(ventas);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}

	// GET: Obtener detalle de una venta por ID
	async getById(req, res) {
		try {
			const id = req.params.id;
			const venta = await VentaService.getDetalleVenta(id);

			if (!venta) {
				return res.status(404).json({ error: "Venta no encontrada" });
			}

			return res.status(200).json(venta);
		} catch (err) {
			return res.status(500).json({ error: err.message });
		}
	}

	// GET: Buscar ventas por fecha específica (compat con routes actuales)
	async getByFecha(req, res) {
		try {
			const { fecha } = req.query;
			if (!fecha) {
				return res.status(400).json({ error: "El parámetro 'fecha' es obligatorio (YYYY-MM-DD)" });
			}

			const ventas = await VentaService.getVentas(fecha, fecha);
			return res.status(200).json(ventas);
		} catch (err) {
			return res.status(500).json({ error: err.message });
		}
	}

	// GET: Buscar ventas por coincidencia parcial de nombre de cliente (compat con routes actuales)
	async getByClienteName(req, res) {
		try {
			const q = (req.query.q || "").toString().trim();
			if (!q) {
				return res.status(400).json({ error: "El parámetro 'q' es obligatorio" });
			}

			// Nota: el servicio no trae un buscador SQL por nombre_cliente;
			// filtramos en memoria sobre el set retornado.
			const ventas = await VentaService.getVentas(req.query.fechaInicio, req.query.fechaFin);
			const qLower = q.toLowerCase();

			const filtradas = (ventas || []).filter(v => {
				const nombre = (v.nombre_cliente ?? v.NombreCliente ?? "").toString().toLowerCase();
				return nombre.includes(qLower);
			});

			return res.status(200).json(filtradas);
		} catch (err) {
			return res.status(500).json({ error: err.message });
		}
	}

	// GET: Ventas del día con detalle (items agregados)
	async getDetalladasDia(req, res) {
		try {
			const ventas = await VentaService.getVentasDetalladasDia();
			return res.status(200).json(ventas);
		} catch (err) {
			return res.status(500).json({ error: err.message });
		}
	}

	// POST: Crear una venta (datosVenta + carrito)
	async create(req, res) {
		try {
			// Acepta 2 formatos:
			// 1) { datosVenta: {...}, carrito: [...] }
			// 2) { idUsuario, total, metodoPago, nombreCliente, notas, carrito: [...] }
			const body = req.body || {};

			// Flag para IVA/factura (acepta varios nombres por compat)
			const requiereFacturaRaw =
				body?.datosVenta?.requiereFactura ??
				body?.datosVenta?.requiere_factura ??
				body?.requiereFactura ??
				body?.requiere_factura;
			const requiereFactura = requiereFacturaRaw === true || requiereFacturaRaw === 1 || requiereFacturaRaw === 'true';

			const datosVenta = body.datosVenta ?? {
				idUsuario: body.idUsuario,
				total: body.total,
				metodoPago: body.metodoPago,
				nombreCliente: body.nombreCliente,
				notas: body.notas,
				subtotal: body.subtotal,
				montoIva: body.montoIva,
				requiereFactura
			};

			// Si viene en formato 1), garantizamos que el flag quede presente
			if (datosVenta && datosVenta.requiereFactura === undefined) {
				datosVenta.requiereFactura = requiereFactura;
			}

			const carrito = body.carrito ?? body.Carrito;

			if (!Array.isArray(carrito) || carrito.length === 0) {
				return res.status(400).json({ error: "El carrito es obligatorio y debe ser un arreglo con al menos 1 elemento." });
			}
			if (!datosVenta || datosVenta.idUsuario === undefined || datosVenta.total === undefined || !datosVenta.metodoPago) {
				return res.status(400).json({ error: "Faltan campos obligatorios: idUsuario, total, metodoPago." });
			}

			const idVenta = await VentaService.crearVenta(datosVenta, carrito);
			return res.status(201).json({ message: "Venta creada exitosamente", idVenta });
		} catch (err) {
			// Usamos 400 para errores de validación/reglas de negocio (caja cerrada, etc.)
			return res.status(400).json({ error: err.message });
		}
	}

	// PUT: Actualizar metadatos de venta (NombreCliente/Notas)
	async update(req, res) {
		try {
			const id = req.params.id;
			const result = await VentaService.updateVenta(id, req.body);
			return res.status(200).json({ message: "Venta actualizada exitosamente", result });
		} catch (err) {
			return res.status(400).json({ error: err.message });
		}
	}

	// DELETE: Eliminar venta
	async delete(req, res) {
		try {
			const id = req.params.id;
			const result = await VentaService.deleteVenta(id);
			return res.status(200).json(result);
		} catch (err) {
			return res.status(400).json({ error: err.message });
		}
	}
}

module.exports = new VentaController();
