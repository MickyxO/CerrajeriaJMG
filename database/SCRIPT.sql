-- 1. USUARIOS 
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    -- Debe almacenar hash bcrypt (≈60 chars), no el PIN en claro
    pin_acceso VARCHAR(255) NOT NULL, 
    rol VARCHAR(20) DEFAULT 'empleado', 
    activo BOOLEAN DEFAULT TRUE,
    username VARCHAR(255) UNIQUE NOT NULL
);

-- 2. CATEGORIAS 
CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    clasificacion TEXT NOT NULL DEFAULT 'Producto Automotriz' -- Sera producto automotriz, producto residencial y servicios
);

-- 3. PRODUCTOS Y SERVICIOS (Items individuales)
CREATE TABLE items (
    id_item SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL, 
    descripcion TEXT,
    imagen_url TEXT,
    id_categoria INT REFERENCES categorias(id_categoria),
    precio_venta NUMERIC(10,2) NOT NULL,
    costo_referencia NUMERIC(10,2), 
    
    -- Control de Inventario
    es_servicio BOOLEAN DEFAULT FALSE, 
    stock_actual INT DEFAULT 0,
    stock_minimo INT DEFAULT 2, 
    
    -- Datos Automotrices
    compatibilidad_marca VARCHAR(255), 
    tipo_chip VARCHAR(50), 
    frecuencia VARCHAR(20),

    activo BOOLEAN DEFAULT TRUE 
);

-- 4. VENTAS (Cabecera)
CREATE TABLE ventas (
    id_venta SERIAL PRIMARY KEY,
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT REFERENCES usuarios(id_usuario), 
    nombre_cliente VARCHAR(100) DEFAULT 'Mostrador', 
    total NUMERIC(10,2) NOT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'Efectivo', 
    notas TEXT,
    subtotal NUMERIC(10,2) DEFAULT 0,
    monto_iva NUMERIC(10,2) DEFAULT 0 
);

-- 5. DETALLE DE VENTA
CREATE TABLE detalle_ventas (
    id_detalle SERIAL PRIMARY KEY,
    id_venta INT REFERENCES ventas(id_venta) ON DELETE CASCADE,
    id_item INT REFERENCES items(id_item),
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL, -- Precio al momento de la venta
    subtotal NUMERIC(10,2) NOT NULL,

    -- Snapshots: para que cambios posteriores en items/combos no alteren ventas históricas
    nombre_item_snapshot VARCHAR(150),
    id_combo INT REFERENCES combos(id_combo),
    nombre_combo_snapshot VARCHAR(100),
    precio_combo_unitario_snapshot NUMERIC(10,2),
    combo_cantidad_snapshot INT
);

-- 6. MOVIMIENTOS DE INVENTARIO
CREATE TABLE movimientos_inventario (
    id_movimiento SERIAL PRIMARY KEY,
    id_item INT REFERENCES items(id_item),
    tipo_movimiento VARCHAR(20) NOT NULL, 
    cantidad INT NOT NULL, 
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT REFERENCES usuarios(id_usuario),
    comentario TEXT 
);


-- 7. DEFINICIÓN DE COMBOS 
CREATE TABLE combos (
    id_combo SERIAL PRIMARY KEY,
    nombre_combo VARCHAR(100) NOT NULL, 
    precio_sugerido_combo NUMERIC(10,2) NULL 
);

-- 8. CONTENIDO DE LOS COMBOS
-- Relaciona qué items componen el combo
CREATE TABLE combo_items (
    id_combo_item SERIAL PRIMARY KEY,
    id_combo INT REFERENCES combos(id_combo) ON DELETE CASCADE,
    id_item INT REFERENCES items(id_item), -- El componente (Chip, Espadín, etc.)
    cantidad_default INT DEFAULT 1 -- Cuántos de este item lleva el combo
);

-- 9. CONTROL DE CAJA (Corte de Caja)
CREATE TABLE caja (
    id_caja SERIAL PRIMARY KEY,
    fecha_apertura DATE DEFAULT CURRENT_DATE, -- Fecha del corte
    hora_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hora_cierre TIMESTAMP, 
    
    monto_inicial NUMERIC(10,2) NOT NULL,
    monto_final NUMERIC(10,2),
    monto_actual NUMERIC(10,2) NOT NULL, 
    
    id_usuario_apertura INT REFERENCES usuarios(id_usuario),
    id_usuario_cierre INT REFERENCES usuarios(id_usuario),
    
    estado VARCHAR(20) DEFAULT 'ABIERTA', -- 'ABIERTA', 'CERRADA'
    
    -- Restricción: Solo una caja abierta por día 
    CONSTRAINT unique_fecha_caja UNIQUE (fecha_apertura) 
);

-- 10. SALIDAS DE DINERO (Gastos / Retiros)
CREATE TABLE movimientos_caja (
    id_movimiento SERIAL PRIMARY KEY,
    id_caja INT REFERENCES caja(id_caja), -- Relacionado al corte del día
    monto NUMERIC(10,2) NOT NULL, 
    metodo_pago VARCHAR(50) DEFAULT 'Efectivo', 
    tipo_movimiento VARCHAR(20) DEFAULT 'SALIDA', -- 'SALIDA' (Gasto), 'RETIRO' (Al jefe)
    concepto VARCHAR(255) NOT NULL, -- Ej: "Compra de Thiner", "Coca cola", "Adelanto nomina"
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT REFERENCES usuarios(id_usuario)
);