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

// ── Proxy de imágenes S3 (/image/<key>) ───────────────────────────────────
// Sirve imágenes directamente desde S3 sin pre-signed URLs.
// Funciona tanto para uploads/ (original) como thumbnails/ (miniatura Lambda).
if (process.env.USE_S3 === 'true') {
  const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
  const s3proxy = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

  app.get('/image/*', async (req, res) => {
    try {
      const key = req.params[0];
      const { Body, ContentType } = await s3proxy.send(
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
      );
      res.setHeader('Content-Type', ContentType || 'image/jpeg');
      Body.pipe(res);
    } catch (_err) {
      res.status(404).send('Image not found');
    }
  });
}

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
