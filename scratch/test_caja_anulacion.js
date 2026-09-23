const pool = require("../backend/src/config/db");
const VentaService = require("../backend/src/services/venta/venta.service");
const CajaService = require("../backend/src/services/caja/caja.service");

async function test() {
    try {
        console.log("--- 1. Testing Caja Abierta / Única ---");
        // Check current caja
        let cajaActual = await CajaService.getCajaAbierta();
        console.log("Caja abierta actual:", cajaActual ? `ID ${cajaActual.IdCaja}, estado: ${cajaActual.Estado}` : "Ninguna");

        // Try opening if none is open
        if (!cajaActual) {
            const idCaja = await CajaService.abrirCaja(500, 2);
            console.log("Caja abierta creada con éxito:", idCaja);
            cajaActual = await CajaService.getCajaAbierta();
        }

        // Try opening another concurrent caja (should fail with clear error)
        try {
            await CajaService.abrirCaja(200, 2);
            console.error("ERROR: Debió fallar por caja duplicada!");
        } catch (e) {
            console.log("Éxito capturando intento de doble apertura:", e.message);
        }

        console.log("\n--- 2. Testing Venta y Anulación con columna 'estado' ---");
        // Find an item to sell
        const itemRes = await pool.query("SELECT id_item, nombre, stock_actual, precio_venta FROM items WHERE activo = true LIMIT 1");
        const item = itemRes.rows[0];
        console.log("Item seleccionado:", item.nombre, "Stock actual:", item.stock_actual);

        const precio = Number(item.precio_venta);
        const subtotal = precio;
        const total = precio;

        // Create a test sale
        const idVenta = await VentaService.crearVenta(
            {
                idUsuario: 2,
                nombreCliente: "Test Anulación",
                metodoPago: "Efectivo",
                subtotal: subtotal,
                montoIva: 0,
                total: total,
                notas: "Venta de prueba para verificar estado"
            },
            [
                {
                    tipo: 'ITEM',
                    id: item.id_item,
                    cantidad: 1,
                    precio: precio
                }
            ]
        );

        const detalleVenta = await VentaService.getDetalleVenta(idVenta);
        console.log("Venta creada exitosamente:", idVenta, "Estado:", detalleVenta.Estado);

        // Check stock after sale
        const stockAfterSale = await pool.query("SELECT stock_actual FROM items WHERE id_item = $1", [item.id_item]);
        console.log("Stock después de venta:", stockAfterSale.rows[0].stock_actual);

        // Anular la venta
        const anularRes = await VentaService.anularVenta(idVenta, { idUsuario: 2, motivo: "Prueba de sistema" });
        console.log("Resultado de anulación:", anularRes);

        // Check venta estado in DB
        const ventaAnuladaRes = await pool.query("SELECT id_venta, estado, total, subtotal, notas FROM ventas WHERE id_venta = $1", [idVenta]);
        console.log("Venta en BD tras anular:", ventaAnuladaRes.rows[0]);

        // Check stock after anulación
        const stockAfterAnular = await pool.query("SELECT stock_actual FROM items WHERE id_item = $1", [item.id_item]);
        console.log("Stock después de anular:", stockAfterAnular.rows[0].stock_actual);

        // Clean up: close the test caja
        await CajaService.cerrarCaja(2, 500);
        console.log("Caja de prueba cerrada correctamente.");

        console.log("\n--- PRUEBA COMPLETADA EXITOSAMENTE ---");
    } catch (err) {
        console.error("Error en test:", err);
    } finally {
        await pool.end();
    }
}

test();
