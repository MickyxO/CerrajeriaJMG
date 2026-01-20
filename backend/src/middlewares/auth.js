const jwt = require('jsonwebtoken');

function getJwtSecret() {
	const secret = process.env.JWT_SECRET;
	const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
	if (!secret) {
		if (isProd) {
			throw new Error('JWT_SECRET no está configurado (requerido en producción).');
		}
		return 'dev-insecure-secret-change-me';
	}
	return secret;
}

function signAccessToken(payload) {
	const secret = getJwtSecret();
	const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
	return jwt.sign(payload, secret, { expiresIn });
}

function requireAuth(req, res, next) {
	const header = req.headers.authorization || '';
	const [type, token] = header.split(' ');

	if (type !== 'Bearer' || !token) {
		return res.status(401).json({ error: 'Falta token (Authorization: Bearer ...)' });
	}

	let decoded;
	try {
		decoded = jwt.verify(token, getJwtSecret());
	} catch (err) {
		return res.status(401).json({ error: 'Token inválido o expirado' });
	}

	req.auth = decoded;
	return next();
}

module.exports = {
	signAccessToken,
	requireAuth,
};
