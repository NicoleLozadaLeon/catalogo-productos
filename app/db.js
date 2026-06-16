// db.js — cliente PostgreSQL
// Las credenciales vienen SIEMPRE de variables de entorno, nunca hardcodeadas.
require('dotenv').config();
const { Pool } = require('pg');

// Validar que la contraseña venga del entorno (Regla del Cero)
if (!process.env.DB_PASSWORD) {
  console.warn('⚠️  DB_PASSWORD no está definida. Usando fallback solo para desarrollo local.');
}

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'catalogo',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // RDS exige SSL en producción; en local (Docker) se desactiva
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Inicializar tabla si no existe
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id          SERIAL PRIMARY KEY,
      nombre      VARCHAR(200) NOT NULL,
      descripcion TEXT,
      precio      NUMERIC(10,2) NOT NULL DEFAULT 0,
      stock       INTEGER NOT NULL DEFAULT 0,
      categoria   VARCHAR(100),
      imagen_url  TEXT,
      creado_en   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  console.log('✅ Tabla "productos" lista.');
}

module.exports = { pool, initDB };
