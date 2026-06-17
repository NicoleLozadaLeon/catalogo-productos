# Arquitectura de Red y Nube — CatálogoCloud

## 1. Diagrama de arquitectura

```
                              Internet
                                 │
                                 │ HTTP :3000 / SSH :22
                                 ▼
                        ┌─────────────────┐
                        │ Internet Gateway │
                        └────────┬─────────┘
                                 │
   VPC catalogo-vpc (10.0.0.0/16) — us-east-1
   ┌─────────────────────────────┼───────────────────────────────────┐
   │                              ▼                                   │
   │  Route Table pública  ──────────────────                         │
   │                                                                  │
   │  ┌────────────────────────────┐   ┌──────────────────────────┐ │
   │  │ Subred pública A            │   │ Subred pública B          │ │
   │  │ 10.0.1.0/24 — us-east-1a    │   │ 10.0.2.0/24 — us-east-1b  │ │
   │  │                              │   │ (solo para RDS subnet     │ │
   │  │  ┌────────────────────────┐ │   │  group, RDS exige ≥2 AZ)  │ │
   │  │  │ EC2 t3.micro            │ │   └──────────────────────────┘ │
   │  │  │ catalogo-ec2-app        │ │                                │
   │  │  │ Amazon Linux 2023        │ │                                │
   │  │  │ Docker → app Express    │ │                                │
   │  │  │ IAM: LabInstanceProfile  │ │                                │
   │  │  └──────────┬───────────────┘ │                                │
   │  └─────────────┼─────────────────┘                                │
   │                │ :5432 (SG interno, solo VPC)                     │
   │                ▼                                                  │
   │  ┌────────────────────────────────────┐                          │
   │  │ RDS PostgreSQL 16.9 (db.t3.micro)   │                          │
   │  │ catalogo-db — no accesible público  │                          │
   │  │ db_subnet_group: subred A + B       │                          │
   │  └──────────────────────────────────────┘                        │
   │                                                                   │
   │  Security Group catalogo-sg-app:                                  │
   │   • 22/tcp   ← 0.0.0.0/0   (SSH / EC2 Instance Connect)           │
   │   • 3000/tcp ← 0.0.0.0/0   (app web)                              │
   │   • 5432/tcp ← 10.0.0.0/16 (solo tráfico interno VPC)             │
   │   • egress: todo permitido                                        │
   └───────────────────────────────────────────────────────────────────┘

   Fuera de la VPC (servicios administrados / serverless):

   ┌───────────────────────────┐        evento         ┌───────────────────┐
   │ S3 bucket                  │  s3:ObjectCreated    │ Lambda             │
   │ catalogo-uploads-<acct>    │ ──────────────────►  │ catalogo-thumbnail-│
   │  /uploads/    (original)   │  prefix=uploads/      │ generator          │
   │  /thumbnails/ (miniatura)  │ ◄────────────────────│ Node.js 20 + Jimp  │
   │  privado, sin acceso       │   PutObject thumb/    │ role: LabRole      │
   │  público (block public     │                       │ memoria: 256 MB    │
   │  access = true)             │                       │ timeout: 30s       │
   └───────────────────────────┘                        └───────────────────┘

   ┌───────────────────────────────────────────┐
   │ AWS Systems Manager Parameter Store         │
   │ /catalogo/db_password (SecureString)        │
   │ leído por la EC2 vía LabInstanceProfile     │
   └───────────────────────────────────────────┘

   ┌───────────────────────────────────────────┐
   │ S3 (estado remoto de Terraform)             │
   │ catalogo-tf-state-4489312                   │
   │ key: catalogo/terraform.tfstate             │
   └───────────────────────────────────────────┘
```

---

## 2. Direccionamiento (CIDR)

| Recurso | CIDR / Rango |
|---|---|
| VPC `catalogo-vpc` | `10.0.0.0/16` |
| Subred pública A (us-east-1a) — EC2 | `10.0.1.0/24` |
| Subred pública B (us-east-1b) — solo RDS subnet group | `10.0.2.0/24` |
| Tráfico permitido a PostgreSQL (puerto 5432) | `10.0.0.0/16` (solo intra-VPC) |
| Tráfico permitido a la app (puerto 3000) y SSH (22) | `0.0.0.0/0` |

**Nota de diseño:** RDS exige que el *DB Subnet Group* cubra al menos dos
zonas de disponibilidad, aunque la instancia EC2 use una sola. Por eso existen
dos subredes públicas en lugar de una.

---

## 3. Flujos de datos

1. **Usuario → App:** HTTP sobre el puerto 3000 hacia la IP pública de la EC2.
2. **App → RDS:** conexión PostgreSQL cifrada (SSL) sobre el puerto 5432,
   restringida al rango interno de la VPC (no accesible desde Internet).
3. **App → S3:** subida de imágenes originales (`PutObject`) y lectura para
   servirlas a través del proxy `/image/*` (`GetObject`), usando las
   credenciales temporales del `LabInstanceProfile`.
4. **S3 → Lambda:** notificación de evento nativa (`s3:ObjectCreated:*`)
   cuando se crea un objeto con prefijo `uploads/`. No hay llamada HTTP ni
   colas intermedias — es integración nativa de AWS.
5. **Lambda → S3:** la función lee el original (`GetObject`) y escribe la
   miniatura (`PutObject`) en `thumbnails/`, usando el rol `LabRole`.
6. **App → Parameter Store:** en el arranque de la EC2 (`user_data`), se lee
   la contraseña de la BD vía `aws ssm get-parameter --with-decryption`,
   usando el `LabInstanceProfile`. El valor nunca se escribe en disco ni en
   el código — solo vive en la variable de entorno del contenedor en memoria.

---

## 4. Aislamiento y seguridad de red

- La RDS **no es accesible públicamente** (`publicly_accessible = false`) y
  solo acepta conexiones desde dentro de la VPC.
- El bucket S3 bloquea **todo acceso público** (ACLs y políticas públicas
  deshabilitadas); las imágenes se sirven a través de un proxy autenticado
  en la propia app, no mediante URLs públicas de S3.
- El Security Group sigue el principio de exposición mínima: solo abre los
  puertos estrictamente necesarios para el funcionamiento y la
  administración (22, 3000) y restringe la BD al tráfico interno.
