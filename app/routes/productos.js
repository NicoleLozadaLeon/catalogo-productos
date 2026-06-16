// routes/productos.js — todas las rutas del CRUD
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const { pool } = require('../db');
const { uploadImagen } = require('../s3');

// Multer: almacenamiento en memoria (el buffer lo pasamos a s3.js)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Solo se permiten imágenes (jpg, png, gif, webp)'), ok);
  },
});

// ── GET /productos ── listar todos ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM productos ORDER BY creado_en DESC'
    );
    res.render('productos/index', { productos: rows, titulo: 'Catálogo de Productos' });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { mensaje: 'Error al cargar productos', err });
  }
});

// ── GET /productos/nuevo ── formulario de creación ──────────────────────────
router.get('/nuevo', (_req, res) => {
  res.render('productos/form', { producto: null, titulo: 'Nuevo Producto', accion: '/productos' });
});

// ── POST /productos ── crear nuevo producto ─────────────────────────────────
router.post('/', upload.single('imagen'), async (req, res) => {
  const { nombre, descripcion, precio, stock, categoria } = req.body;
  let imagen_url = null;

  try {
    if (req.file) {
      const ext      = path.extname(req.file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      imagen_url = await uploadImagen(req.file.buffer, fileName, req.file.mimetype);
    }

    await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, stock, categoria, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [nombre, descripcion, parseFloat(precio) || 0, parseInt(stock) || 0, categoria, imagen_url]
    );
    res.redirect('/productos');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { mensaje: 'Error al crear producto', err });
  }
});

// ── GET /productos/:id ── ver detalle ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).render('error', { mensaje: 'Producto no encontrado', err: null });
    res.render('productos/detalle', { producto: rows[0], titulo: rows[0].nombre });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { mensaje: 'Error al cargar producto', err });
  }
});

// ── GET /productos/:id/editar ── formulario de edición ──────────────────────
router.get('/:id/editar', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).render('error', { mensaje: 'Producto no encontrado', err: null });
    res.render('productos/form', {
      producto: rows[0],
      titulo: `Editar: ${rows[0].nombre}`,
      accion: `/productos/${rows[0].id}?_method=PUT`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { mensaje: 'Error al cargar formulario', err });
  }
});

// ── PUT /productos/:id ── actualizar ────────────────────────────────────────
router.put('/:id', upload.single('imagen'), async (req, res) => {
  const { nombre, descripcion, precio, stock, categoria } = req.body;
  try {
    // Obtener imagen actual
    const { rows } = await pool.query('SELECT imagen_url FROM productos WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).render('error', { mensaje: 'Producto no encontrado', err: null });

    let imagen_url = rows[0].imagen_url; // conservar imagen existente por defecto

    if (req.file) {
      const ext      = path.extname(req.file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      imagen_url = await uploadImagen(req.file.buffer, fileName, req.file.mimetype);
    }

    await pool.query(
      `UPDATE productos
         SET nombre=$1, descripcion=$2, precio=$3, stock=$4, categoria=$5, imagen_url=$6
       WHERE id=$7`,
      [nombre, descripcion, parseFloat(precio) || 0, parseInt(stock) || 0, categoria, imagen_url, req.params.id]
    );
    res.redirect('/productos');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { mensaje: 'Error al actualizar producto', err });
  }
});

// ── DELETE /productos/:id ── eliminar ───────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
    res.redirect('/productos');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { mensaje: 'Error al eliminar producto', err });
  }
});

module.exports = router;
