const pool = require("../../config/db");
const Items = require("../../models/items/items.model");

class ItemsService {

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
            row.activo // <--- AGREGADO: Para pasar el estado al modelo
        );
    }

    async getAllItems() {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria 
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE i.activo = TRUE
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

    async getItemsPorCategoria(idCategoria) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria 
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE i.id_categoria = $1 AND i.activo = TRUE
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

    async getItemsPorMarca(nombreMarca) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria 
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE i.compatibilidad_marca ILIKE $1 AND i.activo = TRUE
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

    async getItemsPorNombreParcial(parcial) {
        try {
            const query = `
                SELECT i.*, c.nombre as nombre_categoria 
                FROM items i
                INNER JOIN categorias c ON i.id_categoria = c.id_categoria
                WHERE i.nombre ILIKE $1 AND i.activo = TRUE
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

    async createItem(datos) {
        const { 
            Nombre, Descripcion, IdCategoria, PrecioVenta, CostoReferencia,
            EsServicio, StockActual, StockMinimo, CompatibilidadMarca, TipoChip, Frecuencia 
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
                    es_servicio, stock_actual, stock_minimo, compatibilidad_marca, tipo_chip, frecuencia
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id_item
            `;
            
            const values = [
                Nombre, Descripcion, IdCategoria, PrecioVenta, CostoReferencia || 0,
                EsServicio || false, StockActual || 10, StockMinimo || 2, CompatibilidadMarca, TipoChip, Frecuencia
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

}

module.exports = new ItemsService();