class Categoria {
    constructor(IdCategoria, NombreCategoria, Clasificacion, ImagenUrl = null) {
        this.IdCategoria = IdCategoria;
        this.NombreCategoria = NombreCategoria;
        this.Clasificacion = Clasificacion;
        this.ImagenUrl = ImagenUrl;
    }
}

module.exports = Categoria;