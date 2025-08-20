-- ==============================
-- ENUMS (MySQL usa ENUM nativo)
-- ==============================

CREATE TABLE USUARIO (
    IdUsuario INT AUTO_INCREMENT PRIMARY KEY,
    NombreCompleto VARCHAR(255) NOT NULL,
    Telefono INT NOT NULL,
    Correo VARCHAR(255) NULL,
    NombreUsuario VARCHAR(255) NOT NULL,
    Contrasena VARCHAR(255) NOT NULL
);

CREATE TABLE CATEGORIA (
    IdCategoria INT AUTO_INCREMENT PRIMARY KEY,
    NombreCategoria VARCHAR(255) NOT NULL,
    Clasificacion ENUM('Automotriz', 'Residencial') NOT NULL DEFAULT 'Automotriz'
);

CREATE TABLE PRODUCTO (
    IdProducto INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(255) NOT NULL,
    Descripcion VARCHAR(255) NOT NULL,
    IdCategoria INT NOT NULL,
    Activo BOOLEAN NOT NULL,
    PrecioVenta DECIMAL(10,2) NOT NULL,
    Marca VARCHAR(255) NOT NULL,
    CONSTRAINT fk_producto_categoria FOREIGN KEY (IdCategoria) REFERENCES CATEGORIA(IdCategoria)
);


CREATE TABLE DETALLE_VENTA (
    IdDetalle INT AUTO_INCREMENT PRIMARY KEY,
    IdVenta INT NOT NULL,
    IdLote INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Descuento FLOAT NULL,
    CONSTRAINT fk_detalle_venta FOREIGN KEY (IdVenta) REFERENCES VENTA(IdVenta),
    CONSTRAINT fk_detalle_lote FOREIGN KEY (IdLote) REFERENCES LOTE(IdLote)
);


CREATE TABLE CLIENTE (
    IdCliente INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(255) NOT NULL,
    Telefono VARCHAR(255) NULL,
    Email VARCHAR(255) NULL,
    RFC VARCHAR(255) NULL,
    Direccion VARCHAR(255) NULL
);

CREATE TABLE VENTA (
    IdVenta INT AUTO_INCREMENT PRIMARY KEY,
    FechaVenta DATETIME NOT NULL,
    IdCliente INT NOT NULL,
    TotalVenta DECIMAL(10,2) NOT NULL,
    MetodoPago ENUM('Efectivo', 'Tarjeta', 'Deposito', 'Transferencia') NOT NULL DEFAULT 'Efectivo',
    CONSTRAINT fk_venta_cliente FOREIGN KEY (IdCliente) REFERENCES CLIENTE(IdCliente)
);

CREATE TABLE PROVEEDOR (
    IdProveedor INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(255) NOT NULL,
    Telefono VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NULL,
    Direccion VARCHAR(255) NULL
);

CREATE TABLE LOTE (
    IdLote INT AUTO_INCREMENT PRIMARY KEY,
    IdProducto INT NOT NULL,
    IdProveedor INT NOT NULL,
    FechaCompra DATETIME NOT NULL,
    PrecioCompraUnitario DECIMAL(10,2) NOT NULL,
    CantidadComprada INT NOT NULL,
    CantidadDisponible INT NOT NULL,
    CONSTRAINT fk_lote_producto FOREIGN KEY (IdProducto) REFERENCES PRODUCTO(IdProducto),
    CONSTRAINT fk_lote_proveedor FOREIGN KEY (IdProveedor) REFERENCES PROVEEDOR(IdProveedor)
);

CREATE TABLE MOVIMIENTO_INVENTARIO (
    IdMovimiento INT AUTO_INCREMENT PRIMARY KEY,
    IdLote INT NOT NULL,
    TipoMovimiento ENUM('Entrada', 'Salida') NOT NULL DEFAULT 'Entrada',
    Fecha DATETIME NOT NULL,
    Cantidad INT NOT NULL,
    CONSTRAINT fk_movimiento_lote FOREIGN KEY (IdLote) REFERENCES LOTE(IdLote)
);
