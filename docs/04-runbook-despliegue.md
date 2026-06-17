# Runbook de Despliegue — CatálogoCloud

Pasos exactos para reproducir el despliegue completo desde cero en un AWS
Academy Learner Lab. Pensado para que el docente pueda seguirlo
literalmente durante la defensa.

---

## 0. Requisitos previos

- Cuenta de AWS Academy con un Learner Lab activo.
- Herramientas instaladas localmente: Node.js 20, Docker, Terraform ≥ 1.0,
  AWS CLI v2, Git.
- Repositorio clonado:
  ```bash
  git clone https://github.com/NicoleLozadaLeon/catalogo-productos.git
  cd catalogo-productos
  ```

---

## 1. Cargar credenciales del Learner Lab

1. AWS Academy → curso → **Learner Lab** → **Start Lab** (esperar círculo verde).
2. **AWS Details** → **AWS CLI** → copiar el bloque de credenciales.
3. Pegarlo en `~/.aws/credentials` (Windows: `C:\Users\<usuario>\.aws\credentials`):
   ```ini
   [default]
   aws_access_key_id=ASIA...
   aws_secret_access_key=...
   aws_session_token=...
   ```
4. Verificar:
   ```bash
   aws sts get-caller-identity
   ```
   Debe devolver un ARN con `assumed-role/...`. Si dice "expired token",
   repetir los pasos 1-3 (las credenciales expiran cada 4 horas).

---

## 2. Configurar variables sensibles de Terraform

Crear `infra/terraform.tfvars` (este archivo está en `.gitignore`, nunca se
sube a Git):

```hcl
aws_region   = "us-east-1"
project_name = "catalogo"
db_name      = "catalogo"
db_username  = "postgres"
db_password  = "<elegir-una-contraseña-segura>"
```

---

## 3. Instalar dependencias de la Lambda

```bash
cd lambda
npm install --omit=dev
cd ..
```

Esto genera `lambda/node_modules/` con Jimp, que Terraform empaqueta junto
con `lambda/index.js` en el ZIP de la función.

---

## 4. Aprovisionar la infraestructura con Terraform

```bash
cd infra
terraform init
terraform plan
terraform apply
```

Confirmar con `yes`. Esto crea, en orden de dependencias:

1. Red: VPC, 2 subredes públicas, Internet Gateway, tabla de rutas, Security Group.
2. `serverless`: bucket S3 (`uploads/`, `thumbnails/`), función Lambda, permiso
   de invocación y notificación de evento S3 → Lambda.
3. `database`: RDS PostgreSQL + parámetro SSM `SecureString` con la contraseña.
4. `compute`: instancia EC2 con `user_data` que instala Docker, AWS CLI,
   clona el repositorio, construye la imagen y arranca el contenedor leyendo
   la contraseña desde Parameter Store.

Al finalizar, Terraform imprime:

```
app_url        = "http://<IP-pública>:3000"
rds_endpoint   = "catalogo-db.xxxx.us-east-1.rds.amazonaws.com:5432"
s3_bucket_name = "catalogo-uploads-<account-id>"
lambda_arn     = "arn:aws:lambda:us-east-1:<account-id>:function:catalogo-thumbnail-generator"
```

---

## 5. Esperar el arranque automático

El `user_data` de la EC2 tarda entre **8 y 12 minutos** en completarse
(actualización de paquetes, instalación de Docker/AWS CLI, clonado del
repo, build de la imagen Docker). Se puede seguir el progreso conectándose
por SSH (ver paso 6) y corriendo:

```bash
tail -f /var/log/user-data.log
```

Buscar la línea final `=== Despliegue completado ===`.

---

## 6. Verificar el despliegue

1. Abrir `http://<IP-pública>:3000` en el navegador → debe verse el catálogo.
2. Crear un producto con una foto.
3. Abrir el detalle del producto → debe aparecer la imagen original y, unos
   segundos después (al refrescar), la **miniatura generada por la Lambda**.
4. Confirmar la ejecución de la Lambda: **AWS Console → Lambda →
   `catalogo-thumbnail-generator` → Monitor → View CloudWatch logs** → debe
   verse `Miniatura generada: thumbnails/...`.

### Acceso SSH para depuración (si es necesario)

```bash
# Descargar la clave: AWS Academy → AWS Details → Download PEM → labsuser.pem
ssh -i labsuser.pem ec2-user@<IP-pública>
docker ps
docker logs catalogo-app --tail 50
```

> En Learner Labs, **SSM Session Manager y EC2 Instance Connect suelen
> fallar** por restricciones de permisos. La vía confiable es SSH con la
> clave `labsuser.pem` (también llamada `vockey` en Terraform).

---

## 7. Actualizar la aplicación tras un cambio de código

Cuando se modifica código de la app (no infraestructura), no hace falta
`terraform apply`. Basta con:

```bash
ssh -i labsuser.pem ec2-user@<IP-pública>
cd /opt/catalogo && git pull
cd app && docker build --no-cache -t catalogo-app:latest .
docker stop catalogo-app && docker rm catalogo-app
docker run -d --name catalogo-app --restart unless-stopped -p 3000:3000 \
  -e NODE_ENV=production -e PORT=3000 \
  -e DB_HOST=<rds-endpoint-sin-puerto> -e DB_PORT=5432 \
  -e DB_NAME=catalogo -e DB_USER=postgres \
  -e "DB_PASSWORD=$(aws ssm get-parameter --name /catalogo/db_password --with-decryption --query Parameter.Value --output text --region us-east-1)" \
  -e USE_S3=true -e S3_BUCKET=<bucket-name> -e AWS_REGION=us-east-1 \
  -v /opt/catalogo/app/uploads:/app/uploads \
  catalogo-app:latest
```

> `--no-cache` evita que Docker reutilice una capa vieja de `npm ci` cuando
> cambia `package-lock.json`.

---

## 8. Apagar todo al finalizar la sesión (control de presupuesto)

```bash
cd infra
terraform destroy
```

Confirmar con `yes`. Esto elimina EC2, RDS, Lambda, S3 y el parámetro SSM.
El estado de Terraform (en el bucket `catalogo-tf-state-4489312`) persiste,
por lo que `terraform apply` en la próxima sesión recrea todo de forma
idéntica.

Finalmente, en AWS Academy: **Learner Lab → Stop Lab**.
