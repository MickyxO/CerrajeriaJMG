const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  

  max: 10, // Equivalente a connectionLimit
  idleTimeoutMillis: 30000, // Cierra conexiones inactivas tras 30s
  connectionTimeoutMillis: 2000, // Tiempo máx para intentar conectar
});


pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL', err);
  process.exit(-1);
});

module.exports = pool;