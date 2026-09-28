-- =========================================================================
-- MIGRACIÓN: 2026-09-23 - Estandarización de Timestamps en UTC
-- =========================================================================
-- Descripción:
-- Ajusta los valores por defecto de las columnas timestamp a timezone('UTC', now())
-- para que coincidan con la estrategia del backend y evita desfases por zona horaria.

-- 1. Ajustar columnas por defecto
ALTER TABLE movimientos_caja 
    ALTER COLUMN fecha_hora SET DEFAULT timezone('UTC', now());

ALTER TABLE movimientos_inventario 
    ALTER COLUMN fecha SET DEFAULT timezone('UTC', now());

ALTER TABLE caja 
    ALTER COLUMN hora_apertura SET DEFAULT timezone('UTC', now());

ALTER TABLE ventas 
    ALTER COLUMN fecha_venta SET DEFAULT timezone('UTC', now());

-- 2. Sincronizar registros previos que se habían almacenado con hora local en vez de UTC
UPDATE movimientos_caja 
SET fecha_hora = fecha_hora + interval '6 hours' 
WHERE id_movimiento IN (37, 38, 39, 40);

UPDATE movimientos_inventario 
SET fecha = fecha + interval '6 hours' 
WHERE id_movimiento BETWEEN 214 AND 223;

