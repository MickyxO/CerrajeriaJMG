const pool = require("../../config/db");
const Items = require("../../models/items/items.model");

let ensureCategoriaImageColumnPromise = null;

async function ensureCategoriaImageColumn() {
    if (!ensureCategoriaImageColumnPromise) {
        ensureCategoriaImageColumnPromise = pool.query(
            "ALTER TABLE categorias ADD COLUMN IF NOT EXISTS imagen_url TEXT"
        );
    }
    await ensureCategoriaImageColumnPromise;
}

class ItemsService {

    _toPositiveInt(value) {
        const n = Number(value);
        if (!Number.isInteger(n) || n <= 0) return null;
        return n;
    }

    // Función auxiliar para mapear de BD (snake_case) a Modelo (PascalCase)
    _mapRowToModel(row) {
        return new Items(
            row.id_item,
            row.nombre,
            row.descripcion,
            row.id_categoria,
            row.precio_venta,
            row.costo_referencia,
            row.es_servicio,
            row.stock_actual,
            row.stock_minimo,
            row.compatibilidad_marca,
            row.tipo_chip,
            row.frecuencia,
            row.activo, // <--- AGREGADO: Para pasar el estado al modelo
            row.imagen_url
        );
    }

    async getAllItems({ incluyeInactivos = false } = {}) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria 
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                ${incluyeInactivos ? "" : "WHERE i.activo = TRUE"}
                ORDER BY i.id_item ASC
            `;
            
            const { rows } = await pool.query(query);
            
            return rows.map(row => {
                const item = this._mapRowToModel(row);
                item.NombreCategoria = row.nombre_categoria; 
                return item;
            });

        } catch (err) {
            console.error("Error obteniendo items: ", err.message);
            throw err;
        }
    }

    async getItemById(idItem, { incluyeInactivos = false } = {}) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE i.id_item = $1 ${incluyeInactivos ? "" : "AND i.activo = TRUE"}
                LIMIT 1
            `;

            const { rows } = await pool.query(query, [idItem]);
            if (!rows || rows.length === 0) return null;

