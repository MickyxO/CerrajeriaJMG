class Items {
    constructor(
        IdItem,
        Nombre,
        Descripcion,
        IdCategoria,
        PrecioVenta,
        CostoReferencia = null,
        EsServicio = false,
        StockActual = 0,
        StockMinimo = 2,
        CompatibilidadMarca = null,
        TipoChip = null,
        Frecuencia = null,
        Activo = true,
        ImagenUrl = null
    ) {
        this.IdItem = IdItem;
        this.Nombre = Nombre;
        this.Descripcion = Descripcion;
        this.IdCategoria = IdCategoria;
        this.PrecioVenta = PrecioVenta;
        this.CostoReferencia = CostoReferencia;
        this.EsServicio = EsServicio;
        this.StockActual = StockActual;
        this.StockMinimo = StockMinimo;
        this.CompatibilidadMarca = CompatibilidadMarca;
        this.TipoChip = TipoChip;
        this.Frecuencia = Frecuencia;
        this.Activo = Activo;
        this.ImagenUrl = ImagenUrl;
    }
}

module.exports = Items;