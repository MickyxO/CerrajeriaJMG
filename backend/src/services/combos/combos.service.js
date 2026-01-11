const pool = require("../../config/db");
const Combo = require("../../models/combos/combos.model");

class CombosService {

    // Helper para formatear
    _mapRowToModel(row) {
        // Postgres devuelve los items como un array de JSON gracias a json_agg
        // Si no tiene items, devuelve null, así que aseguramos un array vacío
        const itemsFormateados = (row.lista_items || []).filter(i => i !== null).map(i => ({
            IdItem: i.id_item,
            NombreItem: i.nombre_item, // Opcional, útil para mostrar en pantalla
            Cantidad: i.cantidad_default
        }));

        return new Combo(
            row.id_combo,
            row.nombre_combo,
            row.precio_sugerido_combo,
            itemsFormateados
        );
    }

    async getAllCombos() {
        try {
            // 
            const query = `
                SELECT 
                    c.id_combo, 
                    c.nombre_combo, 
                    c.precio_sugerido_combo,
                    json_agg(
                        json_build_object(
                            'id_item', i.id_item,
                            'nombre_item', it.nombre,
                            'cantidad_default', ci.cantidad_default
                        )
                    ) as lista_items
                FROM combos c
                LEFT JOIN combo_items ci ON c.id_combo = ci.id_combo
                LEFT JOIN items it ON ci.id_item = it.id_item
                GROUP BY c.id_combo
                ORDER BY c.nombre_combo ASC
            `;
            
            const { rows } = await pool.query(query);
            return rows.map(row => this._mapRowToModel(row));
        } catch (err) {
            console.error("Error obteniendo combos: ", err.message);
            throw err;
        }
    }

    async getComboById(id) {
        try {
            const query = `
                SELECT 
                    c.id_combo, 
                    c.nombre_combo, 
                    c.precio_sugerido_combo,
                    json_agg(
                        json_build_object(
                            'id_item', i.id_item,
                            'nombre_item', it.nombre,
                            'cantidad_default', ci.cantidad_default
                        )
                    ) as lista_items
                FROM combos c
                LEFT JOIN combo_items ci ON c.id_combo = ci.id_combo
                LEFT JOIN items it ON ci.id_item = it.id_item
                WHERE c.id_combo = $1
                GROUP BY c.id_combo
            `;
            
            const { rows } = await pool.query(query, [id]);
            
            if (rows.length === 0) return null;
            return this._mapRowToModel(rows[0]);
        } catch (err) {
            console.error("Error obteniendo combo por ID: ", err.message);
            throw err;
        }
    }

    // Crear un combo implica guardar la cabecera Y sus relaciones
    async createCombo(datos) {
        /*
          datos esperados:
          {
            "NombreCombo": "Paquete Jetta",
            "PrecioSugerido": 500,
            "Items": [
               { "IdItem": 10, "Cantidad": 1 },
               { "IdItem": 25, "Cantidad": 1 }
            ]
          }
        */
        const { NombreCombo, PrecioSugerido, Items } = datos;

        if (!NombreCombo) throw new Error("El nombre del combo es obligatorio.");
        if (PrecioSugerido == null || isNaN(PrecioSugerido)) {
            throw new Error("El precio sugerido del combo es obligatorio y debe ser numérico.");
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Insertar Cabecera
            const queryCombo = `
                INSERT INTO combos (nombre_combo, precio_sugerido_combo)
                VALUES ($1, $2)
                RETURNING id_combo
            `;
            const resCombo = await client.query(queryCombo, [NombreCombo, PrecioSugerido]);
            const newId = resCombo.rows[0].id_combo;

            // 2. Insertar Items (Si hay)
            if (Items && Items.length > 0) {
                for (const item of Items) {
                    const queryRel = `
                        INSERT INTO combo_items (id_combo, id_item, cantidad_default)
                        VALUES ($1, $2, $3)
                    `;
                    await client.query(queryRel, [newId, item.IdItem, item.Cantidad || 1]);
                }
            }

            await client.query('COMMIT');
            return newId;

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error creando combo: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    async deleteCombo(id) {
        try {
            // Gracias al ON DELETE CASCADE en la tabla combo_items, 
            // al borrar el padre se borran los hijos solos.
            const query = "DELETE FROM combos WHERE id_combo = $1 RETURNING id_combo";
            const { rowCount } = await pool.query(query, [id]);

            if (rowCount === 0) throw new Error("Combo no encontrado.");
            
            return { message: "Combo eliminado correctamente." };
        } catch (err) {
            console.error("Error eliminando combo: ", err.message);
            throw err;
        }
    }
}

module.exports = new CombosService();