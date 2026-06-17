# ADR-003: Parameter Store para el manejo de secretos

## Estado
Aceptado

## Contexto

La aplicación necesita la contraseña de la base de datos PostgreSQL (RDS)
en tiempo de ejecución. Las alternativas evaluadas para entregar ese secreto
a la instancia EC2 fueron:

1. **Hornear la contraseña en la imagen Docker o en el código** — descartado
   de inmediato por violar la regla de cero credenciales en el repositorio.
2. **Pasarla como variable de entorno directamente en el `user_data` de
   Terraform** (enfoque usado en las primeras iteraciones del proyecto).
3. **AWS Secrets Manager.**
4. **AWS Systems Manager Parameter Store**, tipo `SecureString`.

## Decisión

Se usa **Parameter Store** (`SecureString`) para almacenar la contraseña de
la base de datos. La EC2 la recupera en tiempo de ejecución (dentro del
`user_data`) usando el rol `LabInstanceProfile`, y la pasa al contenedor
únicamente como variable de entorno en memoria del proceso Docker — nunca
se escribe en disco ni queda expuesta en el código de Terraform.

## Justificación

1. **Eliminar la contraseña del `user_data` en texto plano:** en la versión
   anterior, Terraform interpolaba `var.db_password` directamente dentro
   del script de arranque de la EC2. Ese script es visible para cualquiera
   con permisos de lectura sobre la instancia (consola EC2 → "User data"),
   lo que constituye una exposición innecesaria del secreto. Con Parameter
   Store, el `user_data` solo contiene el **nombre** del parámetro
   (`/catalogo/db_password`), no su valor.
2. **Costo:** Parameter Store en su tier estándar (`SecureString` con
   KMS por defecto, sin parámetros avanzados) **no tiene costo adicional**,
   a diferencia de Secrets Manager, que cobra por secreto almacenado y por
   cada 10.000 llamadas de API. Para un proyecto con presupuesto de $50,
   esto es relevante.
3. **Permisos disponibles en el Learner Lab:** `LabRole`/
   `LabInstanceProfile` ya cuentan con permisos para `ssm:GetParameter`
   sin necesidad de crear políticas IAM nuevas (lo cual, como se explica en
   ADR-002, no está permitido en el Learner Lab).
4. **Cifrado en reposo:** al ser `SecureString`, el valor se cifra con la
   clave KMS administrada por AWS (`alias/aws/ssm`) tanto en el estado de
   Terraform como en el servicio, sin configuración adicional.
5. **Trazabilidad de dónde vive el secreto:** la contraseña tiene un único
   punto de verdad (Parameter Store) en lugar de estar duplicada en
   variables de Terraform, `.tfvars` y el `user_data` de cada instancia.

## Flujo resultante

```
terraform.tfvars (local, gitignored)
        │  (solo en el primer aprovisionamiento)
        ▼
aws_ssm_parameter "db_password" (SecureString, cifrado con KMS)
        │  EC2 lee con: aws ssm get-parameter --with-decryption
        │  (usando LabInstanceProfile, sin credenciales propias)
        ▼
Variable de entorno DB_PASSWORD del contenedor Docker (solo en memoria)
```

## Consecuencias

- **Positivas:** ningún secreto queda expuesto en el código, en el estado
  visible de la consola EC2 ni en el historial de Git; el costo es nulo;
  no requiere permisos IAM adicionales a los del Learner Lab.
- **Negativas:** `terraform.tfvars` sigue conteniendo la contraseña en
  texto plano de forma local (necesario para que Terraform pueda crear el
  parámetro la primera vez). Esto se mitiga manteniendo ese archivo
  permanentemente en `.gitignore` y nunca commiteándolo.
- **Alternativa descartada — Secrets Manager:** se prefirió Parameter Store
  por ser gratuito y suficiente para este caso de uso; Secrets Manager
  aportaría rotación automática de credenciales, una capacidad que excede
  el alcance de este proyecto académico.
