class Usuarios {
    constructor(
        IdUsuario,
        NombreCompleto,
        PinAcceso,
        Rol = 'empleado',
        Activo = true,
        Username
    ) {
        this.IdUsuario = IdUsuario;
        this.NombreCompleto = NombreCompleto;
        this.PinAcceso = PinAcceso;
        this.Rol = Rol;
        this.Activo = Activo;
        this.Username = Username;
    }
}

module.exports = Usuarios;