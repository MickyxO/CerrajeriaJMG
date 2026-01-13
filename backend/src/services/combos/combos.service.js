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
                            'id_item', ci.id_item,
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
                            'id_item', ci.id_item,
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

    // Actualizar un combo: nombre, precio sugerido y su lista de items.
    // Si se envía "Items", se interpreta como el ESTADO FINAL del combo:
    // - Items: []  => deja el combo sin items
    // - Items omitido => no toca las relaciones
    async updateCombo(id, cuerpo) {
        const { NombreCombo, PrecioSugerido, Items } = cuerpo || {};

        const tieneCambiosCabecera = (NombreCombo !== undefined) || (PrecioSugerido !== undefined);
        const tieneCambiosItems = (Items !== undefined);

        if (!tieneCambiosCabecera && !tieneCambiosItems) {
            throw new Error("No hay campos válidos para actualizar (NombreCombo, PrecioSugerido, Items).");
        }

        if (PrecioSugerido !== undefined && PrecioSugerido !== null && isNaN(PrecioSugerido)) {
            throw new Error("El precio sugerido debe ser numérico o null.");
        }

        if (Items !== undefined && !Array.isArray(Items)) {
            throw new Error("Items debe ser un arreglo.");
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Bloqueo para evitar carreras mientras actualizamos cabecera + relaciones
            const existe = await client.query(
                "SELECT 1 FROM combos WHERE id_combo = $1 FOR UPDATE",
                [id]
            );
            if (existe.rowCount === 0) {
                throw new Error("Combo no encontrado.");
            }

            // 1) Actualizar cabecera (si aplica)
            if (tieneCambiosCabecera) {
                const mapaCampos = {
                    'NombreCombo': 'nombre_combo',
                    'PrecioSugerido': 'precio_sugerido_combo'
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

                if (columnas.length > 0) {
                    valores.push(id);
                    const query = `UPDATE combos SET ${columnas.join(", ")} WHERE id_combo = $${contador}`;
                    await client.query(query, valores);
                }
            }

            // 2) Reemplazar lista de items (si aplica)
            if (tieneCambiosItems) {
                // Borramos estado anterior
                await client.query("DELETE FROM combo_items WHERE id_combo = $1", [id]);

                // Insertamos estado nuevo
                if (Items.length > 0) {
                    // Validación rápida: todos los IdItem deben existir
                    const idsUnicos = [...new Set(Items.map(i => i?.IdItem).filter(v => v !== undefined && v !== null))];
                    if (idsUnicos.length !== Items.length) {
                        // Hay undefined/null o repetidos; igual permitimos repetidos? mejor bloquear
                        // Si quieres permitir duplicados, lo ajustamos.
                        const algunInvalido = Items.some(i => !i || i.IdItem === undefined || i.IdItem === null);
                        if (algunInvalido) {
                            throw new Error("Cada item debe incluir IdItem.");
                        }
                    }

                    const resItems = await client.query(
                        "SELECT id_item FROM items WHERE id_item = ANY($1::int[])",
                        [idsUnicos]
                    );
                    const encontrados = new Set(resItems.rows.map(r => r.id_item));
                    const faltantes = idsUnicos.filter(x => !encontrados.has(x));
                    if (faltantes.length > 0) {
                        throw new Error(`Los siguientes IdItem no existen: ${faltantes.join(', ')}`);
                    }

                    for (const item of Items) {
                        if (!item || item.IdItem === undefined || item.IdItem === null) {
                            throw new Error("Cada item debe incluir IdItem.");
                        }

                        const cantidad = (item.Cantidad === undefined || item.Cantidad === null) ? 1 : Number(item.Cantidad);
                        if (!Number.isFinite(cantidad) || cantidad <= 0) {
                            throw new Error("Cantidad debe ser un número mayor que 0.");
                        }

                        await client.query(
                            `INSERT INTO combo_items (id_combo, id_item, cantidad_default)
                             VALUES ($1, $2, $3)`,
                            [id, item.IdItem, cantidad]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            return await this.getComboById(id);

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error actualizando combo: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = new CombosService();