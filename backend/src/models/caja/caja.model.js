class Caja {
    constructor(IdCaja, FechaApertura, HoraApertura, MontoInicial, MontoActual, Estado, UsuarioApertura) {
        this.IdCaja = IdCaja;
        this.FechaApertura = FechaApertura;
        this.HoraApertura = HoraApertura;
        this.MontoInicial = MontoInicial;
        this.MontoActual = MontoActual;
        this.Estado = Estado;
        this.UsuarioApertura = UsuarioApertura;
    }
}

class MovimientoCaja {
    constructor(IdMovimiento, IdCaja, Monto, MetodoPago, Concepto, FechaHora, IdUsuario, Tipo = 'SALIDA') {
        this.IdMovimiento = IdMovimiento;
        this.IdCaja = IdCaja;
        this.Monto = Monto;
        this.MetodoPago = MetodoPago;
        this.Concepto = Concepto;
        this.FechaHora = FechaHora;
        this.IdUsuario = IdUsuario;
        this.Tipo = Tipo;
    }
}

module.exports = { Caja, MovimientoCaja };