class Venta {
    constructor(
        IdVenta,
        FechaVenta = null,
        IdUsuario,
        NombreCliente = 'Mostrador',
        Total,
        MetodoPago = 'Efectivo',
        Notas = null
    ) {
        this.IdVenta = IdVenta;
        this.FechaVenta = FechaVenta;
        this.IdUsuario = IdUsuario;
        this.NombreCliente = NombreCliente;
        this.Total = Total;
        this.MetodoPago = MetodoPago;
        this.Notas = Notas;
    }
}

class DetalleVenta {
    constructor(
        IdDetalleVenta,
        IdVenta,
        IdItem,
        Cantidad,
        PrecioUnitario,
        Subtotal
    ) {
        this.IdDetalleVenta = IdDetalleVenta;
        this.IdVenta = IdVenta;
        this.IdItem = IdItem;
        this.Cantidad = Cantidad;
        this.PrecioUnitario = PrecioUnitario;
        this.Subtotal = Subtotal;
    }
}

module.exports = { Venta, DetalleVenta };


