const pool = require("../backend/src/config/db");
const CajaService = require("../backend/src/services/caja/caja.service");
const VentaService = require("../backend/src/services/venta/venta.service");

async function testAutoCaja() {
    try {
        console.log("--- TEST AUTO-CAJA (SILENT JUST-IN-TIME) ---");

        // 1. Cerrar cualquier caja que estuviera abierta
        const cajaExistente = await CajaService.getCajaAbierta();
        if (cajaExistente) {
            console.log("Cerrando caja previa existente ID:", cajaExistente.IdCaja);
            await CajaService.cerrarCaja(2, Number(cajaExistente.MontoActual || 0));
        }

        // 2. Comprobar que no hay caja abierta
        let abierta = await CajaService.getCajaAbierta();
        console.log("Caja abierta inicial:", abierta ? `ID ${abierta.IdCaja}` : "Ninguna");

        // 3. Simular una venta en efectivo sin haber abierto caja previamente
        const itemRes = await pool.query("SELECT id_item, nombre, stock_actual, precio_venta FROM items WHERE activo = true LIMIT 1");
        const item = itemRes.rows[0];
        const precio = Number(item.precio_venta);

        console.log("\nRegistrando venta en efectivo con caja cerrada...");
        const idVenta = await VentaService.crearVenta(
            {
                idUsuario: 2,
                nombreCliente: "Cliente Prueba AutoCaja",
                metodoPago: "Efectivo",
                subtotal: precio,
                montoIva: 0,
                total: precio,
                notas: "Venta sin caja previa abierta"
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
        console.log("¡Éxito! Venta creada con ID:", idVenta);

        // 4. Verificar que la caja se abrió automáticamente
        abierta = await CajaService.getCajaAbierta();
        console.log("Caja auto-creada ID:", abierta?.IdCaja, "Monto actual:", abierta?.MontoActual, "Estado:", abierta?.Estado);

        // 5. Modificar el monto inicial en cualquier momento
        console.log("\nModificando monto inicial (fondo de caja) a $500...");
        const resMonto = await CajaService.actualizarMontoInicialCaja(500, 2);
        console.log("Monto inicial actualizado. Nuevo monto inicial:", resMonto.monto_inicial, "Nuevo monto actual:", resMonto.monto_actual, "Diferencia aplicada:", resMonto.diferencia_aplicada);

        // 6. Registrar un gasto en efectivo
        console.log("\nRegistrando gasto rápido de $35 en efectivo...");
        const idGasto = await CajaService.registrarGasto({
            Monto: 35,
            Concepto: "Garrafón de agua",
            IdUsuario: 2,
            MetodoPago: "Efectivo"
        });
        console.log("Gasto registrado con ID:", idGasto);

        // 7. Verificar saldo final en caja
        abierta = await CajaService.getCajaAbierta();
        console.log("Saldo final en caja tras gasto:", abierta?.MontoActual);

        // 8. Cerrar caja al final
        console.log("\nCerrando caja...");
        const cajaCerrada = await CajaService.cerrarCaja(2, Number(abierta.MontoActual));
        console.log("Caja cerrada correctamente con monto final:", cajaCerrada.monto_final);

        console.log("\n=== TODAS LAS PRUEBAS DE AUTO-CAJA PASARON EXITOSAMENTE ===");
    } catch (err) {
        console.error("Error en test auto-caja:", err);
    } finally {
        await pool.end();
    }
}

testAutoCaja();