            const item = this._mapRowToModel(rows[0]);
            item.NombreCategoria = rows[0].nombre_categoria;
            return item;
        } catch (err) {
            console.error("Error obteniendo item por ID: ", err.message);
            throw err;
        }
    }

    async getItemsPorCategoria(idCategoria, { incluyeInactivos = false } = {}) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria 
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE i.id_categoria = $1 ${incluyeInactivos ? "" : "AND i.activo = TRUE"}
            `; // <--- MODIFICADO: Agregado filtro activo
            
            const { rows } = await pool.query(query, [idCategoria]);
            
            return rows.map(row => {
                const item = this._mapRowToModel(row);
                item.NombreCategoria = row.nombre_categoria;
                return item;
            });
        } catch (err) {
            console.error("Error obteniendo items por categoría: ", err.message);
            throw err;
        }
    }

    async getItemsPorMarca(nombreMarca, { incluyeInactivos = false } = {}) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria 
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE i.compatibilidad_marca ILIKE $1 ${incluyeInactivos ? "" : "AND i.activo = TRUE"}
            `; // <--- MODIFICADO: Agregado filtro activo
            
            const { rows } = await pool.query(query, [`%${nombreMarca}%`]); 
            
            return rows.map(row => {
                const item = this._mapRowToModel(row);
                item.NombreCategoria = row.nombre_categoria;
                return item;
            });
        } catch (err) {
            console.error("Error obteniendo items por marca: ", err.message);
            throw err;
        }
    }

    async getItemsPorNombreParcial(parcial, { incluyeInactivos = false } = {}) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria 
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE i.nombre ILIKE $1 ${incluyeInactivos ? "" : "AND i.activo = TRUE"}
            `; // <--- MODIFICADO: Agregado filtro activo

            const { rows } = await pool.query(query, [`%${parcial}%`]);
            
            return rows.map(row => {
                const item = this._mapRowToModel(row);
                item.NombreCategoria = row.nombre_categoria;
                return item;
            });
        } catch (err) {
            console.error("Error buscando items: ", err.message);
            throw err;
        }
    }

    async getItemsPorClasificacion(parcial, { incluyeInactivos = false } = {}) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE c.clasificacion ILIKE $1 ${incluyeInactivos ? "" : "AND i.activo = TRUE"}
            `; // <--- MODIFICADO: Agregado filtro activo

            const { rows } = await pool.query(query, [`%${parcial}%`]);
            return rows.map(row => {
                const item = this._mapRowToModel(row);
                item.NombreCategoria = row.nombre_categoria;
                return item;
            });
        }
        catch (err) {
            console.error("Error buscando items por clasificación: ", err.message);
            throw err;
        }
    }

    async getPosCatalogo({
        q = "",
        idCategoria = null,
        incluyeItems = true,
        incluyeServicios = true,
        soloConStock = false,
        limit = 180,
    } = {}) {
        try {
            await ensureCategoriaImageColumn();

            if (!incluyeItems && !incluyeServicios) {
                return { categorias: [], articulos: [] };
            }

            const normalizedLimit = Math.min(Math.max(Number(limit) || 180, 20), 500);
            const qClean = String(q || "").trim();
            const qAsId = this._toPositiveInt(qClean);

            const baseParams = [];
            let idx = 1;
            const baseWhere = ["i.activo = TRUE"];

            if (soloConStock) {
                baseWhere.push("(i.es_servicio = TRUE OR i.stock_actual > 0)");
            }

            if (incluyeItems && !incluyeServicios) {
                baseWhere.push("i.es_servicio = FALSE");
            } else if (!incluyeItems && incluyeServicios) {
                baseWhere.push("i.es_servicio = TRUE");
            }

            if (qClean) {
                if (qAsId) {
                    baseWhere.push(`(
                        i.id_item = $${idx}
                        OR i.nombre ILIKE $${idx + 1}
                        OR COALESCE(i.compatibilidad_marca, '') ILIKE $${idx + 1}
                        OR COALESCE(i.tipo_chip, '') ILIKE $${idx + 1}
                        OR COALESCE(i.frecuencia, '') ILIKE $${idx + 1}
                    )`);
                    baseParams.push(qAsId, `%${qClean}%`);
                    idx += 2;
                } else {
                    baseWhere.push(`(
                        i.nombre ILIKE $${idx}
                        OR COALESCE(i.compatibilidad_marca, '') ILIKE $${idx}
                        OR COALESCE(i.tipo_chip, '') ILIKE $${idx}
                        OR COALESCE(i.frecuencia, '') ILIKE $${idx}
                    )`);
                    baseParams.push(`%${qClean}%`);
                    idx += 1;
                }
            }

            const baseWhereSql = baseWhere.length > 0 ? `WHERE ${baseWhere.join(" AND ")}` : "";

            const categoriasQuery = `
                SELECT
                    c.id_categoria,
                    c.nombre,
                    c.imagen_url,
                    c.clasificacion,
                    COUNT(i.id_item) AS total_items,
                    COUNT(i.id_item) FILTER (WHERE i.es_servicio = TRUE) AS total_servicios
                FROM categorias c
                LEFT JOIN items i ON i.id_categoria = c.id_categoria
                    AND i.activo = TRUE
                    ${soloConStock ? "AND (i.es_servicio = TRUE OR i.stock_actual > 0)" : ""}
                    ${incluyeItems && !incluyeServicios ? "AND i.es_servicio = FALSE" : ""}
                    ${!incluyeItems && incluyeServicios ? "AND i.es_servicio = TRUE" : ""}
                GROUP BY c.id_categoria, c.nombre, c.imagen_url, c.clasificacion
                HAVING COUNT(i.id_item) > 0
                ORDER BY c.nombre ASC
            `;

            const categoriasRes = await pool.query(categoriasQuery);

            const articleParams = [...baseParams];
            let articleWhereSql = baseWhereSql;

            if (idCategoria) {
                const parsedCategoria = this._toPositiveInt(idCategoria);
                if (parsedCategoria) {
                    articleParams.push(parsedCategoria);
                    articleWhereSql = articleWhereSql
                        ? `${articleWhereSql} AND i.id_categoria = $${articleParams.length}`
                        : `WHERE i.id_categoria = $${articleParams.length}`;
                }
            }

            articleParams.push(normalizedLimit);

            const articulosQuery = `
                SELECT
                    i.id_item,
                    i.nombre,
                    i.descripcion,
                    i.id_categoria,
                    i.precio_venta,
                    i.es_servicio,
                    i.stock_actual,
                    i.stock_minimo,
                    i.compatibilidad_marca,
                    i.tipo_chip,
                    i.frecuencia,
                    i.imagen_url,
                    c.nombre AS nombre_categoria,
                    c.clasificacion AS clasificacion_categoria
                FROM items i
                INNER JOIN categorias c ON c.id_categoria = i.id_categoria
                ${articleWhereSql}
                ORDER BY i.id_categoria ASC, i.es_servicio ASC, i.nombre ASC
                LIMIT $${articleParams.length}
            `;

            const articulosRes = await pool.query(articulosQuery, articleParams);

            const categorias = categoriasRes.rows.map((row) => ({
                IdCategoria: row.id_categoria,
                NombreCategoria: row.nombre,
                ImagenUrl: row.imagen_url,
                Clasificacion: row.clasificacion,
                TotalItems: Number(row.total_items) || 0,
                TotalServicios: Number(row.total_servicios) || 0,
            }));

            const articulos = articulosRes.rows.map((row) => ({
                IdItem: row.id_item,
                Nombre: row.nombre,
                Descripcion: row.descripcion,
                IdCategoria: row.id_categoria,
                NombreCategoria: row.nombre_categoria,
                ClasificacionCategoria: row.clasificacion_categoria,
                PrecioVenta: row.precio_venta,
                EsServicio: row.es_servicio,
                StockActual: row.stock_actual,
                StockMinimo: row.stock_minimo,
                CompatibilidadMarca: row.compatibilidad_marca,
                TipoChip: row.tipo_chip,
                Frecuencia: row.frecuencia,
                ImagenUrl: row.imagen_url,
            }));

            return { categorias, articulos };
        } catch (err) {
            console.error("Error obteniendo catálogo POS: ", err.message);
            throw err;
        }
    }

    async createItem(datos) {
        const { 
            Nombre, Descripcion, IdCategoria, PrecioVenta, CostoReferencia,
            EsServicio, StockActual, StockMinimo, CompatibilidadMarca, TipoChip, Frecuencia,
            ImagenUrl
        } = datos;

        if (!Nombre || !IdCategoria || !PrecioVenta) {
            throw new Error("Nombre, IdCategoria y PrecioVenta son obligatorios.");
        }

        try {
            const catCheck = await pool.query('SELECT 1 FROM categorias WHERE id_categoria = $1', [IdCategoria]);
            if (catCheck.rowCount === 0) throw new Error("La categoría especificada no existe.");

            const query = `
                INSERT INTO items (
                    nombre, descripcion, id_categoria, precio_venta, costo_referencia,
                    es_servicio, stock_actual, stock_minimo, compatibilidad_marca, tipo_chip, frecuencia,
                    imagen_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id_item
            `;
            
            const values = [
                Nombre, Descripcion, IdCategoria, PrecioVenta, CostoReferencia || 0,
                EsServicio || false, StockActual || 10, StockMinimo || 2, CompatibilidadMarca, TipoChip, Frecuencia,
                ImagenUrl || null
            ];

            const { rows } = await pool.query(query, values);
            return rows[0].id_item;

        } catch (err) {
            console.error("Error creando item: ", err.message);
            throw err;
        }
    }

    async updateItem(id, cuerpo) {
        const mapaCampos = {
            'Nombre': 'nombre',
            'Descripcion': 'descripcion',
            'IdCategoria': 'id_categoria',
            'PrecioVenta': 'precio_venta',
            'CostoReferencia': 'costo_referencia',
            'EsServicio': 'es_servicio',
            'StockActual': 'stock_actual',
            'StockMinimo': 'stock_minimo',
            'CompatibilidadMarca': 'compatibilidad_marca',
            'TipoChip': 'tipo_chip',
            'Frecuencia': 'frecuencia',
            'ImagenUrl': 'imagen_url',
            'Activo': 'activo' 
        };

        const columnas = [];
        const valores = [];
        let contador = 1;

        for (const [campoFront, campoBD] of Object.entries(mapaCampos)) {
            if (cuerpo[campoFront] !== undefined) {
                columnas.push(`${campoBD} = $${contador}`);
                valores.push(cuerpo[campoFront]);
                contador++;
            }
        }

        if (columnas.length === 0) {
            throw new Error("No hay campos válidos para actualizar.");
        }

        valores.push(id); 

        try {
            const query = `UPDATE items SET ${columnas.join(", ")} WHERE id_item = $${contador} RETURNING *`;
            const { rowCount, rows } = await pool.query(query, valores);

            if (rowCount === 0) throw new Error("Item no encontrado.");

            return this._mapRowToModel(rows[0]);

        } catch (err) {
            console.error("Error actualizando item: ", err.message);
            throw err;
        }
    }

    async deleteItem(id) {
        try {
            
            const query = "UPDATE items SET activo = FALSE WHERE id_item = $1 RETURNING id_item";
            
            const { rowCount } = await pool.query(query, [id]);
            
            if (rowCount === 0) throw new Error("Item no encontrado.");
            
            return { message: "Item desactivado correctamente (Borrado lógico)" };

        } catch (err) {
            console.error("Error desactivando item: ", err.message);
            throw err;
        }
    }

    async setImagenUrl(idItem, imagenUrl) {
        try {
            const query = `UPDATE items SET imagen_url = $1 WHERE id_item = $2 RETURNING *`;
            const { rowCount, rows } = await pool.query(query, [imagenUrl, idItem]);
            if (rowCount === 0) throw new Error("Item no encontrado.");
            return this._mapRowToModel(rows[0]);
        } catch (err) {
            console.error("Error actualizando imagen del item: ", err.message);
            throw err;
        }
    }

}

module.exports = new ItemsService();