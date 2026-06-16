# ============================================================
# Módulo Serverless: S3 bucket + Lambda (Pilar 4 — Fase 5)
# El bucket se crea aquí; el código Lambda se completa en Fase 5
# ============================================================

# Bucket S3 para uploads y thumbnails
resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.project_name}-uploads-${data.aws_caller_identity.current.account_id}"
  force_destroy = true  # permite destruir aunque tenga objetos

  tags = {
    Name    = "${var.project_name}-uploads"
    Project = var.project_name
  }
}

# Bloquear acceso público al bucket (las URLs se generan con pre-signed URLs)
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS para que la app pueda subir directamente desde el browser
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# Obtener el account ID actual (para nombrar el bucket de forma única)
data "aws_caller_identity" "current" {}

# Obtener el ARN del LabRole (no podemos crear roles propios en Learner Lab)
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

# Función Lambda placeholder — el código real se añade en Fase 5
# Por ahora usa un zip mínimo para que terraform apply no falle
data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/lambda_placeholder.zip"

  source {
    content  = "exports.handler = async (event) => { console.log('Lambda placeholder - se reemplaza en Fase 5'); };"
    filename = "index.js"
  }
}

resource "aws_lambda_function" "thumbnail" {
  function_name    = "${var.project_name}-thumbnail-generator"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.uploads.bucket
    }
  }

  tags = {
    Name    = "${var.project_name}-thumbnail-generator"
    Project = var.project_name
  }
}

# Permiso para que S3 invoque la Lambda
resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.thumbnail.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.uploads.arn
}

# Trigger: cuando se sube un objeto con prefijo "uploads/" → invoca la Lambda
resource "aws_s3_bucket_notification" "uploads_trigger" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }

  depends_on = [aws_lambda_permission.allow_s3]
}
