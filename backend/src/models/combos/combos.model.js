class Combo {
    constructor(
        IdCombo,
        NombreCombo,
        PrecioSugerido,
        Items = [] // Array de objetos { IdItem, Cantidad }
    ) {
        this.IdCombo = IdCombo;
        this.NombreCombo = NombreCombo;
        this.PrecioSugerido = PrecioSugerido;
        this.Items = Items;
    }
}

module.exports = Combo;