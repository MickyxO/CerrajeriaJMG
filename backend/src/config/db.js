require('dotenv').config();

const dns = require('dns');

// ==========================================
// FIX: FORZAR IPV4
// ==========================================
// Windows y Node a veces se pierden intentando usar IPv6.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (error) {
  // Si usas una versión vieja de Node, esto no afecta.
}

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: No se encontró DATABASE_URL en el archivo .env");
  process.exit(1);
}

// ==========================================
// Timezone de sesión (PostgreSQL)
// ==========================================
// Si el servidor/Neon está en UTC, funciones como CURRENT_DATE pueden cambiar de día
// en horas de la tarde/noche según tu zona horaria local.
// Configura DB_TIMEZONE (IANA) en el .env, por ejemplo: America/Mexico_City.
const sessionTimeZone =
  process.env.DB_TIMEZONE ||
  process.env.APP_TIMEZONE ||
  process.env.TZ ||
  null;

const useWebSocket = String(process.env.NEON_USE_WEBSOCKET || '').toLowerCase() === 'true';
const databaseUrl = new URL(process.env.DATABASE_URL);
const dbHost = (databaseUrl.hostname || '').toLowerCase();
const isLocalDbHost = dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === '::1';
const dbSslEnv = String(process.env.DB_SSL || '').toLowerCase();
const useSsl = dbSslEnv ? dbSslEnv === 'true' : !isLocalDbHost;

// Evita parámetros que a veces dan problemas con clientes Node.
databaseUrl.searchParams.delete('channel_binding');

// Si configuramos la TZ vía options, se aplica desde el inicio de la sesión (sin condiciones de carrera).
if (sessionTimeZone) {
  const existingOptions = databaseUrl.searchParams.get('options') || '';
  const hasTimeZone = /TimeZone\s*=|timezone\s*=|TimeZone\b/.test(existingOptions);
  if (!hasTimeZone) {
    const nextOptions = `${existingOptions} -c TimeZone=${sessionTimeZone}`.trim();
    databaseUrl.searchParams.set('options', nextOptions);
  }
}

// Extraemos el hostname para logs/SSL
const url = databaseUrl;

console.log(`⏳ Intentando conectar a PostgreSQL (Host: ${url.hostname})...`);
if (!isLocalDbHost) {
  console.log(`   (Si es Neon y es la primera vez, puede tardar hasta 20-30 seg en despertar)`);
}
console.log(`🔐 SSL PostgreSQL: ${useSsl ? 'habilitado' : 'deshabilitado'}`);

if (useWebSocket) {
  console.log('🔌 Modo Neon WebSocket habilitado (NEON_USE_WEBSOCKET=true)');
}

let pool;

if (useWebSocket) {
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;

  pool = new Pool({
    connectionString: databaseUrl.toString(),
  });
} else {
  const { Pool } = require('pg');
  const poolConfig = {
    connectionString: databaseUrl.toString(),
    // 40 segundos para dar tiempo de sobra a que despierte.
    connectionTimeoutMillis: 40000,
    idleTimeoutMillis: 40000,
    keepAlive: true,
  };

  if (useSsl) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
      // SNI (Server Name Indication)
      servername: url.hostname,
    };
  }

  pool = new Pool({
    ...poolConfig,
  });
}

if (sessionTimeZone && typeof pool?.on === 'function') {
  pool.on('connect', (client) => {
    // set_config es seguro y evita interpolar strings en SQL.
    client
      .query("SELECT set_config('TimeZone', $1, true)", [sessionTimeZone])
      .catch((err) => {
        console.warn('⚠️ No se pudo aplicar DB_TIMEZONE en la sesión:', err.message);
      });
  });
  console.log(`🕒 DB session timezone: ${sessionTimeZone}`);
} else if (!sessionTimeZone) {
  console.log('🕒 DB session timezone: (no configurado)');
}

pool.connect()
    .then(client => {
    console.log('✅ ¡ÉXITO! Conexión establecida con PostgreSQL');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error conectando a la BD:', err.message);
        
        if (err.message.includes('timeout')) {
            console.warn('💡 Consejo: Neon puede estar despertando. Vuelve a intentar en 10 segundos.');
        }
    });

module.exports = pool;