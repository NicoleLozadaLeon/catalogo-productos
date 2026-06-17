# Ficha Técnica — CatálogoCloud

**Proyecto:** Catálogo de Productos (ABM/CRUD)
**Materia:** ISW-341 — Computación en la Nube
**Ruta:** A — "Build & Modernize"
**Pilares:** Pilar 2 (Terraform / IaC) + Pilar 4 (Serverless / Lambda)
**Plataforma:** AWS Academy Learner Lab

---

## 1. Descripción funcional

Sistema ABM (Alta–Baja–Modificación) de gestión de productos. Permite:

- **Listar** productos en una grilla con miniatura, precio, stock y categoría.
- **Crear** un producto con nombre, descripción, precio, stock, categoría y foto.
- **Ver el detalle** de un producto (imagen original + miniatura generada automáticamente).
- **Editar** cualquier campo, incluyendo reemplazar la foto.
- **Eliminar** un producto.

La subida de una foto desencadena un flujo asíncrono: la imagen se guarda en S3,
un evento dispara una función Lambda que genera una miniatura 200×200 y la
guarda en una ubicación separada, sin bloquear la respuesta al usuario.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20 + Express 4 |
| Vistas | EJS (server-side rendering, sin frontend separado) |
| Base de datos | PostgreSQL 16.9 (Amazon RDS) |
| Almacenamiento de imágenes | Amazon S3 |
| Procesamiento de imágenes | AWS Lambda (Node.js 20) + Jimp (librería pura JS) |
| Contenedores | Docker (multi-stage build) |
| Infraestructura como código | Terraform (~> 5.0, provider AWS) |
| Gestión de secretos | AWS Systems Manager Parameter Store (SecureString) |
| Cómputo | Amazon EC2 t3.micro (Amazon Linux 2023) |

### Dependencias principales de la app (`app/package.json`)

- `express`, `ejs`, `method-override` — servidor web y vistas
- `pg` — cliente PostgreSQL con soporte SSL
- `multer` — manejo de subida de archivos (almacenamiento en memoria)
- `@aws-sdk/client-s3` — subida y lectura de objetos S3
- `dotenv` — variables de entorno en desarrollo local

### Dependencias de la Lambda (`lambda/package.json`)

- `jimp` (0.22.x) — procesamiento de imágenes en JavaScript puro, sin binarios
  nativos, ideal para el runtime de Lambda.
- `@aws-sdk/client-s3` — provisto por el runtime de Lambda (no se empaqueta).

---

## 3. Arquitectura de software

```
Navegador
   │  HTTP
   ▼
Express (server.js)
   ├── routes/productos.js   → CRUD, lógica de negocio
   ├── views/*.ejs            → renderizado server-side
   ├── db.js                  → pool de conexiones PostgreSQL (SSL en prod)
   ├── s3.js                  → upload a S3 + resolución de claves
   └── /image/* (proxy)       → sirve imágenes de S3 sin exponer URLs públicas
```

Es una **arquitectura monolítica modernizada**: un único proceso Express que
delega el procesamiento pesado (miniaturas) a una función serverless desacoplada
mediante eventos, en vez de hacerlo de forma síncrona en el request HTTP.

---

## 4. Modelo de datos

Tabla `productos` (creada automáticamente en el primer arranque, ver `db.js`):

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Identificador autoincremental |
| `nombre` | `VARCHAR(200) NOT NULL` | Nombre del producto |
| `descripcion` | `TEXT` | Descripción libre |
| `precio` | `NUMERIC(10,2) NOT NULL DEFAULT 0` | Precio unitario |
| `stock` | `INTEGER NOT NULL DEFAULT 0` | Unidades disponibles |
| `categoria` | `VARCHAR(100)` | Categoría libre |
| `imagen_url` | `TEXT` | Clave S3 de la imagen original (`uploads/archivo.ext`) o ruta local |
| `creado_en` | `TIMESTAMP WITH TIME ZONE DEFAULT NOW()` | Fecha de alta |

La miniatura **no se almacena en la base de datos**: su clave se deriva en
tiempo de ejecución (`uploads/x.jpg` → `thumbnails/x.jpg`), ya que la Lambda
la genera de forma predecible a partir del nombre del archivo original.

---

## 5. Flujo de subida de imagen y miniatura (Pilar 4)

1. El usuario sube una foto desde el formulario de alta/edición.
2. Express (`multer`, almacenamiento en memoria) recibe el archivo como buffer.
3. `s3.js` sube el buffer a `s3://bucket/uploads/<timestamp>-<random>.<ext>`.
4. El bucket S3 tiene configurada una **notificación de evento**
   (`s3:ObjectCreated:*` con `filter_prefix = "uploads/"`) que invoca la Lambda.
5. La Lambda descarga el original, genera una miniatura 200×200 con Jimp y la
   guarda en `s3://bucket/thumbnails/<mismo-nombre>`.
6. La app no espera esta operación: la próxima vez que se visita el producto,
   el proxy `/image/thumbnails/...` ya sirve la miniatura generada.

Esta es una integración **reactiva por eventos**, no una llamada HTTP síncrona
al servicio de procesamiento de imágenes.
