const pool = require("../../config/db");

const BUSINESS_TZ = process.env.DB_TIMEZONE || process.env.APP_TIMEZONE || 'America/Mexico_City';

function parseRange(rangeRaw) {
  const range = (rangeRaw ?? "7d").toString().toLowerCase();
  if (range === "today" || range === "hoy" || range === "1d" || range === "dia") {
    return { key: "today", days: 1, isToday: true };
  }
  if (range === "7d" || range === "week" || range === "semana") {
    return { key: "7d", days: 7 };
  }
  if (range === "30d" || range === "1m" || range === "month" || range === "mes") {
    return { key: "30d", days: 30 };
  }
  if (range === "90d" || range === "3m" || range === "3months" || range === "tresmeses") {
    return { key: "90d", days: 90 };
  }
  if (range === "365d" || range === "1y" || range === "ano" || range === "anio" || range === "year") {
    return { key: "365d", days: 365 };
  }
  throw new Error("Rango inválido. Usa range=today|7d|30d|90d|365d");
}

function rangeStartDate(rangeObj) {
  if (typeof rangeObj === "object" && rangeObj?.isToday) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  const days = typeof rangeObj === "object" ? rangeObj.days : rangeObj;
  const ms = Number(days) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

class ReportesService {
  async getResumenGeneral({ range } = {}) {
    const rangeObj = parseRange(range);
    const desde = rangeStartDate(rangeObj);

    // 1. Resumen de ventas
    const ventasQuery = `
      SELECT
        COALESCE(SUM(v.total), 0) AS "TotalVentas",
        COALESCE(SUM(v.subtotal), 0) AS "SubtotalVentas",
        COALESCE(SUM(v.monto_iva), 0) AS "IvaVentas",
        COALESCE(COUNT(v.id_venta), 0) AS "TotalTickets"
      FROM ventas v
      WHERE v.fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC')
        AND v.estado = 'COMPLETADA'
        AND COALESCE(v.total, 0) <> 0
    `;

    // 2. Resumen de gastos (movimientos_caja tipo SALIDA)
    const gastosQuery = `
      SELECT
        COALESCE(SUM(m.monto), 0) AS "TotalGastos",
        COALESCE(COUNT(m.id_movimiento), 0) AS "TotalMovimientosGastos"
      FROM movimientos_caja m
      WHERE m.fecha_hora >= ($1::timestamptz AT TIME ZONE 'UTC')
        AND COALESCE(m.tipo_movimiento, 'SALIDA') = 'SALIDA'
        AND (m.concepto NOT LIKE '%[ANULADO]%' OR m.concepto IS NULL)
        AND COALESCE(m.monto, 0) > 0
    `;

    // 3. Desglose por métodos de pago
    const metodosQuery = `
      SELECT
        COALESCE(NULLIF(TRIM(v.metodo_pago), ''), 'Efectivo') AS "MetodoPago",
        COALESCE(SUM(v.total), 0) AS "Total",
        COUNT(v.id_venta) AS "Tickets"
      FROM ventas v
      WHERE v.fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC')
        AND v.estado = 'COMPLETADA'
        AND COALESCE(v.total, 0) <> 0
      GROUP BY 1
      ORDER BY "Total" DESC
    `;

    // 4. Tendencia por día (ventas vs gastos)
    const tendenciaQuery = `
      SELECT
        d.fecha::text AS "Fecha",
        COALESCE(v_agg.total_ventas, 0) AS "Ventas",
        COALESCE(v_agg.tickets, 0) AS "Tickets",
        COALESCE(g_agg.total_gastos, 0) AS "Gastos",
        (COALESCE(v_agg.total_ventas, 0) - COALESCE(g_agg.total_gastos, 0)) AS "Ganancia"
      FROM (
        SELECT DISTINCT DATE(timezone($2, fecha AT TIME ZONE 'UTC')) AS fecha
        FROM (
          SELECT fecha_venta AS fecha FROM ventas WHERE fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC') AND estado = 'COMPLETADA'
          UNION
          SELECT fecha_hora AS fecha FROM movimientos_caja WHERE fecha_hora >= ($1::timestamptz AT TIME ZONE 'UTC') AND COALESCE(tipo_movimiento, 'SALIDA') = 'SALIDA'
        ) all_fechas
      ) d
      LEFT JOIN (
        SELECT
          DATE(timezone($2, v.fecha_venta AT TIME ZONE 'UTC')) AS fecha,
          SUM(v.total) AS total_ventas,
          COUNT(v.id_venta) AS tickets
        FROM ventas v
        WHERE v.fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC')
          AND v.estado = 'COMPLETADA'
          AND COALESCE(v.total, 0) <> 0
        GROUP BY 1
      ) v_agg ON v_agg.fecha = d.fecha
      LEFT JOIN (
        SELECT
          DATE(timezone($2, m.fecha_hora AT TIME ZONE 'UTC')) AS fecha,
          SUM(m.monto) AS total_gastos
        FROM movimientos_caja m
        WHERE m.fecha_hora >= ($1::timestamptz AT TIME ZONE 'UTC')
          AND COALESCE(m.tipo_movimiento, 'SALIDA') = 'SALIDA'
          AND (m.concepto NOT LIKE '%[ANULADO]%' OR m.concepto IS NULL)
          AND COALESCE(m.monto, 0) > 0
        GROUP BY 1
      ) g_agg ON g_agg.fecha = d.fecha
      ORDER BY d.fecha ASC
    `;

    // 5. Desempeño por vendedor
    const vendedoresQuery = `
      SELECT
        v.id_usuario AS "IdUsuario",
        COALESCE(u.nombre_completo, u.username, 'Sin asignar') AS "NombreVendedor",
        COALESCE(SUM(v.total), 0) AS "Total",
        COUNT(v.id_venta) AS "Tickets"
      FROM ventas v
      LEFT JOIN usuarios u ON u.id_usuario = v.id_usuario
      WHERE v.fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC')
        AND v.estado = 'COMPLETADA'
        AND COALESCE(v.total, 0) <> 0
      GROUP BY v.id_usuario, "NombreVendedor"
      ORDER BY "Total" DESC
    `;

    const [ventasRes, gastosRes, metodosRes, tendenciaRes, vendedoresRes] = await Promise.all([
      pool.query(ventasQuery, [desde]),
      pool.query(gastosQuery, [desde]),
      pool.query(metodosQuery, [desde]),
      pool.query(tendenciaQuery, [desde, BUSINESS_TZ]),
      pool.query(vendedoresQuery, [desde]),
    ]);

    const vRow = ventasRes.rows[0] || {};
    const gRow = gastosRes.rows[0] || {};

    const totalVentas = Number(vRow.TotalVentas || 0);
    const subtotalVentas = Number(vRow.SubtotalVentas || 0);
    const ivaVentas = Number(vRow.IvaVentas || 0);
    const totalTickets = Number(vRow.TotalTickets || 0);

    const totalGastos = Number(gRow.TotalGastos || 0);
    const totalMovimientosGastos = Number(gRow.TotalMovimientosGastos || 0);

    const gananciaNeta = totalVentas - totalGastos;
    const margenGanancia = totalVentas > 0 ? (gananciaNeta / totalVentas) * 100 : 0;
    const ticketPromedio = totalTickets > 0 ? totalVentas / totalTickets : 0;

    return {
      range: rangeObj.key,
      desde: desde.toISOString(),
      hasta: new Date().toISOString(),
      resumen: {
        totalVentas,
        subtotalVentas,
        ivaVentas,
        totalTickets,
        ticketPromedio,
        totalGastos,
        totalMovimientosGastos,
        gananciaNeta,
        margenGanancia,
      },
      metodosPago: metodosRes.rows.map((r) => ({
        metodo: r.MetodoPago,
        total: Number(r.Total || 0),
        tickets: Number(r.Tickets || 0),
        porcentaje: totalVentas > 0 ? (Number(r.Total || 0) / totalVentas) * 100 : 0,
      })),
      tendenciaDiaria: tendenciaRes.rows.map((r) => ({
        fecha: r.Fecha,
        ventas: Number(r.Ventas || 0),
        tickets: Number(r.Tickets || 0),
        gastos: Number(r.Gastos || 0),
        ganancia: Number(r.Ganancia || 0),
      })),
      vendedores: vendedoresRes.rows.map((r) => ({
        idUsuario: r.IdUsuario,
        nombre: r.NombreVendedor,
        total: Number(r.Total || 0),
        tickets: Number(r.Tickets || 0),
        porcentaje: totalVentas > 0 ? (Number(r.Total || 0) / totalVentas) * 100 : 0,
      })),
    };
  }

  async getBestSellers({ range, limit } = {}) {
    const rangeObj = parseRange(range);
    const lim = Math.max(1, Math.min(100, Number(limit) || 10));
    const desde = rangeStartDate(rangeObj);

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
        AND v.estado = 'COMPLETADA'
        AND COALESCE(v.total, 0) <> 0
      GROUP BY dv.id_item, "Nombre"
      ORDER BY "Unidades" DESC, "Ingresos" DESC
      LIMIT $2
    `;

    const { rows } = await pool.query(query, [desde, lim]);
    return {
      range: rangeObj.key,
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
    const rangeObj = parseRange(range);
    const lim = Math.max(1, Math.min(100, Number(limit) || 10));
    const desde = rangeStartDate(rangeObj);

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
             AND v.estado = 'COMPLETADA'
             AND COALESCE(v.total, 0) <> 0
            THEN dv.cantidad
            ELSE 0
          END
        ), 0) AS "Unidades",
        COALESCE(SUM(
          CASE
            WHEN v.id_venta IS NOT NULL
             AND v.fecha_venta >= ($1::timestamptz AT TIME ZONE 'UTC')
             AND v.estado = 'COMPLETADA'
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
      range: rangeObj.key,
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

    const rangeObj = parseRange(range);
    const desde = rangeStartDate(rangeObj);

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
        AND v.estado = 'COMPLETADA'
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
        AND v.estado = 'COMPLETADA'
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
      range: rangeObj.key,
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
