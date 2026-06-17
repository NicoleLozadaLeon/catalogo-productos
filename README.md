# CatálogoCloud — Proyecto ISW-341 Computación en la Nube

Sistema **ABM (Alta-Baja-Modificación)** de gestión de productos desplegado en AWS.

**Stack:** Node.js · Express · EJS · PostgreSQL · Docker · Terraform · AWS Lambda · S3

---

## Ejecución local rápida

### Opción A — Docker Compose (recomendado)

```bash
cd app
docker compose up --build
```
→ Abre http://localhost:3000

### Opción B — Node.js directo (necesita PostgreSQL local)

```bash
cd app
cp .env.example .env       # edita .env con tu contraseña real (nunca al repo)
npm install
npm run dev                # usa nodemon para hot-reload
```

---

## Estructura del proyecto

```
catalogo-productos/
├── .gitignore          # protege credenciales y estado de Terraform
├── app/                # aplicación Express (Fase 1-4)
│   ├── server.js       # entrada principal
│   ├── db.js           # conexión PostgreSQL (Pool)
│   ├── s3.js           # upload local o S3 (conmutable por USE_S3)
│   ├── routes/         # CRUD de productos
│   ├── views/          # plantillas EJS (server-rendered)
│   ├── public/         # CSS y assets estáticos
│   ├── Dockerfile      # multi-stage, imagen mínima sin secretos
│   └── docker-compose.yml
├── lambda/             # función serverless Pilar 4 (Fase 5)
└── infra/              # Terraform Pilar 2 (Fase 3)
```

---

## Checklist de fases

- [x] Fase 0 — Herramientas y credenciales AWS configuradas
- [x] Fase 1 — App ABM funcional en local
- [x] Fase 2 — Dockerizar (Dockerfile multi-stage)
- [x] Fase 3 — Infraestructura con Terraform (Pilar 2)
- [x] Fase 4 — Despliegue en EC2 + RDS
- [x] Fase 5 — Lambda generadora de miniaturas (Pilar 4)
- [x] Fase 6 — Secretos en Parameter Store
- [x] Fase 7 — Documentación (5 entregables)
- [x] Fase 8 — Costos documentados (preparación de la defensa en curso)

---

## Despliegue en AWS (Fase 3 + 4)

### Requisitos previos
- Credenciales del Learner Lab cargadas en `~/.aws/credentials` (expiran cada 4 h)
- Terraform instalado

### Pasos

```bash
# 1. Ir al directorio de infraestructura
cd infra

# 2. Inicializar (solo la primera vez o tras borrar .terraform/)
terraform init

# 3. Verificar el plan de cambios
terraform plan

# 4. Aplicar — esto crea/actualiza EC2, RDS, S3, Lambda
terraform apply

# 5. Al finalizar, Terraform muestra la IP pública:
#    app_url = "http://<IP>:3000"
#    Esperar ~5 minutos para que el user_data termine de instalar y arrancar la app.
```

### Verificar logs en la EC2

Si la app no responde, conectarse por SSH (si hay key pair) o revisar desde la consola AWS → EC2 → Actions → Monitor and troubleshoot → Get system log.

El log del user_data está en `/var/log/user-data.log`.

### Destruir la infraestructura (para ahorrar presupuesto)

```bash
cd infra
terraform destroy
```

---

## Regla del cero (recordatorio)

> ⚠️ Ninguna credencial en texto plano en el código ni en el historial de Git.
> Credenciales prohibidas: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, contraseñas de BD.
