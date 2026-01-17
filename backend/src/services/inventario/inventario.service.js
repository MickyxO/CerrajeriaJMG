const pool = require("../../config/db");

class InventarioService {
  async getMovimientos({ idItem, fechaInicio, fechaFin, limit = 200 } = {}) {
    const params = [];
    const where = [];

    if (idItem !== undefined && idItem !== null && String(idItem).trim() !== "") {
      params.push(Number(idItem));
      where.push(`mi.id_item = $${params.length}`);
    }

    if (fechaInicio) {
      params.push(fechaInicio);
      where.push(`DATE(mi.fecha) >= $${params.length}`);
    }

    if (fechaFin) {
      params.push(fechaFin);
      where.push(`DATE(mi.fecha) <= $${params.length}`);
    }

    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 200));
    params.push(safeLimit);

    const filtro = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const query = `
      SELECT
        mi.id_movimiento,
        mi.id_item,
        i.nombre as nombre_item,
        mi.tipo_movimiento,
        mi.cantidad,
        mi.fecha,
        mi.comentario,
        mi.id_usuario,
        u.nombre_completo as usuario
      FROM movimientos_inventario mi
      LEFT JOIN items i ON mi.id_item = i.id_item
      LEFT JOIN usuarios u ON mi.id_usuario = u.id_usuario
      ${filtro}
      ORDER BY mi.fecha DESC, mi.id_movimiento DESC
      LIMIT $${params.length}
    `;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async ajustarStock({ idItem, nuevoStockActual, idUsuario, comentario } = {}) {
    const itemId = Number(idItem);
    const nuevo = Number(nuevoStockActual);
    const usuarioId = Number(idUsuario);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new Error("idItem inválido");
    }
    if (!Number.isFinite(nuevo) || nuevo < 0) {
      throw new Error("nuevoStockActual inválido (debe ser >= 0)");
    }
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new Error("idUsuario inválido");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const resItem = await client.query(
        "SELECT id_item, nombre, stock_actual FROM items WHERE id_item = $1",
        [itemId]
      );
      if (resItem.rows.length === 0) {
        throw new Error("Item no encontrado");
      }

      const row = resItem.rows[0];
      const stockActual = Number(row.stock_actual ?? 0);
      const delta = Math.trunc(nuevo - stockActual);

      await client.query(
        "UPDATE items SET stock_actual = $1 WHERE id_item = $2",
        [Math.trunc(nuevo), itemId]
      );

      const autoComment = `Ajuste stock: ${stockActual} -> ${Math.trunc(nuevo)}`;
      const comentarioFinal = (comentario ?? "").toString().trim() || autoComment;

      await client.query(
        `INSERT INTO movimientos_inventario (id_item, tipo_movimiento, cantidad, id_usuario, comentario)
         VALUES ($1, $2, $3, $4, $5)`,
        [itemId, "AJUSTE", delta, usuarioId, comentarioFinal]
      );

      await client.query("COMMIT");

      return {
        IdItem: itemId,
        Nombre: row.nombre,
        StockAnterior: stockActual,
        StockActual: Math.trunc(nuevo),
        Delta: delta,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new InventarioService();
