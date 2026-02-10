const pool = require("../../config/db");

const BUSINESS_TZ = process.env.DB_TIMEZONE || process.env.APP_TIMEZONE || 'America/Mexico_City';

function parseRange(rangeRaw) {
  const range = (rangeRaw ?? "7d").toString().toLowerCase();
  if (range === "7d" || range === "week" || range === "semana") {
    return { key: "7d", days: 7 };
  }
  if (range === "30d" || range === "1m" || range === "month" || range === "mes") {
    return { key: "30d", days: 30 };
  }
  if (range === "90d" || range === "3m" || range === "3months" || range === "tresmeses") {
    return { key: "90d", days: 90 };
  }
  throw new Error("Rango inválido. Usa range=7d|30d|90d");
}

function rangeStartDate(days) {
  const ms = Number(days) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

class ReportesService {
  async getBestSellers({ range, limit } = {}) {
    const { key, days } = parseRange(range);
    const lim = Math.max(1, Math.min(100, Number(limit) || 10));
    const desde = rangeStartDate(days);

    const query = `
      SELECT
        dv.id_item AS "IdItem",
        COALESCE(NULLIF(dv.nombre_item_snapshot, ''), i.nombre) AS "Nombre",
        SUM(dv.cantidad) AS "Unidades",
        SUM(dv.subtotal) AS "Ingresos"
      FROM detalle_ventas dv
      JOIN ventas v ON v.id_venta = dv.id_venta
      LEFT JOIN items i ON i.id_item = dv.id_item
      WHERE dv.id_item IS NOT NULL
        AND v.fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC')
        AND (v.notas IS NULL OR v.notas NOT LIKE '%[ANULADA]%')
        AND COALESCE(v.total, 0) <> 0
      GROUP BY dv.id_item, "Nombre"
      ORDER BY "Unidades" DESC, "Ingresos" DESC
      LIMIT $2
    `;

    const { rows } = await pool.query(query, [desde, lim]);
    return {
      range: key,
      desde: desde.toISOString(),
      hasta: new Date().toISOString(),
      limit: lim,
      data: rows.map((r) => ({
        IdItem: r.IdItem,
        Nombre: r.Nombre,
        Unidades: Number(r.Unidades || 0),
        Ingresos: Number(r.Ingresos || 0),
      })),
    };
  }

  async getWorstSellers({ range, limit, incluyeInactivos } = {}) {
    const { key, days } = parseRange(range);
    const lim = Math.max(1, Math.min(100, Number(limit) || 10));
    const desde = rangeStartDate(days);

    const onlyActivos = !Boolean(incluyeInactivos);

    // Incluye items con 0 ventas en el periodo.
    // Usamos agregación condicional para no contar ventas fuera de rango y mantener LEFT JOIN.
    const query = `
      SELECT
        i.id_item AS "IdItem",
        i.nombre AS "Nombre",
        COALESCE(SUM(
          CASE
            WHEN v.id_venta IS NOT NULL
             AND v.fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC')
             AND (v.notas IS NULL OR v.notas NOT LIKE '%[ANULADA]%')
             AND COALESCE(v.total, 0) <> 0
            THEN dv.cantidad
            ELSE 0
          END
        ), 0) AS "Unidades",
        COALESCE(SUM(
          CASE
            WHEN v.id_venta IS NOT NULL
             AND v.fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC')
             AND (v.notas IS NULL OR v.notas NOT LIKE '%[ANULADA]%')
             AND COALESCE(v.total, 0) <> 0
            THEN dv.subtotal
            ELSE 0
          END
        ), 0) AS "Ingresos"
      FROM items i
      LEFT JOIN detalle_ventas dv ON dv.id_item = i.id_item
      LEFT JOIN ventas v ON v.id_venta = dv.id_venta
      WHERE ($2::boolean = true OR i.activo = true)
      GROUP BY i.id_item, i.nombre
      ORDER BY "Unidades" ASC, "Ingresos" ASC, i.nombre ASC
      LIMIT $3
    `;

    const { rows } = await pool.query(query, [desde, !onlyActivos, lim]);
    return {
      range: key,
      desde: desde.toISOString(),
      hasta: new Date().toISOString(),
      limit: lim,
      data: rows.map((r) => ({
        IdItem: r.IdItem,
        Nombre: r.Nombre,
        Unidades: Number(r.Unidades || 0),
        Ingresos: Number(r.Ingresos || 0),
      })),
    };
  }

  async getReporteItem(idItem, { range } = {}) {
    const id = Number(idItem);
    if (!Number.isFinite(id) || id <= 0) throw new Error("IdItem inválido");

    const { key, days } = parseRange(range);
    const desde = rangeStartDate(days);

    const itemRes = await pool.query(
      `SELECT id_item AS "IdItem", nombre AS "Nombre" FROM items WHERE id_item = $1 LIMIT 1`,
      [id]
    );
    if (itemRes.rows.length === 0) throw new Error("Item no encontrado");
    const item = itemRes.rows[0];

    const resumenQuery = `
      SELECT
        COALESCE(SUM(dv.cantidad), 0) AS "Unidades",
        COALESCE(SUM(dv.subtotal), 0) AS "Ingresos",
        COALESCE(COUNT(DISTINCT v.id_venta), 0) AS "Tickets"
      FROM detalle_ventas dv
      JOIN ventas v ON v.id_venta = dv.id_venta
      WHERE dv.id_item = $1
        AND v.fecha_venta >= ($2::timestamptz AT TIME ZONE 'UTC')
        AND (v.notas IS NULL OR v.notas NOT LIKE '%[ANULADA]%')
        AND COALESCE(v.total, 0) <> 0
    `;

    const byDayQuery = `
      SELECT
        DATE(timezone($3, v.fecha_venta AT TIME ZONE 'UTC')) AS "Fecha",
        COALESCE(SUM(dv.cantidad), 0) AS "Unidades",
        COALESCE(SUM(dv.subtotal), 0) AS "Ingresos"
      FROM detalle_ventas dv
      JOIN ventas v ON v.id_venta = dv.id_venta
      WHERE dv.id_item = $1
        AND v.fecha_venta >= ($2::timestamptz AT TIME ZONE 'UTC')
        AND (v.notas IS NULL OR v.notas NOT LIKE '%[ANULADA]%')
        AND COALESCE(v.total, 0) <> 0
      GROUP BY DATE(timezone($3, v.fecha_venta AT TIME ZONE 'UTC'))
      ORDER BY "Fecha" ASC
    `;

    const [resumenRes, byDayRes] = await Promise.all([
      pool.query(resumenQuery, [id, desde]),
      pool.query(byDayQuery, [id, desde, BUSINESS_TZ]),
    ]);

    const resumen = resumenRes.rows[0] || { Unidades: 0, Ingresos: 0, Tickets: 0 };
    const unidades = Number(resumen.Unidades || 0);
    const ingresos = Number(resumen.Ingresos || 0);
    const tickets = Number(resumen.Tickets || 0);

    return {
      range: key,
      desde: desde.toISOString(),
      hasta: new Date().toISOString(),
      item,
      resumen: {
        Unidades: unidades,
        Ingresos: ingresos,
        Tickets: tickets,
        PrecioPromedio: unidades > 0 ? ingresos / unidades : 0,
      },
      porDia: (byDayRes.rows || []).map((r) => ({
        Fecha: r.Fecha,
        Unidades: Number(r.Unidades || 0),
        Ingresos: Number(r.Ingresos || 0),
      })),
    };
  }
}

module.exports = new ReportesService();
