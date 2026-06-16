// s3.js — integración con Amazon S3
// En Fase 1 (local) solo guarda en disco.
// En Fase 4 (nube) se activa S3 real cambiando USE_S3=true en la variable de entorno.
require('dotenv').config();
const path = require('path');
const fs   = require('fs');

const USE_S3 = process.env.USE_S3 === 'true';

let s3Client;
if (USE_S3) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
}

/**
 * Sube un archivo al almacenamiento.
 * - Localmente: copia a app/uploads/ y devuelve la ruta relativa.
 * - En nube (USE_S3=true): sube a s3://BUCKET/uploads/ y devuelve la URL pública.
 *
 * @param {Buffer} fileBuffer - contenido del archivo
 * @param {string} fileName   - nombre de archivo (sin ruta)
 * @param {string} mimeType   - tipo MIME (ej: 'image/jpeg')
 * @returns {Promise<string>} URL o ruta de la imagen guardada
 */
async function uploadImagen(fileBuffer, fileName, mimeType) {
  if (USE_S3) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const bucket = process.env.S3_BUCKET;
    const key    = `uploads/${fileName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        fileBuffer,
      ContentType: mimeType,
    }));
    // La URL pública funciona si el bucket tiene acceso público configurado
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  } else {
    // Guardar en disco local
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);
    return `/uploads/${fileName}`;
  }
}

module.exports = { uploadImagen };
