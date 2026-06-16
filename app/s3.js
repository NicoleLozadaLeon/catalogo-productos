// s3.js — integración con Amazon S3
// En desarrollo (USE_S3=false): guarda en disco, devuelve ruta local.
// En producción (USE_S3=true): sube a S3, devuelve la clave S3 (no URL pública).
//   Las URLs se generan como pre-signed URLs en tiempo de petición via getImageUrl().
require('dotenv').config();
const path = require('path');
const fs   = require('fs');

const USE_S3  = process.env.USE_S3 === 'true';
const BUCKET  = process.env.S3_BUCKET;
const REGION  = process.env.AWS_REGION || 'us-east-1';

let s3Client;
if (USE_S3) {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({ region: REGION });
}

/**
 * Sube una imagen al almacenamiento.
 * - Local: guarda en app/uploads/ y devuelve la ruta relativa (/uploads/file).
 * - S3:    sube a uploads/ y devuelve la clave S3 (uploads/file).
 */
async function uploadImagen(fileBuffer, fileName, mimeType) {
  if (USE_S3) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const key = `uploads/${fileName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        fileBuffer,
      ContentType: mimeType,
    }));
    return key; // clave S3, no URL pública
  }

  // Modo local
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, fileName), fileBuffer);
  return `/uploads/${fileName}`;
}

/**
 * Extrae la clave S3 relativa desde una URL completa o clave relativa.
 * "https://bucket.s3.amazonaws.com/uploads/x.jpg" → "uploads/x.jpg"
 * "uploads/x.jpg" → "uploads/x.jpg"
 */
function extractS3Key(value) {
  if (!value) return null;
  if (value.startsWith('https://')) {
    const m = value.match(/\.amazonaws\.com\/(.+)$/);
    return m ? m[1] : null;
  }
  return value;
}

/**
 * Devuelve la URL para mostrar una imagen.
 * - Local: devuelve la ruta tal cual (/uploads/foo.jpg).
 * - S3: devuelve la ruta del proxy interno (/image/uploads/foo.jpg).
 *   Acepta tanto URL completa como clave relativa en imagen_url.
 */
function getImageUrl(key) {
  if (!key) return null;
  if (!USE_S3 || key.startsWith('/')) return key;
  const s3Key = extractS3Key(key);
  return s3Key ? `/image/${s3Key}` : null;
}

/**
 * Convierte la imagen original en su clave de miniatura.
 * Acepta URL completa o clave relativa.
 * "uploads/foo.jpg" → "thumbnails/foo.jpg"
 */
function getThumbnailKey(key) {
  if (!key || key.startsWith('/')) return key;
  const s3Key = extractS3Key(key);
  return s3Key ? s3Key.replace(/^uploads\//, 'thumbnails/') : null;
}

module.exports = { uploadImagen, getImageUrl, getThumbnailKey };
