class Usuarios {
    constructor(
        IdUsuario,
        NombreCompleto,
        PinAcceso,
        Rol = 'empleado',
        Activo = true
    ) {
        this.IdUsuario = IdUsuario;
        this.NombreCompleto = NombreCompleto;
        this.PinAcceso = PinAcceso;
        this.Rol = Rol;
        this.Activo = Activo;
    }
}

module.exports = Usuarios;