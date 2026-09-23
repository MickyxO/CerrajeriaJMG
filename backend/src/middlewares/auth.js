// Autenticación simplificada para Intranet Local (sin JWT).
// Las peticiones en la red local se procesan de forma directa.
// La identidad del operador (idUsuario) se envía en las operaciones correspondientes (ventas, caja, ajustes).

function requireAuth(req, res, next) {
  return next();
}

module.exports = {
  requireAuth,
};
