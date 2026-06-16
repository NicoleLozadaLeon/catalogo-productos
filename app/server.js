// server.js — punto de entrada de la aplicación
require('dotenv').config();
const express        = require('express');
const path           = require('path');
const methodOverride = require('method-override');
const { initDB }     = require('./db');
const productosRouter = require('./routes/productos');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Configuración del motor de vistas ─────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middlewares ───────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));           // permite PUT/DELETE desde formularios HTML
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // imágenes locales

// ── Rutas ─────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.redirect('/productos'));
app.use('/productos', productosRouter);

// ── Arrancar servidor ─────────────────────────────────────────────────────
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('❌ Error al iniciar el servidor:', err);
  process.exit(1);
});
