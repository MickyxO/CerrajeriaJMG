require('dotenv').config();

const { Pool } = require('pg');
const dns = require('dns');

// Forzar IPv4 para evitar retardos de resolución DNS en Windows localhost
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (error) {
  // Versiones viejas de Node
}

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: No se encontró DATABASE_URL en el archivo .env");
  process.exit(1);
}

const sessionTimeZone =
  process.env.DB_TIMEZONE ||
  process.env.APP_TIMEZONE ||
  'America/Mexico_City';

const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.delete('channel_binding');

if (sessionTimeZone) {
  const existingOptions = databaseUrl.searchParams.get('options') || '';
  const hasTimeZone = /TimeZone\s*=|timezone\s*=|TimeZone\b/.test(existingOptions);
  if (!hasTimeZone) {
    const nextOptions = `${existingOptions} -c TimeZone=${sessionTimeZone}`.trim();
    databaseUrl.searchParams.set('options', nextOptions);
  }
}

const pool = new Pool({
  connectionString: databaseUrl.toString(),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

if (sessionTimeZone && typeof pool.on === 'function') {
  pool.on('connect', (client) => {
    client
      .query("SELECT set_config('TimeZone', $1, true)", [sessionTimeZone])
      .catch((err) => {
        console.warn('⚠️ No se pudo aplicar DB_TIMEZONE en la sesión:', err.message);
      });
  });
}

pool.connect()
  .then((client) => {
    console.log(`✅ ¡ÉXITO! Conexión local establecida con PostgreSQL (${databaseUrl.hostname}:${databaseUrl.port || 5432}/${databaseUrl.pathname.replace(/^\//, '')})`);
    client.release();
  })
  .catch((err) => {
    console.error('❌ Error conectando a PostgreSQL local:', err.message);
  });

module.exports = pool;