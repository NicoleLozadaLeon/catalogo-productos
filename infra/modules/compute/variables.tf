variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
}

variable "subnet_id" {
  description = "ID de la subred donde se lanza la EC2"
  type        = string
}

variable "sg_id" {
  description = "ID del Security Group para la EC2"
  type        = string
}

variable "ec2_instance_type" {
  description = "Tipo de instancia EC2"
  type        = string
  default     = "t3.micro"
}

variable "db_host" {
  description = "Host de la RDS PostgreSQL"
  type        = string
}

variable "db_endpoint" {
  description = "Endpoint completo de la RDS (host:port)"
  type        = string
}

variable "db_name" {
  description = "Nombre de la base de datos"
  type        = string
}

variable "db_username" {
  description = "Usuario de la base de datos"
  type        = string
}

variable "db_password_ssm_param" {
  description = "Nombre del parámetro SSM (SecureString) con la contraseña de la BD. La EC2 lo lee en runtime, nunca se pasa la contraseña en texto plano."
  type        = string
}

variable "s3_bucket_name" {
  description = "Nombre del bucket S3 para uploads de imágenes"
  type        = string
}

variable "aws_region" {
  description = "Región AWS"
  type        = string
}

variable "github_repo_url" {
  description = "URL del repositorio GitHub a clonar en la EC2"
  type        = string
  default     = "https://github.com/NicoleLozadaLeon/catalogo-productos.git"
}
