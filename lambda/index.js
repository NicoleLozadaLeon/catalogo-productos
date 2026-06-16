// Lambda: generador de miniaturas — Pilar 4 (ISW-341)
// Trigger: s3:ObjectCreated en el prefijo uploads/
// Acción:  genera miniatura 200×200 con Jimp y la guarda en thumbnails/
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const Jimp = require('jimp');

const s3     = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.BUCKET_NAME;

exports.handler = async (event) => {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    if (!key.startsWith('uploads/')) {
      console.log(`Ignorando: ${key}`);
      continue;
    }

    const filename = key.slice('uploads/'.length);
    const thumbKey = `thumbnails/${filename}`;
    console.log(`Procesando: ${key} → ${thumbKey}`);

    // Descargar imagen original desde S3
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of Body) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // Generar miniatura 200×200 con Jimp (puro JS, sin binarios nativos)
    const image = await Jimp.read(buffer);
    const thumb = await image
      .cover(200, 200)
      .quality(80)
      .getBufferAsync(Jimp.MIME_JPEG);

    // Subir miniatura a thumbnails/
    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         thumbKey,
      Body:        thumb,
      ContentType: 'image/jpeg',
    }));

    console.log(`Miniatura generada: ${thumbKey}`);
  }
};
